from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import openpyxl


ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "УИР_1_вариант_16_расчеты.xlsx"
OUT = Path(__file__).resolve().parent / "figures"
BLUE, GREEN, RED = "#245581", "#28714d", "#d34b2a"


def finish(fig, name):
    fig.tight_layout()
    fig.savefig(OUT / name, bbox_inches="tight")
    plt.close(fig)


def decorate(ax, xlabel, ylabel):
    ax.set(xlabel=xlabel, ylabel=ylabel)
    ax.grid(True, linewidth=0.4, alpha=0.4)
    ax.set_axisbelow(True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.family": "DejaVu Serif", "font.size": 9,
                         "axes.titlesize": 10, "axes.labelsize": 9})
    wb = openpyxl.load_workbook(BOOK, data_only=True)
    source = np.array([wb["Исходные данные"][f"B{row}"].value for row in range(5, 305)], dtype=float)
    generated = np.array([wb["Генератор"][f"E{row}"].value for row in range(12, 312)], dtype=float)
    acf_source = np.array([wb["Автокорреляция"][f"B{row}"].value for row in range(5, 15)], dtype=float)
    acf_generated = np.array([wb["Автокорреляция"][f"C{row}"].value for row in range(5, 15)], dtype=float)
    p, mu1, mu2 = [float(wb["Распределение"][f"B{r}"].value) for r in [23, 24, 25]]
    wb.close()

    index = np.arange(1, len(source) + 1)
    ymax = max(source.max(), generated.max()) * 1.07
    for values, color, filename in [(source, BLUE, "source_sequence.pdf"),
                                     (generated, GREEN, "generated_sequence.pdf")]:
        fig, ax = plt.subplots(figsize=(7, 2.55))
        ax.plot(index, values, color=color, linewidth=0.7)
        ax.axhline(values.mean(), color=RED, linestyle="--", linewidth=0.8,
                   label=f"среднее {values.mean():.4f}")
        ax.set(xlim=(0, len(source)), ylim=(0, ymax))
        decorate(ax, "Номер измерения", "Значение")
        ax.legend(frameon=True, fontsize=8)
        finish(fig, filename)

    edges = np.linspace(0, max(source.max(), generated.max()), 16)
    centers = (edges[:-1] + edges[1:]) / 2
    widths = np.diff(edges)
    count_x, _ = np.histogram(source, bins=edges)
    count_y, _ = np.histogram(generated, bins=edges)
    expected = len(source) * (
        p * (np.exp(-mu1*edges[:-1]) - np.exp(-mu1*edges[1:]))
        + (1-p) * (np.exp(-mu2*edges[:-1]) - np.exp(-mu2*edges[1:])))
    assert count_x.sum() == count_y.sum() == len(source)

    fig, ax = plt.subplots(figsize=(7, 2.6))
    ax.bar(centers, count_x, width=widths, color="#8baec6", edgecolor=BLUE, linewidth=0.5)
    ax.set(xlim=(0, edges[-1]))
    decorate(ax, "Значение", "Частота")
    finish(fig, "source_histogram.pdf")

    # Histograms and the integrated density use the same frequency scale.
    for include_generated, filename in [(False, "h2_fit.pdf"), (True, "histogram_comparison.pdf")]:
        fig, ax = plt.subplots(figsize=(7, 2.65))
        ax.bar(centers, count_x, width=widths, color="#8baec6", edgecolor=BLUE,
               linewidth=0.5, label="Заданная ЧП")
        if include_generated:
            ax.stairs(count_y, edges, color=GREEN, linewidth=1.1, label="Сгенерированная ЧП")
        ax.plot(centers, expected, color=RED, linewidth=1.1, marker=".", markersize=3,
                label="Ожидаемая частота закона")
        ax.set(xlim=(0, edges[-1]))
        decorate(ax, "Значение", "Частота")
        ax.legend(frameon=True, fontsize=8)
        finish(fig, filename)

    # A literal density is compared with normalized frequencies, not raw counts.
    grid = np.linspace(0, edges[-1], 1800)
    density = p*mu1*np.exp(-mu1*grid) + (1-p)*mu2*np.exp(-mu2*grid)
    fig, ax = plt.subplots(figsize=(7, 2.65))
    ax.bar(centers, count_x/(len(source)*widths), width=widths, color="#8baec6",
           edgecolor=BLUE, linewidth=0.5, label="Нормированная гистограмма")
    ax.plot(grid, density, color=RED, linewidth=1.1, label=r"Плотность $H_\nu$")
    ax.set(xlim=(0, edges[-1]))
    decorate(ax, "Значение", "Плотность")
    ax.legend(frameon=True, fontsize=8)
    finish(fig, "h2_density.pdf")

    fig, axes = plt.subplots(2, 1, figsize=(7, 3.2), sharex=True, sharey=True)
    for ax, values, color, title in zip(axes, [source, generated], [BLUE, GREEN],
                                       ["Заданная последовательность", "Сгенерированная последовательность"]):
        ax.plot(index, values, color=color, linewidth=0.65)
        ax.axhline(values.mean(), color=RED, linestyle="--", linewidth=0.7)
        ax.set(title=title, xlim=(0, len(source)), ylim=(0, ymax))
        decorate(ax, "", "Значение")
    axes[-1].set_xlabel("Номер измерения")
    finish(fig, "sequence_comparison.pdf")

    lags = np.arange(1, 11)
    limit = 1.96 / np.sqrt(len(source))
    for compare, filename in [(False, "source_acf.pdf"), (True, "acf_comparison.pdf")]:
        fig, ax = plt.subplots(figsize=(7, 2.55))
        if compare:
            ax.bar(lags-0.19, acf_source, width=0.38, color=BLUE, label="Заданная ЧП")
            ax.bar(lags+0.19, acf_generated, width=0.38, color=GREEN, label="Сгенерированная ЧП")
        else:
            ax.bar(lags, acf_source, width=0.8, color=BLUE)
        ax.axhline(limit, color=RED, linestyle="--", linewidth=0.8, label=f"Границы 95%: ±{limit:.3f}")
        ax.axhline(-limit, color=RED, linestyle="--", linewidth=0.8)
        ax.axhline(0, color="black", linewidth=0.6)
        ax.set(xticks=lags, xlim=(0.5, 10.5), ylim=(-0.15, 0.18))
        decorate(ax, "Сдвиг", "Коэффициент автокорреляции")
        ax.legend(frameon=True, fontsize=8, loc="upper left")
        finish(fig, filename)


if __name__ == "__main__":
    main()
