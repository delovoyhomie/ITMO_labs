"""Расчёт ЛР1 по исходной таблице вариантов; без чтения результатов Excel."""
from pathlib import Path

import numpy as np
import openpyxl
from scipy.stats import chi2

ROOT = Path(__file__).resolve().parents[1]
SIZES = [10, 20, 50, 100, 200, 300]
T = {0.90: 1.643, 0.95: 1.960, 0.99: 2.576}


def characteristics(values):
    n = len(values)
    mean = values.mean()
    variance = values.var(ddof=1)
    std = np.sqrt(variance)
    return np.array([mean, variance, std, std / mean,
                     *[t * std / np.sqrt(n) for t in T.values()]])


def pearson(left, right):
    a, b = left - left.mean(), right - right.mean()
    return np.dot(a, b) / np.sqrt(np.dot(a, a) * np.dot(b, b))


def acf(values):
    return np.array([pearson(values[:-k], values[k:]) for k in range(1, 11)])


def calculate():
    book = openpyxl.load_workbook(ROOT / 'materials' / '!_УИР1_Варианты_с.xlsx',
                                 read_only=True, data_only=True)
    sheet = book['1-50']
    assert sheet.cell(1, 17).value == 16
    x = np.array([r[0] for r in sheet.iter_rows(min_row=2, max_row=301,
                 min_col=17, max_col=17, values_only=True)], dtype=float)
    book.close()
    n = len(x)
    alpha1, alpha2 = x.mean(), np.mean(x ** 2)
    variance_moments = alpha2 - alpha1 ** 2
    nu = np.sqrt(variance_moments) / alpha1
    # Формулы (2.39)-(2.41) учебника, с равными вкладами фаз в среднее.
    q = (1 + np.sqrt((nu ** 2 - 1) / (nu ** 2 + 1))) / 2
    q_min = (nu ** 2 - 1) / (nu ** 2 + 1)
    t1 = alpha1 * (1 - np.sqrt((1 - q) * (nu ** 2 - 1) / (2 * q)))
    t2 = alpha1 * (1 + np.sqrt(q * (nu ** 2 - 1) / (2 * (1 - q))))
    assert q_min < q < 1 and t1 > 0 and t2 > 0
    np.testing.assert_allclose([q * t1 + (1-q) * t2,
        2 * (q * t1 ** 2 + (1-q) * t2 ** 2)], [alpha1, alpha2], rtol=1e-12)
    state, modulus = 8141, 2 ** 32
    uniforms = []
    for _ in range(2 * n):
        state = (1664525 * state + 1013904223) % modulus
        uniforms.append((state + 0.5) / modulus)
    u = np.array(uniforms).reshape(n, 2)
    y = -np.log(u[:, 1]) * np.where(u[:, 0] <= q, t1, t2)
    stats_x = np.array([characteristics(x[:size]) for size in SIZES])
    stats_y = np.array([characteristics(y[:size]) for size in SIZES])
    acf_x, acf_y = acf(x), acf(y)
    edges = np.linspace(0, max(x.max(), y.max()), 16)
    expected = n * (q * (np.exp(-edges[:-1]/t1) - np.exp(-edges[1:]/t1))
        + (1-q) * (np.exp(-edges[:-1]/t2) - np.exp(-edges[1:]/t2)))
    centered = x - alpha1
    rhat = np.array([np.dot(centered[:-k], centered[k:]) /
                    np.dot(centered, centered) for k in range(1, 11)])
    lb_q = n * (n+2) * np.sum(rhat ** 2 / (n-np.arange(1, 11)))
    return dict(x=x, y=y, u=u, n=n, alpha1=alpha1, alpha2=alpha2,
        variance_moments=variance_moments, nu=nu, q=q, q_min=q_min, t1=t1, t2=t2,
        stats_x=stats_x, stats_y=stats_y,
        errors_x=np.abs(stats_x-stats_x[-1])/np.abs(stats_x[-1]),
        errors_y=np.abs(stats_y-stats_x)/np.abs(stats_x),
        acf_x=acf_x, acf_y=acf_y, acf_errors=np.abs(acf_y-acf_x)/np.abs(acf_x),
        cross=pearson(x, y), lb_q=lb_q, lb_p=chi2.sf(lb_q, 10),
        edges=edges, counts_x=np.histogram(x, edges)[0],
        counts_y=np.histogram(y, edges)[0], expected=expected)


if __name__ == '__main__':
    d = calculate()
    for key in ['alpha1', 'alpha2', 'variance_moments', 'nu', 'q', 'q_min',
                't1', 't2', 'cross']:
        print(f'{key}: {d[key]:.12f}')
    print('Generated statistics:', d['stats_y'][-1])
    print('Relative errors, %:', d['errors_y'][-1] * 100)
