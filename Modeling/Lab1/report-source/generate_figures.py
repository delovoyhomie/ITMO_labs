from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import openpyxl


ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "УИР_1_вариант_16_расчеты.xlsx"
OUT = Path(__file__).resolve().parent / "figures"


def finish(fig, name):
    fig.tight_layout()
    fig.savefig(OUT / name, bbox_inches="tight")
    plt.close(fig)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "axes.titlesize": 10, "axes.labelsize": 9})

    wb = openpyxl.load_workbook(BOOK, data_only=True)
    source = np.array([wb["Исходные данные"][f"B{row}"].value for row in range(5, 305)], dtype=float)
    generated = np.array([wb["Генератор"][f"E{row}"].value for row in range(12, 312)], dtype=float)
    acf_source = np.array([wb["Автокорреляция"][f"B{row}"].value for row in range(5, 15)], dtype=float)
    acf_generated = np.array([wb["Автокорреляция"][f"C{row}"].value for row in range(5, 15)], dtype=float)
    p = float(wb["Распределение"]["B23"].value)
    mu1 = float(wb["Распределение"]["B24"].value)
    mu2 = float(wb["Распределение"]["B25"].value)

    x_index = np.arange(1, len(source) + 1)
    fig, ax = plt.subplots(figsize=(7.0, 2.55))
    ax.plot(x_index, source, color="#1f4e79", linewidth=0.8)
    ax.set(xlabel="Номер наблюдения", ylabel="Значение")
    ax.grid(True, linewidth=0.35, alpha=0.45)
    finish(fig, "source_sequence.pdf")

    edges = np.linspace(0.0, max(source.max(), generated.max()), 16)
    centers = (edges[:-1] + edges[1:]) / 2
    widths = np.diff(edges)
    source_counts, _ = np.histogram(source, bins=edges)
    generated_counts, _ = np.histogram(generated, bins=edges)

    fig, ax = plt.subplots(figsize=(7.0, 2.6))
    ax.bar(centers, source_counts, width=widths * 0.9, color="#4472c4", edgecolor="black", linewidth=0.4)
    ax.set(xlabel="Интервал значений", ylabel="Частота")
    ax.grid(axis="y", linewidth=0.35, alpha=0.45)
    finish(fig, "source_histogram.pdf")

    lags = np.arange(1, 11)
    limit = 1.96 / np.sqrt(len(source))
    fig, ax = plt.subplots(figsize=(7.0, 2.55))
    markerline, stemlines, baseline = ax.stem(lags, acf_source)
    plt.setp(markerline, color="#1f4e79", markersize=4)
    plt.setp(stemlines, color="#1f4e79", linewidth=1.0)
    plt.setp(baseline, color="black", linewidth=0.5)
    ax.axhline(limit, color="#a61c00", linestyle="--", linewidth=0.8)
    ax.axhline(-limit, color="#a61c00", linestyle="--", linewidth=0.8)
    ax.set_xticks(lags)
    ax.set(xlabel="Сдвиг k", ylabel=r"$r_k$")
    ax.grid(axis="y", linewidth=0.35, alpha=0.45)
    finish(fig, "source_acf.pdf")

    theoretical = len(source) * (
        p * (np.exp(-mu1 * edges[:-1]) - np.exp(-mu1 * edges[1:]))
        + (1 - p) * (np.exp(-mu2 * edges[:-1]) - np.exp(-mu2 * edges[1:]))
    )
    fig, ax = plt.subplots(figsize=(7.0, 2.65))
    ax.bar(centers, source_counts, width=widths * 0.86, color="#a9c4e5", edgecolor="black", linewidth=0.35, label="Исходная ЧП")
    ax.plot(centers, theoretical, color="#a61c00", marker="o", markersize=3, linewidth=1.1, label=r"Модель $H_2$")
    ax.set(xlabel="Интервал значений", ylabel="Частота")
    ax.grid(axis="y", linewidth=0.35, alpha=0.45)
    ax.legend(frameon=False)
    finish(fig, "h2_fit.pdf")

    fig, ax = plt.subplots(figsize=(7.0, 2.55))
    ax.plot(x_index, generated, color="#548235", linewidth=0.8)
    ax.set(xlabel="Номер наблюдения", ylabel="Значение")
    ax.grid(True, linewidth=0.35, alpha=0.45)
    finish(fig, "generated_sequence.pdf")

    fig, ax = plt.subplots(figsize=(7.0, 2.65))
    ax.bar(centers - widths * 0.20, source_counts, width=widths * 0.38, color="#4472c4", label="Исходная ЧП")
    ax.bar(centers + widths * 0.20, generated_counts, width=widths * 0.38, color="#70ad47", label="Сгенерированная ЧП")
    ax.set(xlabel="Интервал значений", ylabel="Частота")
    ax.grid(axis="y", linewidth=0.35, alpha=0.45)
    ax.legend(frameon=False)
    finish(fig, "histogram_comparison.pdf")

    fig, ax = plt.subplots(figsize=(7.0, 2.65))
    ax.plot(lags, acf_source, color="#4472c4", marker="o", markersize=3.5, linewidth=1.0, label="Исходная ЧП")
    ax.plot(lags, acf_generated, color="#70ad47", marker="s", markersize=3.5, linewidth=1.0, label="Сгенерированная ЧП")
    ax.axhline(limit, color="#a61c00", linestyle="--", linewidth=0.8)
    ax.axhline(-limit, color="#a61c00", linestyle="--", linewidth=0.8)
    ax.set_xticks(lags)
    ax.set(xlabel="Сдвиг k", ylabel=r"$r_k$")
    ax.grid(axis="y", linewidth=0.35, alpha=0.45)
    ax.legend(frameon=False, ncol=2)
    finish(fig, "acf_comparison.pdf")


if __name__ == "__main__":
    main()
