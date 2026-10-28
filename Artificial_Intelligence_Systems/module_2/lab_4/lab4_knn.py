"""ЛР 4. Собственный k-NN на Wine. Запуск: python lab4_knn.py.

NumPy/Pandas - данные и вычисления, Matplotlib - только визуализация.
Данные по умолчанию локальные, пути считаются от расположения скрипта.
"""
from pathlib import Path
import argparse
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from common import (TabularPreprocessor, classification_metrics, confusion_matrix,
                    draw_confusion, provenance, save_json, stratified_split)

ROOT = Path(__file__).resolve().parent
FEATURES = ["alcohol", "malic_acid", "ash", "alcalinity_of_ash", "magnesium",
            "total_phenols", "flavanoids", "nonflavanoid_phenols", "proanthocyanins",
            "color_intensity", "hue", "od280_od315", "proline"]
# Заданы до просмотра метрик. Число одинаковое для честного сравнения наборов.
FIXED_FEATURES = ["alcohol", "malic_acid", "flavanoids", "color_intensity", "proline"]
K_VALUES = (1, 3, 5, 10, 15)


class KNNClassifier:
    """Равновесное голосование k ближайших по L1/L2 расстоянию.

    При равенстве расстояний сохраняется порядок train; при равенстве голосов
    выбирается меньшая метка. Это фиксированная, воспроизводимая политика.
    """
    def __init__(self, k=5, metric="euclidean"):
        if isinstance(k, bool) or not isinstance(k, (int, np.integer)) or k < 1:
            raise ValueError("k должно быть положительным целым")
        if metric not in ("euclidean", "manhattan"):
            raise ValueError("Допустимы euclidean и manhattan")
        self.k, self.metric = int(k), metric

    def fit(self, X, y):
        X, y = np.asarray(X, dtype=float), np.asarray(y)
        if X.ndim != 2 or X.shape[1] == 0 or y.ndim != 1 or len(X) != len(y):
            raise ValueError("Некорректные размеры X/y")
        if not np.isfinite(X).all() or self.k > len(X):
            raise ValueError("Нужны конечные данные и k <= число train")
        self.X, self.y = X.copy(), y.copy()
        self.labels = np.unique(y)
        return self

    def predict(self, X):
        if not hasattr(self, "X"):
            raise ValueError("Сначала вызовите fit")
        X = np.asarray(X, dtype=float)
        if X.ndim != 2 or X.shape[1] != self.X.shape[1] or not np.isfinite(X).all():
            raise ValueError("Некорректная матрица запросов")
        predictions = []
        for query in X:
            delta = self.X - query
            # Для сортировки по L2 квадратный корень не нужен: порядок тот же.
            distances = (np.sum(delta * delta, axis=1) if self.metric == "euclidean"
                         else np.sum(np.abs(delta), axis=1))
            nearest = np.argsort(distances, kind="stable")[:self.k]
            votes = [int(np.sum(self.y[nearest] == label)) for label in self.labels]
            predictions.append(self.labels[int(np.argmax(votes))])
        return np.asarray(predictions, dtype=self.y.dtype)


def load_data(path):
    df = pd.read_csv(path, header=None, names=["class"] + FEATURES)
    if df.shape[1] != 14 or df.empty or df["class"].isna().any():
        raise ValueError("Ожидается Wine: класс и 13 признаков")
    if not set(df["class"]).issubset({1, 2, 3}):
        raise ValueError("Классы Wine должны быть 1/2/3")
    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="raise")
    return df


def plot_statistics(df, figures):
    fig, axes = plt.subplots(4, 4, figsize=(13, 11))
    for ax, col in zip(axes.flat, FEATURES):
        ax.hist(df[col], bins=15, color="#376b9b", edgecolor="white")
        ax.set_title(col, fontsize=9)
    for ax in list(axes.flat)[len(FEATURES):]:
        ax.axis("off")
    fig.suptitle("Wine: распределения 13 признаков")
    fig.tight_layout()
    fig.savefig(figures / "01_histograms.png", dpi=150)
    plt.close(fig)

    fig, axes = plt.subplots(4, 4, figsize=(13, 10))
    stats = df[FEATURES].describe().T
    for ax, col in zip(axes.flat, FEATURES):
        row = stats.loc[col]
        ax.errorbar(0, row["mean"], yerr=row["std"], fmt="o", capsize=5)
        ax.plot([-.18, .18], [row["min"], row["max"]], "x", color="#b05c40")
        ax.set_xticks([])
        ax.set_title(col, fontsize=9)
        ax.grid(axis="y", alpha=.2)
    for ax in list(axes.flat)[len(FEATURES):]:
        ax.axis("off")
    fig.suptitle("Среднее ± std; крестики - min/max (отдельные шкалы)")
    fig.tight_layout()
    fig.savefig(figures / "02_mean_std.png", dpi=150)
    plt.close(fig)

    fig = plt.figure(figsize=(8, 6))
    ax = fig.add_subplot(111, projection="3d")
    for label, color in zip((1, 2, 3), ("#376b9b", "#c0733d", "#4e8157")):
        part = df[df["class"] == label]
        ax.scatter(part.alcohol, part.flavanoids, part.proline,
                   label=f"Класс {label}", color=color, alpha=.8, s=24)
    ax.set_xlabel("alcohol")
    ax.set_ylabel("flavanoids")
    ax.set_zlabel("proline")
    ax.set_title("Три исходных признака, цвет - класс")
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(figures / "03_features_3d.png", dpi=150)
    plt.close(fig)


def run(data_path=ROOT / "data/wine.data", output_dir=ROOT / "results", seed=42):
    output = Path(output_dir)
    figures = output / "figures"
    figures.mkdir(parents=True, exist_ok=True)
    df = load_data(data_path)
    y = df["class"].to_numpy(dtype=int)
    train_idx, test_idx = stratified_split(y, seed=seed)
    random_features = list(map(str, np.random.default_rng(seed).choice(FEATURES, 5, replace=False)))
    sets = {"random": random_features, "fixed": FIXED_FEATURES}
    df[FEATURES].describe(percentiles=[.25, .5, .75]).T.to_csv(output / "statistics.csv")
    df["class"].value_counts().sort_index().to_csv(output / "class_counts.csv")
    plot_statistics(df, figures)
    rows, predictions, matrices, preprocessing = [], [], {}, {}
    # Полный факторный эксперимент: набор x расстояние x масштабирование x k.
    for name, features in sets.items():
        for scale in (True, False):
            prep = TabularPreprocessor(scale=scale).fit(df.iloc[train_idx][features])
            Xtr = prep.transform(df.iloc[train_idx][features])
            Xte = prep.transform(df.iloc[test_idx][features])
            preprocessing[f"{name}_{scale}"] = {
                "features": features, "mean": prep.mean.tolist(),
                "std": prep.std.tolist(), "medians": prep.medians}
            for metric in ("euclidean", "manhattan"):
                for k in K_VALUES:
                    model = KNNClassifier(k, metric).fit(Xtr, y[train_idx])
                    pred = model.predict(Xte)
                    key = f"{name}_{metric}_{'scaled' if scale else 'raw'}_k{k}"
                    score = classification_metrics(y[test_idx], pred, (1, 2, 3))
                    rows.append({"model": name, "metric": metric, "scaled": scale,
                                 "k": k, **score})
                    matrix = confusion_matrix(y[test_idx], pred, (1, 2, 3))
                    matrices[key] = matrix
                    pd.DataFrame(matrix, index=[1, 2, 3], columns=[1, 2, 3]).to_csv(output / f"cm_{key}.csv")
                    predictions.extend({"experiment": key, "row_id": int(i),
                                        "actual": int(a), "predicted": int(p)}
                                       for i, a, p in zip(test_idx, y[test_idx], pred))
    summary = pd.DataFrame(rows)
    summary.to_csv(output / "models_summary.csv", index=False)
    pd.DataFrame(predictions).to_csv(output / "predictions.csv", index=False)
    manifest = {**provenance(data_path), "seed_split": seed, "seed_features": seed,
                "n_rows": len(df), "train_size": len(train_idx), "test_size": len(test_idx),
                "train_indices": train_idx.tolist(), "test_indices": test_idx.tolist(),
                "feature_sets": sets, "k_values": list(K_VALUES),
                "missing_values": int(df.isna().sum().sum()),
                "categorical_features": [], "preprocessing": preprocessing,
                "policy": "Все комбинации заданы заранее; тест - сравнение, не подбор для эксплуатации"}
    save_json(output / "experiment.json", manifest)

    fig, axes = plt.subplots(1, 2, figsize=(11, 4), sharey=True)
    for ax, name in zip(axes, sets):
        for metric in ("euclidean", "manhattan"):
            for scale in (True, False):
                part = summary[(summary.model == name) & (summary.metric == metric) & (summary.scaled == scale)]
                ax.plot(part.k, part.accuracy, marker="o",
                        linestyle="-" if scale else "--",
                        label=f"{metric}, {'z-score' if scale else 'без масштаба'}")
        ax.set_title(f"Набор: {name}")
        ax.set_xlabel("k")
        ax.set_ylim(0, 1.03)
        ax.set_xticks(K_VALUES)
        ax.grid(alpha=.2)
        ax.legend(fontsize=8)
    axes[0].set_ylabel("Accuracy на тесте")
    fig.tight_layout()
    fig.savefig(figures / "04_accuracy_k.png", dpi=150)
    plt.close(fig)
    fig, axes = plt.subplots(2, len(K_VALUES), figsize=(15, 6))
    for row, name in enumerate(sets):
        for col, k in enumerate(K_VALUES):
            key = f"{name}_euclidean_scaled_k{k}"
            draw_confusion(axes[row, col], matrices[key], [1, 2, 3], f"{name}, k={k}")
    fig.suptitle("Матрицы ошибок: z-score, евклидово расстояние")
    fig.tight_layout()
    fig.savefig(figures / "05_confusion_matrices.png", dpi=150)
    plt.close(fig)
    print("Наборы признаков:", sets)
    print(f"train={len(train_idx)}, test={len(test_idx)}; seed={seed}")
    print(summary.to_string(index=False, float_format=lambda x: f"{x:.4f}"))
    return summary, manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "data/wine.data")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "results")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    try:
        run(args.data, args.output_dir, args.seed)
    except (ValueError, OSError) as exc:
        parser.exit(2, f"Ошибка: {exc}\n")
