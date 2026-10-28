"""Контрольные примеры с заранее известными ответами, без sklearn."""
from pathlib import Path
import ast
import math
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "lab_4"))
sys.path.insert(0, str(ROOT / "lab_5"))
import numpy as np
import pandas as pd
import common
from common import (TabularPreprocessor, binary_curves, classification_metrics,
                    confusion_matrix, stratified_split)
from lab4_knn import KNNClassifier, FEATURES as WINE_FEATURES, load_data
from lab5_tree import MultiwayDecisionTree, Node, entropy, prepare_categories, tree_stats


class NeighborTests(unittest.TestCase):
    def test_nearest(self):
        m = KNNClassifier(1).fit([[0], [5], [10]], [1, 2, 3])
        np.testing.assert_array_equal(m.predict([[.1], [9]]), [1, 3])

    def test_majority(self):
        m = KNNClassifier(3).fit([[0], [1], [2]], [1, 2, 2])
        self.assertEqual(m.predict([[0]])[0], 2)

    def test_even_vote_tie(self):
        m = KNNClassifier(2).fit([[0], [2]], [3, 1])
        self.assertEqual(m.predict([[1]])[0], 1)

    def test_distance_tie_stable(self):
        m = KNNClassifier(1).fit([[-1], [1]], [2, 1])
        self.assertEqual(m.predict([[0]])[0], 2)

    def test_metric_changes_neighbor(self):
        X, y = [[3, 0], [2, 2]], [1, 2]
        self.assertEqual(KNNClassifier(1, "euclidean").fit(X, y).predict([[0, 0]])[0], 2)
        self.assertEqual(KNNClassifier(1, "manhattan").fit(X, y).predict([[0, 0]])[0], 1)

    def test_inputs(self):
        for k in (0, -1, 1.5, True):
            with self.assertRaises(ValueError): KNNClassifier(k)
        with self.assertRaises(ValueError): KNNClassifier(3).fit([[0]], [0])
        with self.assertRaises(ValueError): KNNClassifier(1).fit([[math.nan]], [0])
        with self.assertRaises(ValueError): KNNClassifier(1).predict([[0]])

    def test_fit_copies_input(self):
        X = np.array([[0.], [10.]])
        m = KNNClassifier(1).fit(X, [0, 1])
        X[:] = 999
        self.assertEqual(m.predict([[0]])[0], 0)


class PreprocessingTests(unittest.TestCase):
    def test_train_only_median_mean(self):
        prep = TabularPreprocessor().fit(pd.DataFrame({"x": [1., 3., math.nan]}))
        self.assertEqual(prep.medians["x"], 2)
        self.assertEqual(prep.mean[0], 2)
        expected = 98 / math.sqrt(2 / 3)
        self.assertAlmostEqual(prep.transform(pd.DataFrame({"x": [100.]}))[0, 0], expected)

    def test_constant_scaling(self):
        frame = pd.DataFrame({"x": [3., 3.]})
        prep = TabularPreprocessor().fit(frame)
        np.testing.assert_equal(prep.transform(frame), [[0], [0]])

    def test_categories_unknown_and_missing(self):
        prep = TabularPreprocessor(False).fit(pd.DataFrame({"x": ["a", "b", None]}))
        result = prep.transform(pd.DataFrame({"x": ["z", None]}))
        self.assertEqual(float(result[0].sum()), 0)
        self.assertEqual(float(result[1].sum()), 1)

    def test_all_missing_rejected(self):
        with self.assertRaises(ValueError):
            TabularPreprocessor().fit(pd.DataFrame({"x": [math.nan]}))

    def test_split_stratified_disjoint(self):
        y = np.array([0] * 50 + [1] * 30)
        tr, te = stratified_split(y)
        self.assertEqual(len(te), 16)
        self.assertEqual(len(set(tr) & set(te)), 0)
        self.assertEqual(set(tr) | set(te), set(range(80)))
        self.assertEqual(sum(y[te]), 6)
        np.testing.assert_array_equal(tr, stratified_split(y)[0])


class MetricTests(unittest.TestCase):
    def test_confusion_orientation(self):
        self.assertEqual(confusion_matrix([0, 0, 1, 1], [0, 1, 1, 1], [0, 1]), [[1, 1], [0, 2]])

    def test_binary_metrics(self):
        result = classification_metrics([0, 0, 1, 1], [0, 1, 1, 1], [0, 1], positive=1)
        self.assertEqual(result["accuracy"], .75)
        self.assertAlmostEqual(result["precision"], 2 / 3)
        self.assertEqual(result["recall"], 1)
        self.assertAlmostEqual(result["f1"], .8)

    def test_zero_denominator(self):
        result = classification_metrics([0, 1], [0, 0], [0, 1], positive=1)
        self.assertEqual(result["precision"], 0)
        self.assertEqual(result["recall"], 0)

    def test_perfect_curves(self):
        _, roc, pr = binary_curves([0, 1, 0, 1], [.1, .9, .2, .8])
        self.assertEqual(roc, 1)
        self.assertEqual(pr, 1)

    def test_reversed_curves(self):
        _, roc, pr = binary_curves([0, 1], [.9, .1])
        self.assertEqual(roc, 0)
        self.assertEqual(pr, .25)

    def test_tied_scores_grouped(self):
        rows, roc, pr = binary_curves([0, 1, 0, 1], [.5] * 4)
        self.assertEqual(len(rows), 2)
        self.assertEqual(roc, .5)
        self.assertEqual(pr, .75)  # Именно трапеции, а не average precision.
        self.assertEqual(binary_curves([1, 0, 1, 0], [.5] * 4)[1:], (roc, pr))

    def test_curve_invalid(self):
        with self.assertRaises(ValueError): binary_curves([1, 1], [.2, .3])
        with self.assertRaises(ValueError): binary_curves([0, 1], [.2, math.nan])


class TreeTests(unittest.TestCase):
    def test_entropy(self):
        self.assertEqual(entropy([0, 0]), 0)
        self.assertEqual(entropy([0, 1]), 1)

    def test_three_way_node(self):
        X = pd.DataFrame({"color": ["a", "a", "b", "b", "c", "c"]})
        m = MultiwayDecisionTree().fit(X, [0, 0, 1, 1, 0, 0])
        self.assertIsInstance(m.root, Node)
        self.assertIsInstance(m.root.children, dict)
        self.assertEqual(len(m.root.children), 3)
        np.testing.assert_array_equal(m.predict(X), [0, 0, 1, 1, 0, 0])

    def test_unseen_value_fallback(self):
        X = pd.DataFrame({"color": ["a", "a", "b"]})
        m = MultiwayDecisionTree().fit(X, [0, 0, 1])
        self.assertAlmostEqual(m.predict_proba(pd.DataFrame({"color": ["new"]}))[0], 1 / 3)

    def test_missing_category(self):
        X = pd.DataFrame({"x": ["?", None, "a", "a"]})
        m = MultiwayDecisionTree().fit(X, [1, 1, 0, 0])
        self.assertIn("__MISSING__", m.root.children)
        self.assertEqual(m.predict(pd.DataFrame({"x": ["?"]}))[0], 1)

    def test_depth_zero_and_class_tie(self):
        m = MultiwayDecisionTree(0).fit(pd.DataFrame({"x": ["a", "b"]}), [0, 1])
        self.assertEqual(tree_stats(m.root)["depth"], 0)
        self.assertEqual(m.predict(pd.DataFrame({"x": ["a"]}))[0], 1)

    def test_constant_feature_stops(self):
        m = MultiwayDecisionTree().fit(pd.DataFrame({"x": ["a", "a"]}), [0, 1])
        self.assertFalse(m.root.children)
        self.assertEqual(m.root.probability, .5)

    def test_no_ready_ml_or_metric_libraries(self):
        for path in (ROOT / "common.py", ROOT / "lab_4/lab4_knn.py", ROOT / "lab_5/lab5_tree.py"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    self.assertFalse(any(n.name.split(".")[0] in {"sklearn", "scipy", "statsmodels"} for n in node.names))
                if isinstance(node, ast.ImportFrom):
                    self.assertNotIn((node.module or "").split(".")[0], {"sklearn", "scipy", "statsmodels"})
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and node.name in {"binary_curves", "classification_metrics", "confusion_matrix"}:
                    self.assertFalse(any(isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name)
                                         and n.value.id in {"np", "pd"} for n in ast.walk(node)))


class DataTests(unittest.TestCase):
    def test_real_wine_shape(self):
        df = load_data(ROOT / "lab_4/data/wine.data")
        self.assertEqual(df.shape, (178, 14))
        self.assertEqual(df["class"].value_counts().sort_index().tolist(), [59, 71, 48])
        self.assertEqual(len(WINE_FEATURES), 13)

    def test_real_mushroom_shape(self):
        df = pd.read_csv(ROOT / "lab_5/data/agaricus-lepiota.data", header=None)
        self.assertEqual(df.shape, (8124, 23))
        self.assertEqual(int((df[11] == "?").sum()), 2480)


if __name__ == "__main__":
    unittest.main(verbosity=2)
