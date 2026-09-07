import path from "node:path";

import { getFunctionEvaluator } from "./data/functions.js";
import {
  middleRectangles,
  trapezoidal,
  simpson,
  newtonCotes,
  buildNodeTable,
  cotesNumerators,
  cotesDenominators,
} from "./methods/integration.js";
import { solveProperIntegral, solveImproperIntegral } from "./solver.js";
import { writeTextFile } from "./io.js";
import { toMarkdownNumber, formatPercent } from "./utils.js";

function markdownTable(headers, rows) {
  const headerRow = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return [headerRow, separator, body].join("\n");
}

function relativeError(approximate, exact) {
  if (Math.abs(exact) < 1e-15) {
    return Math.abs(approximate - exact);
  }
  return Math.abs(approximate - exact) / Math.abs(exact);
}

function buildReport() {
  const evaluator = getFunctionEvaluator("variant19_poly");
  const a = 2;
  const b = 4;
  const exact = evaluator.exactIntegral(a, b);

  const nNewtonCotes = 6;
  const nodesNC = buildNodeTable(evaluator, a, b, nNewtonCotes);
  const cotesValue = newtonCotes(evaluator, a, b, nNewtonCotes);

  const nMethods = 10;
  const nodes10 = buildNodeTable(evaluator, a, b, nMethods);
  const middleValue = middleRectangles(evaluator, a, b, nMethods);
  const trapezoidValue = trapezoidal(evaluator, a, b, nMethods);
  const simpsonValue = simpson(evaluator, a, b, nMethods);

  const comparison = [
    ["Точное значение (Ньютон — Лейбниц)", exact, 0],
    ["Ньютон — Котес, n = 6", cotesValue, relativeError(cotesValue, exact)],
    ["Средние прямоугольники, n = 10", middleValue, relativeError(middleValue, exact)],
    ["Трапеции, n = 10", trapezoidValue, relativeError(trapezoidValue, exact)],
    ["Симпсон, n = 10", simpsonValue, relativeError(simpsonValue, exact)],
  ];

  const epsilon = 1e-4;
  const programMethods = ["leftRect", "rightRect", "middleRect", "trapezoid", "simpson"];
  const programRows = programMethods.map((method) => {
    const solution = solveProperIntegral({ functionId: "variant19_poly", method, a, b, epsilon });
    return [
      solution.methodLabel,
      toMarkdownNumber(solution.value, 6),
      String(solution.n),
      toMarkdownNumber(solution.runge, 8),
      toMarkdownNumber(solution.errors.absolute, 8),
    ];
  });

  const improperCases = [
    { id: "inv_sqrt_x", a: 0, b: 1 },
    { id: "inv_one_minus_x", a: 0, b: 1 },
    { id: "inv_cbrt_interior", a: 1, b: 3 },
  ];
  const improperRows = improperCases.map((item) => {
    const solution = solveImproperIntegral({
      functionId: item.id,
      method: "simpson",
      a: item.a,
      b: item.b,
      epsilon: 1e-3,
    });
    return [
      `f(x) = ${solution.evaluator.name}`,
      `[${item.a}; ${item.b}]`,
      solution.singularPoints.map((x) => toMarkdownNumber(x, 2)).join(", "),
      solution.converges ? "сходится" : "расходится",
      solution.converges ? toMarkdownNumber(solution.value, 6) : "Интеграл не существует",
    ];
  });

  const cotesWeights = cotesNumerators[nNewtonCotes];
  const cotesDenominator = cotesDenominators[nNewtonCotes];

  const content = [
    "# Лабораторная работа №3. Численное интегрирование",
    "",
    "## Вариант 19",
    "",
    "Интеграл вычислительной части: `∫ от 2 до 4 (x³ − 3x² + 6x − 19) dx`.",
    "",
    "## Цель работы",
    "",
    "Найти приближённое значение определённого интеграла с требуемой точностью различными численными методами (прямоугольников, трапеций, Симпсона) и сравнить результаты с точным значением.",
    "",
    "## Порядок выполнения работы",
    "",
    "1. Пользователь выбирает функцию из предлагаемых программой (5 определённых и 3 несобственных интеграла 2 рода).",
    "2. Задаются пределы интегрирования, метод и требуемая точность ε; начальное число разбиений `n = 4`.",
    "3. Значения функции вычисляются отдельным классом `FunctionEvaluator`, методы интегрирования — отдельными функциями.",
    "4. Число разбиений подбирается автоматически по правилу Рунге до достижения точности ε.",
    "5. Выводятся: значение интеграла, число разбиений n, оценка погрешности, сравнение с точным значением.",
    "",
    "## Рабочие формулы методов",
    "",
    "Шаг сетки: `h = (b − a) / n`, узлы `x_i = a + i·h`, значения `y_i = f(x_i)`.",
    "",
    "- Левые прямоугольники: `I = h · (y_0 + y_1 + … + y_{n−1})`.",
    "- Правые прямоугольники: `I = h · (y_1 + y_2 + … + y_n)`.",
    "- Средние прямоугольники: `I = h · Σ f(x_{i−1/2})`, где `x_{i−1/2} = x_{i−1} + h/2`.",
    "- Трапеции: `I = h · ((y_0 + y_n)/2 + y_1 + … + y_{n−1})`.",
    "- Симпсон (n чётное): `I = h/3 · (y_0 + y_n + 4·Σ_нечёт y_i + 2·Σ_чёт y_i)`.",
    `- Ньютон — Котес порядка n: \`I = (n·h / C_n) · Σ c_n^i · f(x_i)\`. Для n = 6: C_6 = ${cotesDenominator}, коэффициенты [${cotesWeights.join(", ")}].`,
    "",
    "Правило Рунге для оценки погрешности и остановки: `R = |I_{h/2} − I_h| / (2^k − 1)`, где k — порядок точности метода (k = 1 для левых/правых прямоугольников, k = 2 для средних прямоугольников и трапеций, k = 4 для Симпсона). Вычисления продолжаются с удвоением n, пока R > ε.",
    "",
    "## Вычислительная часть",
    "",
    `Точное значение по формуле Ньютона — Лейбница: F(x) = x⁴/4 − x³ + 3x² − 19x, откуда **I = F(4) − F(2) = ${toMarkdownNumber(exact, 6)}**.`,
    "",
    "### Узлы для формулы Ньютона — Котеса (n = 6)",
    "",
    markdownTable(
      ["i", "x_i", "f(x_i)"],
      nodesNC.map((row) => [String(row.i), toMarkdownNumber(row.x, 5), toMarkdownNumber(row.y, 5)]),
    ),
    "",
    `Приближённое значение по формуле Ньютона — Котеса при n = 6: **${toMarkdownNumber(cotesValue, 6)}**.`,
    "",
    "### Узлы для формул прямоугольников, трапеций и Симпсона (n = 10)",
    "",
    markdownTable(
      ["i", "x_i", "f(x_i)"],
      nodes10.map((row) => [String(row.i), toMarkdownNumber(row.x, 5), toMarkdownNumber(row.y, 5)]),
    ),
    "",
    "### Сравнение результатов и относительная погрешность",
    "",
    markdownTable(
      ["Метод / величина", "Значение", "Относительная погрешность"],
      comparison.map(([label, value, rel]) => [
        label,
        toMarkdownNumber(value, 6),
        label.startsWith("Точное") ? "—" : formatPercent(rel, 6),
      ]),
    ),
    "",
    "## Программная часть. Автоматический выбор n по правилу Рунге (ε = 1·10⁻⁴)",
    "",
    markdownTable(
      ["Метод", "Значение интеграла", "n", "Оценка Рунге R", "Абс. погрешность"],
      programRows,
    ),
    "",
    "## Необязательная часть. Несобственные интегралы 2 рода",
    "",
    "Программа определяет сходимость несобственного интеграла; для расходящегося выводится сообщение «Интеграл не существует». Рассмотрены три случая бесконечного разрыва: в точке a, в точке b и во внутренней точке отрезка.",
    "",
    markdownTable(
      ["Функция", "Отрезок", "Особые точки", "Сходимость", "Значение"],
      improperRows,
    ),
    "",
    "## Выводы",
    "",
    "- Формула Симпсона и формула Ньютона — Котеса для многочлена степени 3 дают точное значение интеграла (погрешность практически нулевая), так как точны для многочленов соответствующей степени.",
    "- Формулы средних прямоугольников и трапеций имеют второй порядок точности O(h²); при n = 10 их погрешность мала, но заметно больше, чем у Симпсона.",
    "- Левые и правые прямоугольники (первый порядок точности) сходятся медленнее всего и требуют наибольшего числа разбиений n для достижения заданной точности.",
    "- Правило Рунге позволяет оценивать погрешность и автоматически подбирать число разбиений без вычисления производных подынтегральной функции.",
    "- Для несобственных интегралов 2 рода программа корректно различает сходящиеся и расходящиеся интегралы и вычисляет значение сходящихся.",
    "",
    "## Как запустить",
    "",
    "- Веб-интерфейс: `npm run gui`, затем открыть `http://127.0.0.1:4174`.",
    "- Консольное приложение: `npm start`.",
    "- Генерация этого отчёта: `npm run report`.",
    "",
  ].join("\n");

  const reportPath = path.resolve("variant19-report.md");
  writeTextFile(reportPath, content);

  console.log("Точное значение:", exact);
  console.log("Ньютон — Котес n=6:", cotesValue);
  console.log("Средние прямоугольники n=10:", middleValue, "отн.", formatPercent(relativeError(middleValue, exact), 6));
  console.log("Трапеции n=10:", trapezoidValue, "отн.", formatPercent(relativeError(trapezoidValue, exact), 6));
  console.log("Симпсон n=10:", simpsonValue, "отн.", formatPercent(relativeError(simpsonValue, exact), 6));
  console.log("Программная часть (Рунге):");
  for (const row of programRows) {
    console.log("  ", row.join(" | "));
  }
  return reportPath;
}

const reportPath = buildReport();
console.log(`\nОтчёт сохранён: ${reportPath}`);
