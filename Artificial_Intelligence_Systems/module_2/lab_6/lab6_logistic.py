"""ЛР 6. Логистическая регрессия на Titanic, без готовых моделей и метрик."""
import argparse
from itertools import product
from pathlib import Path
import sys


import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
from common import (TabularPreprocessor, classification_metrics, confusion_matrix,
                    draw_confusion, provenance, save_json, stratified_split)

FEATURES = ['Pclass', 'Sex', 'Age', 'SibSp', 'Parch', 'Fare', 'Embarked']
CATEGORICAL = ['Pclass', 'Sex', 'Embarked']
METHODS = ('gradient', 'newton')
RATES = (0.01, 0.1, 1.0)
STEPS = (10, 50, 200)
DATA_SOURCE = 'https://github.com/datasciencedojo/datasets/blob/master/titanic.csv'


def sigmoid(z):
    z = np.asarray(z, dtype=float)
    exp = np.exp(-np.abs(z))
    return np.where(z >= 0, 1 / (1 + exp), exp / (1 + exp))


def log_loss(y, logits):
    """Бинарная кросс-энтропия в устойчивой форме через логиты."""
    return float(np.mean(np.logaddexp(0, (1 - 2 * np.asarray(y, dtype=float)) * logits)))


class LogisticRegression:
    def __init__(self, rate=0.1, iterations=200, method='gradient'):
        if not np.isfinite(rate) or rate <= 0:
            raise ValueError('Шаг должен быть конечным положительным числом')
        if isinstance(iterations, bool) or not isinstance(iterations, (int, np.integer)) or iterations < 1:
            raise ValueError('Число итераций должно быть положительным целым')
        if method not in METHODS:
            raise ValueError(f'Неизвестный оптимизатор: {method}')
        self.rate = rate
        self.iterations = iterations
        self.method = method

    @staticmethod
    def _design(x):
        x = np.asarray(x, dtype=float)
        if x.ndim != 2 or x.size == 0 or not np.isfinite(x).all():
            raise ValueError('Ожидается непустая конечная матрица признаков')
        return np.column_stack([np.ones(len(x)), x])

    def fit(self, x, y):
        a = self._design(x)
        y = np.asarray(y, dtype=float)
        if y.shape != (len(a),) or set(y) != {0.0, 1.0}:
            raise ValueError('В обучении должны присутствовать оба класса 0 и 1')
        weights = np.zeros(a.shape[1])
        loss_history = [log_loss(y, a @ weights)]
        for _ in range(self.iterations):
            probabilities = sigmoid(a @ weights)
            gradient = a.T @ (probabilities - y) / len(y)
            direction = gradient
            if self.method == 'newton':
                curvature = probabilities * (1 - probabilities)
                hessian = a.T @ (a * curvature[:, None]) / len(y)
                # Стабилизация системы для направления шага, без штрафа в log loss.
                hessian += 1e-8 * np.eye(len(weights))
                direction = np.linalg.solve(hessian, gradient)
            weights -= self.rate * direction
            loss_history.append(log_loss(y, a @ weights))
            if not np.isfinite(loss_history[-1]):
                raise FloatingPointError('Потери перестали быть конечными')
        self.weights_ = weights
        self.loss_history_ = loss_history
        return self

    def predict_proba(self, x):
        if not hasattr(self, 'weights_'):
            raise ValueError('Сначала обучите модель')
        a = self._design(x)
        if a.shape[1] != len(self.weights_):
            raise ValueError('Число признаков отличается от обучения')
        return sigmoid(a @ self.weights_)

    def predict(self, x, threshold=0.5):
        if not 0 <= threshold <= 1:
            raise ValueError('Порог должен быть в [0, 1]')
        return (self.predict_proba(x) >= threshold).astype(int)


def prepare_split(frame, train_idx, other_idx):
    train = frame.iloc[train_idx][FEATURES].copy()
    other = frame.iloc[other_idx][FEATURES].copy()
    port = train['Embarked'].mode().iloc[0]
    for part in (train, other):
        part['Embarked'] = part['Embarked'].fillna(port)
        part['Pclass'] = part['Pclass'].astype(str)
    prep = TabularPreprocessor().fit(train)
    reference = {col: prep.categories[col][0] for col in CATEGORICAL}
    dropped = {f'{col}={category}' for col, category in reference.items()}
    keep = [i for i, name in enumerate(prep.output_names) if name not in dropped]
    info = {'embarked_mode': port, 'medians': prep.medians, 'reference': reference,
            'features': [prep.output_names[i] for i in keep],
            'mean': prep.mean[keep].tolist(), 'std': prep.std[keep].tolist()}
    return prep.transform(train)[:, keep], prep.transform(other)[:, keep], info


def scores(y, probability, threshold=0.5):
    return classification_metrics(y, probability >= threshold, [0, 1], positive=1)


def plot_results(frame, statistics, grid, history, thresholds, matrices, folder):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    folder.mkdir(parents=True, exist_ok=True)

    def save(fig, name):
        fig.tight_layout()
        fig.savefig(folder / name, dpi=170, bbox_inches='tight')
        plt.close(fig)

    columns = list(statistics.index)
    fig, axes = plt.subplots(2, 4, figsize=(12, 5))
    for ax, col in zip(axes.flat, columns):
        values = frame[col].dropna()
        ax.hist(values, bins=15, color='#49799b')
        ax.set(title=f'{col} · N={len(values)}', ylabel='Число строк')
    for ax in list(axes.flat)[len(columns):]:
        ax.set_visible(False)
    save(fig, '01_distributions.png')

    fig, axes = plt.subplots(2, 4, figsize=(12, 4.6))
    for ax, col in zip(axes.flat, columns):
        row = statistics.loc[col]
        ax.hlines(1, row['min'], row['max'], color='#49799b')
        ax.vlines([row['min'], row['max']], .92, 1.08, color='#49799b')
        ax.barh(1, row['75%'] - row['25%'], left=row['25%'], height=.23,
                color='#cbdce8', edgecolor='#49799b')
        ax.vlines(row['50%'], .885, 1.115, color='#29465c')
        ax.errorbar(row['mean'], 1.32, xerr=row['std'], fmt='o', capsize=4, color='#a34f2c')
        ax.set(title=f'{col} · N={int(row["count"])}', yticks=[], ylim=(0.65, 1.65))
    for ax in list(axes.flat)[len(columns):]:
        ax.set_visible(False)
    fig.suptitle('Квартили и min/max (усы), среднее ± std (точка и отрезок)')
    save(fig, '02_summary.png')

    fig, axes = plt.subplots(1, 2, figsize=(10, 3.8), sharey=True)
    for ax, method, title in zip(axes, METHODS, ['Градиентный спуск', 'Метод Ньютона']):
        for rate in RATES:
            ax.plot(history[(method, rate, max(STEPS))], label=f'α = {rate:g}')
        ax.set(title=title, xlabel='Итерация', ylabel='Log loss на train')
        ax.legend()
        ax.grid(alpha=0.25)
    save(fig, '03_convergence.png')

    fig, axes = plt.subplots(1, 2, figsize=(10, 4), sharey=True)
    for ax, method, title in zip(axes, METHODS, ['Градиентный спуск', 'Метод Ньютона']):
        block = grid[grid.method == method].pivot(index='rate', columns='iterations', values='validation_f1')
        ax.imshow(block, cmap='Blues', vmin=0, vmax=1, aspect='auto')
        for i, row in enumerate(block.to_numpy()):
            for j, value in enumerate(row):
                ax.text(j, i, f'{value:.3f}', ha='center', va='center', color='white' if value > .55 else 'black')
        ax.set(title=title, xlabel='Число итераций', ylabel='Шаг α',
               xticks=range(len(STEPS)), xticklabels=STEPS, yticks=range(len(RATES)), yticklabels=RATES)
    fig.suptitle('F1 на validation при пороге 0,5')
    save(fig, '04_grid.png')

    fig, ax = plt.subplots(figsize=(8, 3.8))
    for name in ('accuracy', 'precision', 'recall', 'f1'):
        ax.plot(thresholds['threshold'], thresholds[name], marker='o', label=name)
    ax.set(xlabel='Порог вероятности', ylabel='Метрика на validation', ylim=(0, 1.03))
    ax.legend(ncol=4)
    ax.grid(alpha=0.25)
    save(fig, '05_thresholds.png')

    fig, axes = plt.subplots(1, 2, figsize=(8, 3.8))
    for ax, (name, matrix) in zip(axes, matrices.items()):
        draw_confusion(ax, matrix, ['0', '1'], name)
    save(fig, '06_confusion.png')


def run(data_path=ROOT / 'data/titanic.csv', output_dir=ROOT / 'results', seed=42):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    frame = pd.read_csv(data_path)
    y = frame['Survived'].to_numpy()
    train, test = stratified_split(y, seed=seed)
    fit, validation = stratified_split(y[train], test_size=0.25, seed=seed + 1)
    fit, validation = train[fit], train[validation]
    x_fit, x_val, _ = prepare_split(frame, fit, validation)
    x_train, x_test, preprocessing = prepare_split(frame, train, test)
    configurations = list(product(METHODS, RATES, STEPS))

    validation_scores, validation_probabilities = {}, {}
    for config in configurations:
        method, rate, iterations = config
        model = LogisticRegression(rate, iterations, method).fit(x_fit, y[fit])
        probabilities = model.predict_proba(x_val)
        validation_probabilities[config] = probabilities
        validation_scores[config] = scores(y[validation], probabilities)
    # При одинаковом F1 выбираем меньший бюджет, затем порядок сетки.
    best = max(configurations, key=lambda c: (validation_scores[c]['f1'], -c[2]))
    val_probability = validation_probabilities[best]
    # Между соседними оценками классификация постоянна, достаточно проверить границы.
    threshold_values = np.unique(np.r_[val_probability, .5, np.nextafter(val_probability.max(), 1)])
    thresholds = pd.DataFrame([{'threshold': t, **scores(y[validation], val_probability, t)}
                               for t in threshold_values])
    threshold = float(max(thresholds.to_dict('records'),
                          key=lambda row: (row['f1'], -abs(row['threshold'] - .5)))['threshold'])

    rows, history = [], {}
    for config in configurations:
        method, rate, iterations = config
        model = LogisticRegression(rate, iterations, method).fit(x_train, y[train])
        probabilities = model.predict_proba(x_test)
        history[config] = model.loss_history_
        rows.append({'method': method, 'rate': rate, 'iterations': iterations,
                     **{f'validation_{name}': value for name, value in validation_scores[config].items()},
                     **{f'test_{name}': value for name, value in scores(y[test], probabilities).items()},
                     'train_log_loss': model.loss_history_[-1]})
        if config == best:
            selected_model, selected_probabilities = model, probabilities

    default_pred = (selected_probabilities >= .5).astype(int)
    tuned_pred = (selected_probabilities >= threshold).astype(int)
    matrices = {'Порог 0,5': confusion_matrix(y[test], default_pred, [0, 1]),
                f'Порог {threshold:.4f} (validation)': confusion_matrix(y[test], tuned_pred, [0, 1])}
    statistics = frame[['Survived', 'Pclass', 'Age', 'SibSp', 'Parch', 'Fare']].describe().T
    statistics['missing'] = frame[statistics.index].isna().sum()
    grid = pd.DataFrame(rows)
    metadata = {**provenance(data_path), 'source': DATA_SOURCE, 'n_rows': len(frame),
                'class_counts': {str(k): int(v) for k, v in frame.Survived.value_counts().items()},
                'missing': {k: int(v) for k, v in frame.isna().sum().items()},
                'seed_split': seed, 'seed_validation': seed + 1, 'train_indices': train.tolist(),
                'fit_indices': fit.tolist(), 'validation_indices': validation.tolist(), 'test_indices': test.tolist(),
                'preprocessing': preprocessing,
                'selected': dict(zip(('method', 'rate', 'iterations'), best)),
                'validation_at_0_5': validation_scores[best], 'test_at_0_5': scores(y[test], selected_probabilities),
                'threshold': threshold, 'test_at_selected_threshold': scores(y[test], selected_probabilities, threshold),
                'test_majority_baseline': scores(y[test], np.full(len(test), int(np.mean(y[train]) >= .5))),
                'confusion_at_0_5': matrices['Порог 0,5'], 'confusion_at_selected_threshold': list(matrices.values())[1]}

    grid.to_csv(output_dir / 'models_summary.csv', index=False)
    statistics.to_csv(output_dir / 'statistics.csv')
    thresholds.to_csv(output_dir / 'validation_thresholds.csv', index=False)
    pd.DataFrame([{'method': m, 'rate': a, 'iterations': k, 'step': i, 'log_loss': loss}
                  for (m, a, k), values in history.items() for i, loss in enumerate(values)]).to_csv(
                      output_dir / 'loss_history.csv', index=False)
    pd.DataFrame({'passenger_id': frame.PassengerId.iloc[test].to_numpy(), 'actual': y[test],
                  'probability': selected_probabilities, 'pred_at_0_5': default_pred,
                  'pred_at_selected_threshold': tuned_pred}).to_csv(output_dir / 'predictions.csv', index=False)
    pd.DataFrame({'feature': ['intercept', *preprocessing['features']],
                  'coefficient': selected_model.weights_}).to_csv(output_dir / 'coefficients.csv', index=False)
    save_json(output_dir / 'experiment.json', metadata)
    plot_results(frame, statistics, grid, history, thresholds, matrices, output_dir / 'figures')
    return grid, metadata


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=ROOT / 'data/titanic.csv')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'results')
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    table, experiment = run(args.data, args.output_dir, args.seed)
    print(table.to_string(index=False, float_format=lambda x: f'{x:.4f}'))
    print('Выбор по validation:', experiment['selected'])
    print('Test, порог 0.5:', experiment['test_at_0_5'])
    print('Test, выбранный порог:', experiment['threshold'], experiment['test_at_selected_threshold'])
