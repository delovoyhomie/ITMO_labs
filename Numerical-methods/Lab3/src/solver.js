import {
  getFunctionEvaluator,
  getFunctionDefinition,
  integrationMethods,
} from "./data/functions.js";
import { integrateWithRunge } from "./runge.js";
import { investigateImproperIntegral } from "./methods/improper.js";
import { simpson } from "./methods/integration.js";
import { createIntegralGraphSvg } from "./plotting-core.js";
import { formatNumber, formatPercent, parseNumber, resultHeader } from "./utils.js";

const methodLabels = Object.fromEntries(integrationMethods.map((method) => [method.id, method.label]));

const REFERENCE_N = 200000;

function withPreview(error, preview) {
  error.preview = preview;
  return error;
}

function toFiniteNumber(value, fallback) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }
  const numeric = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function displayPartitions(method, n) {
  let count = Math.min(Math.max(n, 4), 12);
  if (method === "simpson" && count % 2 !== 0) {
    count += 1;
  }
  return count;
}

function buildGraphSource(taskType, evaluator, definition, a, b, graphConfig, overlay = null) {
  const viewRange = definition.view ?? [a, b];
  const bounds = {
    xMin: toFiniteNumber(graphConfig?.xMin, viewRange[0]),
    xMax: toFiniteNumber(graphConfig?.xMax, viewRange[1]),
  };
  if (!(bounds.xMin < bounds.xMax)) {
    [bounds.xMin, bounds.xMax] = [viewRange[0], viewRange[1]];
  }
  const graph = createIntegralGraphSvg(evaluator, {
    a,
    b,
    bounds: { xMin: bounds.xMin, xMax: bounds.xMax },
    viewRange,
    yClip: definition.yClip,
    overlay,
  });
  return {
    taskType,
    evaluator,
    a,
    b,
    viewRange,
    yClip: definition.yClip,
    overlay,
    graph,
  };
}

function referenceValue(evaluator, a, b) {
  if (evaluator.hasAntiderivative()) {
    return { value: evaluator.exactIntegral(a, b), kind: "exact" };
  }
  return { value: simpson(evaluator, a, b, REFERENCE_N), kind: "numeric" };
}

function computeErrors(approximate, reference) {
  if (reference === null || !Number.isFinite(reference)) {
    return { absolute: null, relative: null };
  }
  const absolute = Math.abs(reference - approximate);
  const relative = Math.abs(reference) > 1e-15 ? absolute / Math.abs(reference) : null;
  return { absolute, relative };
}

export const properHistoryColumns = [
  { key: "step", label: "Шаг" },
  { key: "n", label: "n" },
  { key: "h", label: "h" },
  { key: "value", label: "Iₙ" },
  { key: "runge", label: "Оценка Рунге R" },
];

export const improperHistoryColumns = [
  { key: "step", label: "Шаг" },
  { key: "sigma", label: "σ" },
  { key: "value", label: "J(σ)" },
  { key: "delta", label: "|ΔJ|" },
];

function formatProperText(solution) {
  const { reference } = solution;
  const lines = [
    resultHeader("Определённый интеграл"),
    `Функция: f(x) = ${solution.evaluator.name}`,
    `Метод: ${solution.methodLabel}`,
    `Пределы: [${formatNumber(solution.a, 6)}, ${formatNumber(solution.b, 6)}]`,
    `Требуемая точность ε: ${formatNumber(solution.epsilon, 8)}`,
    "",
    `Значение интеграла: ${formatNumber(solution.value, 8)}`,
    `Число разбиений n: ${solution.n}`,
    `Шаг h: ${formatNumber((solution.b - solution.a) / solution.n, 8)}`,
    `Оценка погрешности по Рунге: ${formatNumber(solution.runge, 8)}`,
  ];

  if (reference.value !== null) {
    lines.push(
      reference.kind === "exact"
        ? `Точное значение (Ньютон — Лейбниц): ${formatNumber(reference.value, 8)}`
        : `Эталонное значение (численно): ${formatNumber(reference.value, 8)}`,
    );
    if (solution.errors.absolute !== null) {
      lines.push(`Абсолютная погрешность: ${formatNumber(solution.errors.absolute, 8)}`);
    }
    if (solution.errors.relative !== null) {
      lines.push(`Относительная погрешность: ${formatPercent(solution.errors.relative, 6)}`);
    }
  }

  return lines.join("\n");
}

function formatImproperText(solution) {
  const lines = [
    resultHeader("Несобственный интеграл 2 рода"),
    `Функция: f(x) = ${solution.evaluator.name}`,
    `Метод: ${solution.methodLabel}`,
    `Пределы: [${formatNumber(solution.a, 6)}, ${formatNumber(solution.b, 6)}]`,
    `Особые точки: ${solution.singularPoints.map((x) => formatNumber(x, 4)).join(", ")}`,
    `Требуемая точность ε: ${formatNumber(solution.epsilon, 8)}`,
    "",
    solution.converges ? "Вывод: интеграл СХОДИТСЯ." : "Вывод: ИНТЕГРАЛ НЕ СУЩЕСТВУЕТ (расходится).",
    solution.message,
  ];

  if (solution.converges) {
    lines.push("", `Значение интеграла: ${formatNumber(solution.value, 8)}`);
    if (solution.reference.value !== null) {
      lines.push(`Точное значение: ${formatNumber(solution.reference.value, 8)}`);
      if (solution.errors.absolute !== null) {
        lines.push(`Абсолютная погрешность: ${formatNumber(solution.errors.absolute, 8)}`);
      }
    }
  }

  return lines.join("\n");
}

export function solveProperIntegral(config) {
  const definition = getFunctionDefinition(config.functionId);
  if (!definition) {
    throw new Error(`Функция с id "${config.functionId}" не найдена.`);
  }
  const evaluator = getFunctionEvaluator(config.functionId);

  let a;
  let b;
  let epsilon;
  let preview = null;

  try {
    a = parseNumber(config.a, "a");
    b = parseNumber(config.b, "b");
    preview = buildGraphSource("proper", evaluator, definition, Math.min(a, b), Math.max(a, b), config.graph);
  } catch (error) {
    throw withPreview(error, preview);
  }

  try {
    epsilon = parseNumber(config.epsilon, "epsilon");
  } catch (error) {
    throw withPreview(error, preview);
  }

  if (!(a < b)) {
    throw withPreview(new Error("Левый предел a должен быть меньше правого предела b."), preview);
  }
  if (!(epsilon > 0)) {
    throw withPreview(new Error("Точность ε должна быть положительной."), preview);
  }
  if (!methodLabels[config.method]) {
    throw withPreview(new Error(`Метод "${config.method}" не поддерживается.`), preview);
  }

  try {
    const result = integrateWithRunge(config.method, evaluator, a, b, epsilon);
    const reference = referenceValue(evaluator, a, b);
    const errors = computeErrors(result.value, reference.value);
    const partitionCount = displayPartitions(config.method, result.n);
    const overlay = {
      method: config.method,
      partitionCount,
      label: `${methodLabels[config.method]} · схема N=${partitionCount}`,
    };
    const source = buildGraphSource("proper", evaluator, definition, a, b, config.graph, overlay);

    const solution = {
      taskType: "proper",
      evaluator,
      definition,
      a,
      b,
      epsilon,
      method: config.method,
      methodLabel: methodLabels[config.method],
      value: result.value,
      n: result.n,
      runge: result.runge,
      iterations: result.iterations,
      order: result.order,
      reference,
      errors,
      history: result.history,
      historyColumns: properHistoryColumns,
      ...source,
    };

    return { ...solution, text: formatProperText(solution) };
  } catch (error) {
    throw withPreview(error, preview);
  }
}

export function solveImproperIntegral(config) {
  const definition = getFunctionDefinition(config.functionId);
  if (!definition) {
    throw new Error(`Функция с id "${config.functionId}" не найдена.`);
  }
  const evaluator = getFunctionEvaluator(config.functionId);

  let a;
  let b;
  let epsilon;
  let preview = null;

  try {
    a = parseNumber(config.a, "a");
    b = parseNumber(config.b, "b");
    preview = buildGraphSource("improper", evaluator, definition, Math.min(a, b), Math.max(a, b), config.graph);
  } catch (error) {
    throw withPreview(error, preview);
  }

  try {
    epsilon = parseNumber(config.epsilon, "epsilon");
  } catch (error) {
    throw withPreview(error, preview);
  }

  if (!(a < b)) {
    throw withPreview(new Error("Левый предел a должен быть меньше правого предела b."), preview);
  }
  if (!(epsilon > 0)) {
    throw withPreview(new Error("Точность ε должна быть положительной."), preview);
  }
  if (!methodLabels[config.method]) {
    throw withPreview(new Error(`Метод "${config.method}" не поддерживается.`), preview);
  }

  try {
    const investigation = investigateImproperIntegral(config.method, evaluator, a, b, epsilon);
    const reference =
      investigation.converges && evaluator.hasAntiderivative()
        ? { value: evaluator.exactIntegral(a, b), kind: "exact" }
        : { value: null, kind: "none" };
    const errors = investigation.converges ? computeErrors(investigation.value, reference.value) : { absolute: null, relative: null };
    const source = buildGraphSource("improper", evaluator, definition, a, b, config.graph);

    const solution = {
      taskType: "improper",
      evaluator,
      definition,
      a,
      b,
      epsilon,
      method: config.method,
      methodLabel: methodLabels[config.method],
      converges: investigation.converges,
      value: investigation.value,
      message: investigation.message,
      singularPoints: investigation.singularPoints,
      reference,
      errors,
      history: investigation.history,
      historyColumns: improperHistoryColumns,
      ...source,
    };

    return { ...solution, text: formatImproperText(solution) };
  } catch (error) {
    throw withPreview(error, preview);
  }
}

export function solveIntegralTask(config) {
  return config.taskType === "improper" ? solveImproperIntegral(config) : solveProperIntegral(config);
}
