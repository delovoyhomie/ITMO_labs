"""Общие операции. Алгоритмы и метрики реализованы без sklearn/scipy.

Матрица ошибок: строки - истинные классы, столбцы - предсказанные.
"""
from pathlib import Path
import hashlib
import json
import math
import platform

import numpy as np
import pandas as pd


def stratified_split(y, test_size=0.2, seed=42):
    """Разделить индексы по классам; приблизительно сохранить их доли."""
    y = np.asarray(y)
    if y.ndim != 1 or not 0 < test_size < 1 or len(y) < 4:
        raise ValueError("Нужен вектор меток и 0 < test_size < 1")
    rng = np.random.default_rng(seed)
    train, test = [], []
    for label in np.unique(y):
        indices = np.flatnonzero(y == label)
        if len(indices) < 2:
            raise ValueError("В каждом классе должно быть хотя бы два объекта")
        rng.shuffle(indices)
        count = min(len(indices) - 1, max(1, round(len(indices) * test_size)))
        test.extend(indices[:count])
        train.extend(indices[count:])
    rng.shuffle(train)
    rng.shuffle(test)
    return np.array(train, dtype=int), np.array(test, dtype=int)


def confusion_matrix(y_true, y_pred, labels):
    """Подсчёт целых чисел обычными циклами, без готовых метрик."""
    actual, predicted, labels = list(y_true), list(y_pred), list(labels)
    if not actual or len(actual) != len(predicted) or len(set(labels)) != len(labels):
        raise ValueError("Некорректные метки или размеры")
    mapping = {value: i for i, value in enumerate(labels)}
    matrix = [[0 for _ in labels] for _ in labels]
    for true, pred in zip(actual, predicted):
        if true not in mapping or pred not in mapping:
            raise ValueError("Неизвестная метка класса")
        matrix[mapping[true]][mapping[pred]] += 1
    return matrix


def classification_metrics(y_true, y_pred, labels, positive=None):
    """Accuracy, precision, recall, F1; нулевой знаменатель даёт 0.

    Для нескольких классов возвращаются macro-средние. При positive
    precision/recall/F1 относятся только к указанному положительному классу.
    """
    labels = list(labels)
    matrix = confusion_matrix(y_true, y_pred, labels)
    total = sum(sum(row) for row in matrix)
    scores = []
    for i, label in enumerate(labels):
        tp = matrix[i][i]
        fp = sum(row[i] for row in matrix) - tp
        fn = sum(matrix[i]) - tp
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        if positive is None or label == positive:
            scores.append((precision, recall, f1))
    if not scores:
        raise ValueError("Положительный класс отсутствует в labels")
    return {"accuracy": sum(matrix[i][i] for i in range(len(labels))) / total,
            "precision": sum(s[0] for s in scores) / len(scores),
            "recall": sum(s[1] for s in scores) / len(scores),
            "f1": sum(s[2] for s in scores) / len(scores)}


def binary_curves(y_true, scores):
    """ROC и PR по всем уникальным порогам. Равные оценки идут одной группой.

    Вычисления - стандартный Python, без библиотек метрик/интегрирования.
    AUC-PR определена трапецеидальным интегралом, не average precision.
    """
    actual, scores = list(y_true), list(scores)
    if not actual or len(actual) != len(scores):
        raise ValueError("Некорректные размеры")
    if any(y not in (0, 1) for y in actual) or any(not math.isfinite(float(s)) for s in scores):
        raise ValueError("Нужны метки 0/1 и конечные оценки")
    positives = sum(actual)
    negatives = len(actual) - positives
    if not positives or not negatives:
        raise ValueError("Для ROC/PR нужны оба класса")
    pairs = sorted(zip(scores, actual), key=lambda item: item[0], reverse=True)
    # При пороге выше максимума нет положительных прогнозов: precision := 1.
    rows = [{"threshold": None, "fpr": 0.0, "tpr": 0.0,
             "recall": 0.0, "precision": 1.0}]
    tp = fp = i = 0
    while i < len(pairs):
        threshold = pairs[i][0]
        while i < len(pairs) and pairs[i][0] == threshold:
            tp += int(pairs[i][1] == 1)
            fp += int(pairs[i][1] == 0)
            i += 1
        rows.append({"threshold": float(threshold), "fpr": fp / negatives,
                     "tpr": tp / positives, "recall": tp / positives,
                     "precision": tp / (tp + fp)})
    def area(x, y):
        return sum((b[x] - a[x]) * (a[y] + b[y]) / 2
                   for a, b in zip(rows, rows[1:]))
    return rows, area("fpr", "tpr"), area("recall", "precision")


class TabularPreprocessor:
    """Медианы и one-hot категории обучаются только на train.

    Числовые признаки стандартизируются по train (std с ddof=0).
    Неизвестные категории кодируются нулевым блоком; это явно проверено тестом.
    """
    def __init__(self, scale=True):
        self.scale = scale

    def fit(self, frame):
        if len(frame) == 0 or len(frame.columns) == 0:
            raise ValueError("Пустая обучающая таблица")
        self.columns = list(frame.columns)
        self.numeric = list(frame.select_dtypes(include=[np.number]).columns)
        self.medians, self.categories = {}, {}
        self.output_names = []
        for col in self.columns:
            if col in self.numeric:
                values = pd.to_numeric(frame[col]).replace([np.inf, -np.inf], np.nan)
                if not values.notna().any():
                    raise ValueError(f"В train полностью пустой столбец {col}")
                median = values.median()
                self.medians[col] = float(median)
                self.output_names.append(col)
            else:
                values = frame[col].fillna("__MISSING__").astype(str)
                self.categories[col] = sorted(values.unique())
                self.output_names.extend(f"{col}={v}" for v in self.categories[col])
        raw = self._encode(frame)
        self.mean = raw.mean(axis=0) if self.scale else np.zeros(raw.shape[1])
        self.std = raw.std(axis=0) if self.scale else np.ones(raw.shape[1])
        self.std[self.std == 0] = 1.0
        return self

    def _encode(self, frame):
        blocks = []
        for col in self.columns:
            if col in self.numeric:
                values = pd.to_numeric(frame[col]).replace([np.inf, -np.inf], np.nan)
                blocks.append(values.fillna(self.medians[col]).to_numpy(dtype=float))
            else:
                values = frame[col].fillna("__MISSING__").astype(str)
                blocks.extend((values == value).to_numpy(dtype=float)
                              for value in self.categories[col])
        return np.column_stack(blocks)

    def transform(self, frame):
        if not hasattr(self, "mean"):
            raise ValueError("Сначала вызовите fit")
        if list(frame.columns) != self.columns:
            raise ValueError("Порядок и состав столбцов должны совпадать с train")
        return (self._encode(frame) - self.mean) / self.std


def save_json(path, obj):
    Path(path).write_text(json.dumps(obj, ensure_ascii=False, indent=2,
                                    allow_nan=False), encoding="utf-8")


def provenance(path):
    return {"data_file": Path(path).name,
            "sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest(),
            "python": platform.python_version(), "numpy": np.__version__,
            "pandas": pd.__version__}


def draw_confusion(ax, matrix, labels, title):
    """Только отображение уже рассчитанной вручную матрицы."""
    matrix = np.array(matrix)
    ax.imshow(matrix, cmap="Blues", vmin=0)
    for (i, j), value in np.ndenumerate(matrix):
        ax.text(j, i, str(value), ha="center", va="center",
                color="white" if value > matrix.max() / 2 else "black")
    ax.set_xticks(range(len(labels)), labels)
    ax.set_yticks(range(len(labels)), labels)
    ax.set_xlabel("Прогноз")
    ax.set_ylabel("Факт")
    ax.set_title(title)
