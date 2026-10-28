"""ЛР 5. Небинарное категориальное дерево на Mushroom.

Узлы - dataclass, дочерние ветви - словарь, не список списков.
Алгоритм ID3: максимум прироста информации по энтропии.
Положительный класс 1 = poisonous (ядовитый), 0 = edible (съедобный).
"""
from dataclasses import dataclass, field
from pathlib import Path
import argparse
import math
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from common import (binary_curves, classification_metrics, confusion_matrix,
                    draw_confusion, provenance, save_json, stratified_split)

ROOT = Path(__file__).resolve().parent
FEATURES = ["cap_shape", "cap_surface", "cap_color", "bruises", "odor",
            "gill_attachment", "gill_spacing", "gill_size", "gill_color",
            "stalk_shape", "stalk_root", "stalk_surface_above_ring",
            "stalk_surface_below_ring", "stalk_color_above_ring",
            "stalk_color_below_ring", "veil_type", "veil_color", "ring_number",
            "ring_type", "spore_print_color", "population", "habitat"]


def entropy(labels):
    """Бинарная энтропия в битах, 0*log2(0) считается равным нулю."""
    labels = list(labels)
    if not labels:
        return 0.0
    p = sum(labels) / len(labels)
    return -sum(q * math.log2(q) for q in (p, 1 - p) if q > 0)


@dataclass
class Node:
    n_samples: int
    probability: float  # Доля poisonous в обучающих примерах данного узла.
    feature: str | None = None
    gain: float = 0.0
    children: dict[str, "Node"] = field(default_factory=dict)

    def to_dict(self):
        return {"n_samples": self.n_samples, "probability_poisonous": self.probability,
                "feature": self.feature, "information_gain": self.gain,
                "children": {value: child.to_dict() for value, child in self.children.items()}}


def prepare_categories(frame):
    """'?' - пропуск, отдельная ветвь __MISSING__; статистики test не нужны.

    Категории остаются строками: искусственный числовой порядок не вводится.
    """
    return frame.where(frame.notna() & frame.ne("?"), "__MISSING__").astype(str)


class MultiwayDecisionTree:
    """Небинарный ID3. Неизвестное значение -> вероятность текущего узла.

    Ограничения глубины и размера узла - предварительная регуляризация.
    Классификация по p>=0.5; при равенстве выбирается poisonous.
    """
    def __init__(self, max_depth=4, min_samples_split=2, min_gain=1e-12):
        if not isinstance(max_depth, int) or max_depth < 0 or min_samples_split < 2 or min_gain < 0:
            raise ValueError("Некорректные ограничения дерева")
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_gain = min_gain

    def fit(self, X, y):
        if not isinstance(X, pd.DataFrame) or X.empty or not X.columns.is_unique:
            raise ValueError("Нужна непустая таблица с уникальными признаками")
        y = np.asarray(y)
        if y.ndim != 1 or len(X) != len(y) or not set(y).issubset({0, 1}):
            raise ValueError("Нужен вектор меток 0/1 той же длины")
        self.features = list(X.columns)
        self.root = self._build(prepare_categories(X).reset_index(drop=True), y.astype(int), self.features, 0)
        return self

    def _build(self, X, y, remaining, depth):
        node = Node(len(y), float(sum(y) / len(y)))
        if (node.probability in (0.0, 1.0) or not remaining
                or depth >= self.max_depth or len(y) < self.min_samples_split):
            return node
        base = entropy(y)
        best_gain, best_feature = self.min_gain, None
        for feature in remaining:
            conditional = 0.0
            values = X[feature].to_numpy()
            for value in sorted(set(values)):
                mask = values == value
                conditional += int(sum(mask)) / len(y) * entropy(y[mask])
            gain = base - conditional
            # При равных gain сохраняется порядок выбранных признаков.
            if gain > best_gain:
                best_gain, best_feature = gain, feature
        if best_feature is None:
            return node
        node.feature, node.gain = best_feature, best_gain
        values = X[best_feature].to_numpy()
        rest = [feature for feature in remaining if feature != best_feature]
        for value in sorted(set(values)):
            mask = values == value
            node.children[value] = self._build(X.loc[mask], y[mask], rest, depth + 1)
        return node

    def predict_proba(self, X):
        if not hasattr(self, "root"):
            raise ValueError("Сначала вызовите fit")
        if list(X.columns) != self.features:
            raise ValueError("Признаки и их порядок должны совпадать с train")
        scores = []
        for row in prepare_categories(X).to_dict("records"):
            node = self.root
            while node.feature is not None:
                child = node.children.get(row[node.feature])
                if child is None:
                    break
                node = child
            scores.append(node.probability)
        return np.array(scores)

    def predict(self, X):
        return (self.predict_proba(X) >= .5).astype(int)


def tree_stats(node):
    if not node.children:
        return {"nodes": 1, "leaves": 1, "depth": 0, "max_children": 0}
    parts = [tree_stats(child) for child in node.children.values()]
    return {"nodes": 1 + sum(p["nodes"] for p in parts),
            "leaves": sum(p["leaves"] for p in parts),
            "depth": 1 + max(p["depth"] for p in parts),
            "max_children": max(len(node.children), *(p["max_children"] for p in parts))}


def rules_text(node, prefix="ROOT"):
    lines = [f"{prefix}: n={node.n_samples}, P(poisonous)={node.probability:.5f}"
             + (f", split={node.feature}, gain={node.gain:.6f}" if node.feature else ", LEAF")]
    for value, child in node.children.items():
        lines.extend(rules_text(child, prefix + f" / {node.feature}={value}"))
    return lines


def plot_tree(root, path):
    """Читаемый обзор корня и первого уровня; полное дерево - JSON/TXT."""
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.axis("off")
    ax.text(.5, .88, f"{root.feature or 'LEAF'}\nn={root.n_samples}; P(p)={root.probability:.3f}",
            ha="center", va="center", bbox=dict(boxstyle="round", fc="#dce8f1"), fontsize=11)
    count = len(root.children)
    for i, (value, child) in enumerate(root.children.items()):
        x = (i + .5) / count
        ax.annotate("", xy=(x, .39), xytext=(.5, .79), arrowprops=dict(arrowstyle="->", color="gray"))
        ax.text((x + .5) / 2, .60, value, ha="center", fontsize=10,
                bbox=dict(fc="white", ec="none", pad=1))
        ax.text(x, .25, f"{child.feature or 'LEAF'}\nn={child.n_samples}\nP(p)={child.probability:.3f}",
                ha="center", va="center", fontsize=8,
                bbox=dict(boxstyle="round", fc="#edf2ed"))
    ax.set_title("Небинарное дерево: корень и первый уровень\nПолная структура: tree.json и tree_rules.txt")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def run(data_path=ROOT / "data/agaricus-lepiota.data", output_dir=ROOT / "results", seed=42):
    output = Path(output_dir)
    figures = output / "figures"
    figures.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(data_path, header=None, names=["class"] + FEATURES, dtype=str)
    if df.empty or df.isna().any().any() or not set(df["class"]).issubset({"e", "p"}):
        raise ValueError("Ожидается Mushroom: e/p и 22 категориальных признака")
    y = (df["class"] == "p").to_numpy(dtype=int)
    count = math.isqrt(len(FEATURES))  # floor(sqrt(22)) = 4, явно зафиксировано.
    selected = list(map(str, np.random.default_rng(seed).choice(FEATURES, count, replace=False)))
    X = prepare_categories(df[selected])
    train_idx, test_idx = stratified_split(y, seed=seed)
    inner_train, inner_valid = stratified_split(y[train_idx], .25, seed + 1)
    fit_idx, valid_idx = train_idx[inner_train], train_idx[inner_valid]
    validation = []
    # Глубина выбирается на validation; тест при выборе не используется.
    for depth in (1, 2, 4):
        model = MultiwayDecisionTree(max_depth=depth).fit(X.iloc[fit_idx], y[fit_idx])
        pred = model.predict(X.iloc[valid_idx])
        validation.append({"max_depth": depth, **classification_metrics(y[valid_idx], pred, (0, 1), positive=1)})
    best = max(validation, key=lambda row: (row["f1"], row["recall"], -row["max_depth"]))
    model = MultiwayDecisionTree(best["max_depth"]).fit(X.iloc[train_idx], y[train_idx])
    scores = model.predict_proba(X.iloc[test_idx])
    pred = (scores >= .5).astype(int)
    metrics = classification_metrics(y[test_idx], pred, (0, 1), positive=1)
    curve, roc_auc, pr_auc = binary_curves(y[test_idx], scores)
    metrics.update({"roc_auc": roc_auc, "pr_auc_trapezoid": pr_auc})
    train_metrics = classification_metrics(y[train_idx], model.predict(X.iloc[train_idx]), (0, 1), positive=1)
    _, train_roc, train_pr = binary_curves(y[train_idx], model.predict_proba(X.iloc[train_idx]))
    train_metrics.update({"roc_auc": train_roc, "pr_auc_trapezoid": train_pr})
    matrix = confusion_matrix(y[test_idx], pred, (0, 1))
    summary = pd.DataFrame([{"split": "train", **train_metrics}, {"split": "test", **metrics}])
    summary.to_csv(output / "models_summary.csv", index=False)
    pd.DataFrame(validation).to_csv(output / "validation.csv", index=False)
    pd.DataFrame(curve).to_csv(output / "curve_points.csv", index=False)
    pd.DataFrame({"row_id": test_idx, "actual": y[test_idx], "predicted": pred,
                  "probability_poisonous": scores}).to_csv(output / "predictions.csv", index=False)
    pd.DataFrame(matrix, index=["edible", "poisonous"], columns=["edible", "poisonous"]).to_csv(output / "confusion_matrix.csv")
    df.describe().T.to_csv(output / "categorical_statistics.csv")
    df.apply(lambda col: (col == "?").sum()).to_csv(output / "missing_counts.csv")
    # Частоты сохраняются и для признаков, не попавших в случайный набор.
    freq = []
    for feature in FEATURES:
        freq.extend({"feature": feature, "value": value, "count": int(n)}
                    for value, n in df[feature].value_counts().items())
    pd.DataFrame(freq).to_csv(output / "category_counts.csv", index=False)
    save_json(output / "tree.json", model.root.to_dict())
    (output / "tree_rules.txt").write_text("\n".join(rules_text(model.root)), encoding="utf-8")
    constants = [col for col in selected if X.iloc[train_idx][col].nunique() == 1]
    manifest = {**provenance(data_path), "n_rows": len(df), "n_features_original": len(FEATURES),
                "feature_count_rule": "floor(sqrt(n))", "selected_features": selected,
                "constant_selected_on_train": constants,
                "seed_features": seed, "seed_split": seed, "seed_validation": seed + 1,
                "train_indices": train_idx.tolist(), "test_indices": test_idx.tolist(),
                "fit_indices": fit_idx.tolist(), "validation_indices": valid_idx.tolist(),
                "selected_max_depth": best["max_depth"], "criterion": "information_gain",
                "positive_class": "poisonous=1", "probability_threshold": .5,
                "tree": tree_stats(model.root), "metrics_test": metrics,
                "missing_policy": "? -> __MISSING__, отдельная категория",
                "pr_auc_definition": "trapezoidal, grouped tied scores, initial (recall=0, precision=1)"}
    save_json(output / "experiment.json", manifest)

    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    counts = df["class"].value_counts().reindex(["e", "p"])
    axes[0].bar(["edible (0)", "poisonous (1)"], counts, color=["#4e8157", "#b46549"])
    axes[0].set_ylabel("Количество объектов")
    axes[0].set_title("Распределение классов")
    missing = int((df["stalk_root"] == "?").sum())
    axes[1].bar(["известен", "пропуск ?"], [len(df) - missing, missing], color="#376b9b")
    axes[1].set_title("stalk_root: пропуски")
    fig.tight_layout()
    fig.savefig(figures / "01_data.png", dpi=150)
    plt.close(fig)
    fig, axes = plt.subplots(1, 3, figsize=(13, 4))
    draw_confusion(axes[0], matrix, ["edible", "poisonous"], "Матрица ошибок, порог 0.5")
    axes[1].plot([r["fpr"] for r in curve], [r["tpr"] for r in curve], marker=".", label=f"AUC={roc_auc:.4f}")
    axes[1].plot([0, 1], [0, 1], "--", color="gray")
    axes[1].set(xlabel="FPR", ylabel="TPR (Recall)", title="ROC", xlim=(0, 1), ylim=(0, 1.03))
    axes[1].legend()
    axes[2].plot([r["recall"] for r in curve], [r["precision"] for r in curve], marker=".", label=f"AUC={pr_auc:.4f}")
    axes[2].axhline(float(y[test_idx].mean()), linestyle="--", color="gray", label="Доля poisonous")
    axes[2].set(xlabel="Recall", ylabel="Precision", title="PR (трапеции)", xlim=(0, 1), ylim=(0, 1.03))
    axes[2].legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(figures / "02_confusion_roc_pr.png", dpi=150)
    plt.close(fig)
    plot_tree(model.root, figures / "03_tree.png")
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot([v["max_depth"] for v in validation], [v["f1"] for v in validation], "o-", label="F1 validation")
    ax.plot([v["max_depth"] for v in validation], [v["recall"] for v in validation], "s-", label="Recall validation")
    ax.set(xlabel="Максимальная глубина", ylabel="Метрика", title="Выбор глубины без тестовой выборки", ylim=(0, 1.03))
    ax.set_xticks([1, 2, 4])
    ax.legend()
    ax.grid(alpha=.2)
    fig.tight_layout()
    fig.savefig(figures / "04_validation.png", dpi=150)
    plt.close(fig)
    print("Случайные признаки:", selected, "; константные:", constants)
    print("Выбор глубины по validation:", best)
    print("Структура:", manifest["tree"])
    print(summary.to_string(index=False, float_format=lambda x: f"{x:.4f}"))
    return summary, manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "data/agaricus-lepiota.data")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "results")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    try:
        run(args.data, args.output_dir, args.seed)
    except (ValueError, OSError) as exc:
        parser.exit(2, f"Ошибка: {exc}\n")
