import { verifySingleRoot } from "./analysis.js";
import { getEquationById, variant19EquationMethods } from "./data/equations.js";
import { getSystemById, variant19SystemMethods } from "./data/systems.js";
import { chordFixed, newton, simpleIterationEquation } from "./methods/equations.js";
import { newtonSystem } from "./methods/systems.js";
import { createEquationGraphSvg, createSystemGraphSvg } from "./plotting-core.js";
import { formatNumber, normalizeBounds, parseNumber, resultHeader } from "./utils.js";

const equationSolvers = {
  chord: chordFixed,
  newton,
  simpleIteration: simpleIterationEquation,
};

const systemSolvers = {
  newtonSystem,
};

const equationMethodLabels = Object.fromEntries(
  variant19EquationMethods.map((method) => [method.id, method.label]),
);

const systemMethodLabels = Object.fromEntries(
  variant19SystemMethods.map((method) => [method.id, method.label]),
);

function withPreview(error, preview) {
  error.preview = preview;
  return error;
}

function createEquationPreview(equation, a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
    return null;
  }

  const previewLeft = Math.min(a, b);
  const previewRight = Math.max(a, b);
  return {
    taskType: "equation",
    equation,
    graph: createEquationGraphSvg(equation, {
      a: previewLeft,
      b: previewRight,
    }),
  };
}

function parseEquationGraphInterval(config, fallbackA, fallbackB) {
  const graphConfig = config.graph ?? config.graphBounds;
  if (!graphConfig) {
    return [fallbackA, fallbackB];
  }

  const xMin = parseNumber(graphConfig.xMin, "xMin");
  const xMax = parseNumber(graphConfig.xMax, "xMax");
  if (!(xMin < xMax)) {
    throw new Error("Границы графика xMin/xMax заданы некорректно.");
  }
  return [xMin, xMax];
}

function getEquationHistoryColumns(method) {
  if (method === "chord") {
    return [
      { key: "iteration", label: "№" },
      { key: "fixed", label: "Фикс. конец" },
      { key: "moving", label: "Подвижный конец" },
      { key: "next", label: "Следующее x" },
      { key: "fFixed", label: "f(фикс.)" },
      { key: "fMoving", label: "f(подв.)" },
      { key: "fNext", label: "f(next)" },
      { key: "diff", label: "|Δx|" },
    ];
  }

  if (method === "newton") {
    return [
      { key: "iteration", label: "№" },
      { key: "x", label: "x(i)" },
      { key: "fx", label: "f(x)" },
      { key: "dfx", label: "f'(x)" },
      { key: "next", label: "x(i+1)" },
      { key: "diff", label: "|Δx|" },
      { key: "fNext", label: "f(x(i+1))" },
    ];
  }

  return [
    { key: "iteration", label: "№" },
    { key: "x", label: "x(i)" },
    { key: "next", label: "x(i+1)" },
    { key: "phiNext", label: "phi(x(i+1))" },
    { key: "diff", label: "|Δx|" },
    { key: "estimatedError", label: "Оценка погрешности" },
  ];
}

function getSystemHistoryColumns() {
  return [
    { key: "iteration", label: "№" },
    { key: "x", label: "x(i)" },
    { key: "y", label: "y(i)" },
    { key: "f1", label: "F1(x, y)" },
    { key: "f2", label: "F2(x, y)" },
    { key: "dx", label: "dx" },
    { key: "dy", label: "dy" },
    { key: "nextX", label: "x(i+1)" },
    { key: "nextY", label: "y(i+1)" },
    { key: "nextF1", label: "F1(next)" },
    { key: "nextF2", label: "F2(next)" },
  ];
}

export function formatEquationResultText(solution, graphReference = "inline") {
  const lines = [
    resultHeader("Результат для нелинейного уравнения"),
    `Уравнение: ${solution.equation.name}`,
    `Метод: ${solution.methodLabel}`,
    `Интервал: [${formatNumber(solution.interval[0], 6)}, ${formatNumber(solution.interval[1], 6)}]`,
    `Корень: ${formatNumber(solution.result.root, 10)}`,
    `f(x): ${formatNumber(solution.result.fx, 10)}`,
    `Число итераций: ${solution.result.iterations}`,
  ];

  if (solution.result.metadata?.fixedEndpoint !== undefined) {
    lines.push(`Фиксированный конец хорды: ${formatNumber(solution.result.metadata.fixedEndpoint, 6)}`);
  }
  if (solution.result.metadata?.q !== undefined) {
    lines.push(`Коэффициент сжатия q: ${formatNumber(solution.result.metadata.q, 6)}`);
  }
  if (solution.result.metadata?.lambda !== undefined) {
    lines.push(`Параметр lambda: ${formatNumber(solution.result.metadata.lambda, 6)}`);
  }

  lines.push(`График: ${graphReference}`);
  return lines.join("\n");
}

export function formatSystemResultText(solution, graphReference = "inline") {
  return [
    resultHeader("Результат для системы нелинейных уравнений"),
    `Система: ${solution.system.name}`,
    `Метод: ${solution.methodLabel}`,
    `x = ${formatNumber(solution.result.solution.x, 10)}`,
    `y = ${formatNumber(solution.result.solution.y, 10)}`,
    `F1(x, y) = ${formatNumber(solution.result.residuals[0], 10)}`,
    `F2(x, y) = ${formatNumber(solution.result.residuals[1], 10)}`,
    `Число итераций: ${solution.result.iterations}`,
    `График: ${graphReference}`,
  ].join("\n");
}

export function solveEquationTask(config) {
  const equation = getEquationById(config.equationId);
  let a;
  let b;
  let graphA;
  let graphB;
  let preview = null;

  try {
    a = parseNumber(config.interval?.a, "a");
    b = parseNumber(config.interval?.b, "b");
    [graphA, graphB] = parseEquationGraphInterval(config, a, b);
    preview = createEquationPreview(equation, graphA, graphB);
  } catch (error) {
    preview = createEquationPreview(equation, a, b);
    throw withPreview(error, preview);
  }

  let epsilon;
  try {
    epsilon = parseNumber(config.epsilon, "epsilon");
  } catch (error) {
    throw withPreview(error, preview);
  }

  if (!(a < b)) {
    throw withPreview(new Error("Левая граница интервала должна быть меньше правой."), preview);
  }
  if (!(epsilon > 0)) {
    throw withPreview(new Error("Точность должна быть положительной."), preview);
  }

  const solver = equationSolvers[config.method];
  if (!solver) {
    throw withPreview(new Error(`Метод "${config.method}" не поддерживается для варианта 19.`), preview);
  }

  try {
    const interval = verifySingleRoot(equation, a, b);
    const result = solver(equation, interval[0], interval[1], epsilon);
    const graph = createEquationGraphSvg(equation, {
      a: graphA,
      b: graphB,
      marker: {
        x: result.root,
        y: result.fx,
        label: `(${formatNumber(result.root, 4)}, ${formatNumber(result.fx, 4)})`,
      },
    });

    const solution = {
      taskType: "equation",
      equation,
      interval,
      result,
      graph,
      methodLabel: equationMethodLabels[result.method] ?? result.method,
      historyColumns: getEquationHistoryColumns(result.method),
    };

    return {
      ...solution,
      text: formatEquationResultText(solution),
    };
  } catch (error) {
    throw withPreview(error, preview);
  }
}

export function solveSystemTask(config) {
  const system = getSystemById(config.systemId);
  let bounds;
  let preview = null;

  try {
    bounds = normalizeBounds({
      xMin: parseNumber(config.bounds?.xMin, "xMin"),
      xMax: parseNumber(config.bounds?.xMax, "xMax"),
      yMin: parseNumber(config.bounds?.yMin, "yMin"),
      yMax: parseNumber(config.bounds?.yMax, "yMax"),
    });
    preview = {
      taskType: "system",
      system,
      graph: createSystemGraphSvg(system, { bounds }),
    };
  } catch (error) {
    throw withPreview(error, preview);
  }

  let epsilon;
  try {
    epsilon = parseNumber(config.epsilon, "epsilon");
  } catch (error) {
    throw withPreview(error, preview);
  }

  if (!(epsilon > 0)) {
    throw withPreview(new Error("Точность должна быть положительной."), preview);
  }

  let initial;
  try {
    initial = {
      x: parseNumber(config.initial?.x, "x0"),
      y: parseNumber(config.initial?.y, "y0"),
    };
  } catch (error) {
    throw withPreview(error, preview);
  }

  const solver = systemSolvers[config.method];
  if (!solver) {
    throw withPreview(new Error(`Метод "${config.method}" не поддерживается для варианта 19.`), preview);
  }

  try {
    const result = solver(system, initial, epsilon);
    const graph = createSystemGraphSvg(system, {
      bounds,
      marker: {
        x: result.solution.x,
        y: result.solution.y,
        label: `(${formatNumber(result.solution.x, 4)}, ${formatNumber(result.solution.y, 4)})`,
      },
    });

    const solution = {
      taskType: "system",
      system,
      bounds,
      initial,
      result,
      graph,
      methodLabel: systemMethodLabels[result.method] ?? result.method,
      historyColumns: getSystemHistoryColumns(),
    };

    return {
      ...solution,
      text: formatSystemResultText(solution),
    };
  } catch (error) {
    throw withPreview(error, preview);
  }
}
