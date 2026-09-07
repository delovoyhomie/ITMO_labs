import fs from "node:fs/promises";
import path from "node:path";

import {
  createVariant19Points,
  formatResultText,
  getDeterminationMessage,
  solveApproximations,
} from "./approximations.js";
import { createApproximationGraphSvg } from "./plotting-core.js";
import { formatNumber } from "./utils.js";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function valuesTable(model) {
  return markdownTable(
    ["i", "x_i", "y_i", "φ(x_i)", "ε_i"],
    model.values.map((row, index) => [
      String(index + 1),
      formatNumber(row.x, 3),
      formatNumber(row.y, 6),
      formatNumber(row.approximation, 6),
      formatNumber(row.residual, 6),
    ]),
  );
}

function normalEquationDescription(model) {
  if (model.id === "linear") {
    const [a0, a1] = model.parameters.coefficients;
    return [
      "Для линейной функции `φ(x)=a_1*x+a_0` решается система:",
      "",
      "```txt",
      "n*a0 + sum(x)*a1 = sum(y)",
      "sum(x)*a0 + sum(x^2)*a1 = sum(x*y)",
      "```",
      "",
      `Получено: a0=${formatNumber(a0, 6)}, a1=${formatNumber(a1, 6)}.`,
    ].join("\n");
  }

  const [a0, a1, a2] = model.parameters.coefficients;
  return [
    "Для квадратичной функции `φ(x)=a_2*x^2+a_1*x+a_0` решается система:",
    "",
    "```txt",
    "n*a0 + sum(x)*a1 + sum(x^2)*a2 = sum(y)",
    "sum(x)*a0 + sum(x^2)*a1 + sum(x^3)*a2 = sum(x*y)",
    "sum(x^2)*a0 + sum(x^3)*a1 + sum(x^4)*a2 = sum(x^2*y)",
    "```",
    "",
    `Получено: a0=${formatNumber(a0, 6)}, a1=${formatNumber(a1, 6)}, a2=${formatNumber(a2, 6)}.`,
  ].join("\n");
}

async function main() {
  const outputDir = "output";
  const graphsDir = path.join(outputDir, "graphs");
  await ensureDir(graphsDir);

  const solution = solveApproximations(createVariant19Points());
  const linear = solution.models.find((model) => model.id === "linear");
  const quadratic = solution.models.find((model) => model.id === "quadratic");
  const graphSvg = createApproximationGraphSvg(solution, {
    modelIds: ["linear", "quadratic", "cubic"],
  });
  await fs.writeFile(path.join(graphsDir, "variant19-approximations.svg"), graphSvg, "utf8");
  await fs.writeFile(path.join(outputDir, "variant19-result.txt"), formatResultText(solution), "utf8");

  const pointRows = solution.points.map((point, index) => [
    String(index + 1),
    formatNumber(point.x, 1),
    formatNumber(point.y, 6),
  ]);

  const modelRows = solution.models.map((model) => {
    if (!model.applicable) {
      return [model.label, "не применима", "-", "-", model.error];
    }
    return [
      model.label,
      model.equation.replace("φ", "phi"),
      formatNumber(model.s, 8),
      formatNumber(model.sigma, 8),
      `${formatNumber(model.r2, 8)} (${getDeterminationMessage(model.r2)})`,
    ];
  });

  const report = [
    "# Лабораторная работа 4. Вариант 19",
    "",
    "## Цель работы",
    "",
    "Найти функцию, являющуюся наилучшим приближением заданной табличной функции по методу наименьших квадратов.",
    "",
    "## Исходная функция",
    "",
    "Вариант 19:",
    "",
    "```txt",
    "y = 5x / (x^4 + 19), x in [0; 2], h = 0.2",
    "```",
    "",
    "## Рабочие формулы",
    "",
    "Мера отклонения:",
    "",
    "```txt",
    "S = sum((phi(x_i) - y_i)^2)",
    "sigma = sqrt(S / n)",
    "R^2 = 1 - S / sum((y_i - mean(y))^2)",
    "```",
    "",
    "Коэффициенты полиномиальных моделей находятся из нормальных уравнений МНК. Нелинейные модели приводятся к линейному виду через логарифмирование, если данные удовлетворяют области определения.",
    "",
    "## Вычислительная часть",
    "",
    "Таблица табулирования функции:",
    "",
    markdownTable(["i", "x_i", "y_i"], pointRows),
    "",
    "### Линейное приближение",
    "",
    normalEquationDescription(linear),
    "",
    `Среднеквадратичное отклонение: sigma=${formatNumber(linear.sigma, 3)}.`,
    "",
    valuesTable(linear),
    "",
    "### Квадратичное приближение",
    "",
    normalEquationDescription(quadratic),
    "",
    `Среднеквадратичное отклонение: sigma=${formatNumber(quadratic.sigma, 3)}.`,
    "",
    valuesTable(quadratic),
    "",
    `Лучшее приближение среди линейного и квадратичного: **${linear.sigma < quadratic.sigma ? "линейное" : "квадратичное"}**.`,
    "",
    "## Программная часть",
    "",
    markdownTable(["Модель", "Функция", "S", "sigma", "R^2"], modelRows),
    "",
    `Коэффициент корреляции Пирсона для линейной зависимости: r=${formatNumber(solution.pearson, 8)}.`,
    "",
    `Лучшая применимая модель: **${solution.best.label}**.`,
    "",
    `Функция: \`${solution.best.equation}\`.`,
    "",
    "График сохранен в `output/graphs/variant19-approximations.svg`.",
    "",
    "## Вывод",
    "",
    `На табличных данных варианта 19 минимальное среднеквадратичное отклонение среди применимых моделей получила модель "${solution.best.label}". Экспоненциальная, логарифмическая и степенная модели для исходной таблицы неприменимы из-за точки (0, 0), так как их линеаризация требует положительных x и/или y.`,
    "",
  ].join("\n");

  await fs.writeFile("variant19-report.md", report, "utf8");
  console.log("Отчет создан: variant19-report.md");
  console.log("График создан: output/graphs/variant19-approximations.svg");
}

main().catch((error) => {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
});
