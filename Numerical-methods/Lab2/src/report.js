import path from "node:path";

import { getEquationById } from "./data/equations.js";
import { getSystemById } from "./data/systems.js";
import { bisection, secant, simpleIterationEquation } from "./methods/equations.js";
import { simpleIterationSystem } from "./methods/systems.js";
import { createEquationGraph, createSystemGraph } from "./plotting.js";
import { writeTextFile } from "./io.js";
import { toMarkdownNumber } from "./utils.js";

function markdownTable(headers, rows) {
  const headerRow = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return [headerRow, separator, body].join("\n");
}

function mapHistoryToRows(history, mapper) {
  return history.map((item) => mapper(item).map((value) => (typeof value === "number" ? toMarkdownNumber(value) : value)));
}

function mermaidBlock(lines) {
  return ["```mermaid", ...lines, "```"].join("\n");
}

function buildReport() {
  const equation = getEquationById("variant19_poly");
  const system = getSystemById("variant19_system");
  const epsilon = 0.01;

  const leftInterval = [-1.5, -1.25];
  const middleInterval = [0.0, 1.0];
  const rightInterval = [1.5, 2.0];

  const leftResult = bisection(equation, leftInterval[0], leftInterval[1], epsilon);
  const middleResult = secant(equation, middleInterval[0], middleInterval[1], epsilon);
  const rightResult = simpleIterationEquation(equation, rightInterval[0], rightInterval[1], epsilon);

  const systemBounds = {
    xMin: 0.5,
    xMax: 0.65,
    yMin: 1.75,
    yMax: 1.85,
  };
  const systemResult = simpleIterationSystem(system, { x: 0.5, y: 1.75 }, epsilon, systemBounds);

  const equationGraph = path.resolve("output/graphs/report-variant19-equation.svg");
  const systemGraph = path.resolve("output/graphs/report-variant19-system.svg");

  createEquationGraph(equation, {
    a: -3,
    b: 3,
    outputFile: equationGraph,
  });
  createSystemGraph(system, {
    bounds: {
      xMin: 0.3,
      xMax: 0.9,
      yMin: 1.5,
      yMax: 2.0,
    },
    outputFile: systemGraph,
  });

  const content = [
    "# Лабораторная работа №2",
    "",
    "## Вариант 19",
    "",
    "Программная часть варианта 19 требует реализовать методы `2, 3, 5, 6`, то есть метод хорд, метод Ньютона, метод простой итерации для одного уравнения и метод Ньютона для системы. В проекте дополнительно реализованы методы, необходимые для вычислительной части отчёта.",
    "",
    "## Вычислительная часть 1. Нелинейное уравнение",
    "",
    `Уравнение: \\(f(x) = ${equation.name}\\)`,
    "",
    "Графическое отделение корней на интервале `[-3; 3]` даёт три интервала изоляции:",
    "",
    `1. Левый корень: [${toMarkdownNumber(leftInterval[0])}; ${toMarkdownNumber(leftInterval[1])}]`,
    `2. Центральный корень: [${toMarkdownNumber(middleInterval[0])}; ${toMarkdownNumber(middleInterval[1])}]`,
    `3. Правый корень: [${toMarkdownNumber(rightInterval[0])}; ${toMarkdownNumber(rightInterval[1])}]`,
    "",
    `График сохранён в [output/graphs/report-variant19-equation.svg](${equationGraph})`,
    "",
    "### Рабочие формулы",
    "",
    "Метод половинного деления: `x = (a + b) / 2`.",
    "",
    "Метод секущих: `x_(n+1) = x_n - f(x_n) * (x_n - x_(n-1)) / (f(x_n) - f(x_(n-1)))`.",
    "",
    "Метод простой итерации: `x_(n+1) = phi(x_n) = x_n + lambda * f(x_n)`, где `q = max|phi'(x)| < 1`.",
    "",
    "## Блок-схемы методов",
    "",
    "### Метод хорд",
    "",
    mermaidBlock([
      "flowchart TD",
      "    A[Ввод: f(x), интервал [a, b], epsilon] --> B[Выбрать фиксированный и подвижный конец]",
      "    B --> C[Вычислить следующее приближение x_next]",
      "    C --> D{ |x_next - x| <= epsilon или |f(x_next)| <= epsilon? }",
      "    D -- Да --> E[Вывести корень, f(x), число итераций]",
      "    D -- Нет --> F[Сделать x = x_next]",
      "    F --> C",
    ]),
    "",
    "### Метод Ньютона",
    "",
    mermaidBlock([
      "flowchart TD",
      "    A[Ввод: f(x), f'(x), интервал [a, b], epsilon] --> B[Выбрать начальное приближение x0]",
      "    B --> C[Вычислить x_next = x - f(x) / f'(x)]",
      "    C --> D{ |x_next - x| <= epsilon или |f(x_next)| <= epsilon? }",
      "    D -- Да --> E[Вывести корень, f(x), число итераций]",
      "    D -- Нет --> F[Сделать x = x_next]",
      "    F --> C",
    ]),
    "",
    "### Метод простой итерации",
    "",
    mermaidBlock([
      "flowchart TD",
      "    A[Ввод: f(x), интервал [a, b], epsilon] --> B[Построить phi(x) и оценить q]",
      "    B --> C{ q < 1? }",
      "    C -- Нет --> D[Сообщить, что условие сходимости не выполнено]",
      "    C -- Да --> E[Взять начальное приближение x0]",
      "    E --> F[Вычислить x_next = phi(x)]",
      "    F --> G[Оценить погрешность]",
      "    G --> H{ погрешность <= epsilon? }",
      "    H -- Да --> I[Вывести корень, f(x), число итераций]",
      "    H -- Нет --> J[Сделать x = x_next]",
      "    J --> F",
    ]),
    "",
    "### Метод Ньютона для системы",
    "",
    mermaidBlock([
      "flowchart TD",
      "    A[Ввод: F1(x, y), F2(x, y), начальное приближение, epsilon] --> B[Вычислить Якобиан]",
      "    B --> C[Решить линейную систему для dx и dy]",
      "    C --> D[Получить x_next = x + dx, y_next = y + dy]",
      "    D --> E{ max(|dx|, |dy|) <= epsilon? }",
      "    E -- Да --> F[Вывести x, y, невязки и число итераций]",
      "    E -- Нет --> G[Сделать x = x_next, y = y_next]",
      "    G --> B",
    ]),
    "",
    "### Левый корень. Метод половинного деления",
    "",
    `Получено: x = ${toMarkdownNumber(leftResult.root, 6)}, f(x) = ${toMarkdownNumber(leftResult.fx, 6)}, итераций = ${leftResult.iterations}.`,
    "",
    markdownTable(
      ["№", "a", "b", "x", "f(a)", "f(b)", "f(x)", "|b-a|"],
      mapHistoryToRows(leftResult.history, (row) => [
        row.iteration,
        row.a,
        row.b,
        row.x,
        row.fa,
        row.fb,
        row.fx,
        row.diff,
      ]),
    ),
    "",
    "### Центральный корень. Метод секущих",
    "",
    `Получено: x = ${toMarkdownNumber(middleResult.root, 6)}, f(x) = ${toMarkdownNumber(middleResult.fx, 6)}, итераций = ${middleResult.iterations}.`,
    "",
    markdownTable(
      ["№", "x(i-1)", "x(i)", "x(i+1)", "f(x(i+1))", "|x(i+1)-x(i)|"],
      mapHistoryToRows(middleResult.history, (row) => [
        row.iteration,
        row.xPrev,
        row.x,
        row.next,
        row.fNext,
        row.diff,
      ]),
    ),
    "",
    "### Правый корень. Метод простой итерации",
    "",
    `Получено: x = ${toMarkdownNumber(rightResult.root, 6)}, f(x) = ${toMarkdownNumber(rightResult.fx, 6)}, итераций = ${rightResult.iterations}, q = ${toMarkdownNumber(rightResult.metadata.q, 6)}.`,
    "",
    markdownTable(
      ["№", "x(i)", "x(i+1)", "phi(x(i+1))", "|x(i+1)-x(i)|", "Оценка погрешности"],
      mapHistoryToRows(rightResult.history, (row) => [
        row.iteration,
        row.x,
        row.next,
        row.phiNext,
        row.diff,
        row.estimatedError,
      ]),
    ),
    "",
    "## Вычислительная часть 2. Система нелинейных уравнений",
    "",
    "Вариант 19 из таблицы 8:",
    "",
    "```text",
    "sin(y - 1) + x = 1.3",
    "y - sin(x + 1) = 0.8",
    "```",
    "",
    "Указанный в задании метод: простая итерация.",
    "",
    "Итерационная форма:",
    "",
    "```text",
    "x = 1.3 - sin(y - 1)",
    "y = 0.8 + sin(x + 1)",
    "```",
    "",
    `На прямоугольнике [${systemBounds.xMin}; ${systemBounds.xMax}] x [${systemBounds.yMin}; ${systemBounds.yMax}] получаем q = ${toMarkdownNumber(systemResult.metadata.q, 6)} < 1.`,
    "",
    `Решение: x = ${toMarkdownNumber(systemResult.solution.x, 6)}, y = ${toMarkdownNumber(systemResult.solution.y, 6)}.`,
    "",
    `Проверка: F1 = ${toMarkdownNumber(systemResult.residuals[0], 6)}, F2 = ${toMarkdownNumber(systemResult.residuals[1], 6)}.`,
    "",
    `График сохранён в [output/graphs/report-variant19-system.svg](${systemGraph})`,
    "",
    markdownTable(
      ["№", "x(i)", "y(i)", "x(i+1)", "y(i+1)", "max diff", "Оценка погрешности"],
      mapHistoryToRows(systemResult.history, (row) => [
        row.iteration,
        row.x,
        row.y,
        row.nextX,
        row.nextY,
        Math.max(row.diffX, row.diffY),
        row.estimatedError,
      ]),
    ),
    "",
    "## Программная часть",
    "",
    "CLI-приложение поддерживает:",
    "",
    "1. Выбор одного из 5 уравнений, включая трансцендентные.",
    "2. Выбор одной из 3 систем нелинейных уравнений.",
    "3. Ввод данных с клавиатуры или из JSON-файла.",
    "4. Верификацию интервала изоляции корня.",
    "5. Вывод результата на экран или в файл.",
    "6. Генерацию SVG-графиков для уравнений и систем.",
    "",
    "## Где смотреть",
    "",
    "- Основной CLI: `npm start`",
    "- Готовый отчёт: `variant19-report.md`",
    "- Пример запуска с файла: `npm run demo:equation`, `npm run demo:system`",
    "",
  ].join("\n");

  const reportPath = path.resolve("variant19-report.md");
  writeTextFile(reportPath, content);
  return reportPath;
}

const reportPath = buildReport();
console.log(`Отчёт сохранён: ${reportPath}`);
