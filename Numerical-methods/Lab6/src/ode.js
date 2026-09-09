import { parseNumber } from "./utils.js";

// Каждое уравнение задаётся правой частью f(x, y) и точным решением задачи Коши.
// exact(x0, y0) возвращает функцию y(x) либо null, если условие недопустимо.
export const EQUATIONS = [
  {
    id: "linear",
    label: "y' = y",
    solutionLabel: "y = y₀·e^(x−x₀)",
    f: (x, y) => y,
    exact: (x0, y0) => x => y0 * Math.exp(x - x0),
  },
  {
    id: "sum",
    label: "y' = x + y",
    solutionLabel: "y = (y₀+x₀+1)·e^(x−x₀) − x − 1",
    f: (x, y) => x + y,
    exact: (x0, y0) => x => (y0 + x0 + 1) * Math.exp(x - x0) - x - 1,
  },
  {
    id: "square",
    label: "y' = y − x² + 1",
    solutionLabel: "y = (x+1)² + C·e^x,  C = (y₀−(x₀+1)²)·e^(−x₀)",
    f: (x, y) => y - x * x + 1,
    exact: (x0, y0) => {
      const c = (y0 - (x0 + 1) ** 2) * Math.exp(-x0);
      return x => (x + 1) ** 2 + c * Math.exp(x);
    },
  },
  {
    id: "bernoulli",
    label: "y' = y + (1+x)·y²",
    solutionLabel: "y = 1/(C·e^(−x) − x),  C = e^(x₀)·(1/y₀ + x₀)",
    note: "Пример 1 из лекции: y(1) = −1 на [1; 1.5] даёт y = −1/x.",
    f: (x, y) => y + (1 + x) * y * y,
    exact: (x0, y0) => {
      if (y0 === 0) return x => 0;
      const c = Math.exp(x0) * (1 / y0 + x0);
      return x => {
        const denominator = c * Math.exp(-x) - x;
        return denominator === 0 ? Number.NaN : 1 / denominator;
      };
    },
    singularity: (x0, y0, xn) => {
      if (y0 === 0) return null;
      const c = Math.exp(x0) * (1 / y0 + x0);
      const denominator = x => c * Math.exp(-x) - x;
      const points = [x0, xn];
      if (c < 0) {
        const critical = Math.log(-c);
        if (critical > x0 && critical < xn) points.push(critical);
      }
      points.sort((a, b) => a - b);
      for (let i = 0; i < points.length; i++) {
        const value = denominator(points[i]);
        if (Math.abs(value) <= 1e-12 * Math.max(1, Math.abs(points[i]))) return points[i];
        if (i === 0) continue;
        let left = points[i - 1], right = points[i];
        let leftValue = denominator(left), rightValue = value;
        if (Math.sign(leftValue) === Math.sign(rightValue)) continue;
        for (let iteration = 0; iteration < 80; iteration++) {
          const middle = (left + right) / 2;
          const middleValue = denominator(middle);
          if (Math.sign(middleValue) === Math.sign(leftValue)) {
            left = middle; leftValue = middleValue;
          } else {
            right = middle; rightValue = middleValue;
          }
        }
        return (left + right) / 2;
      }
      return null;
    },
  },
  {
    id: "gauss",
    label: "y' = −2·x·y",
    solutionLabel: "y = y₀·e^(x₀²−x²)",
    f: (x, y) => -2 * x * y,
    exact: (x0, y0) => x => y0 * Math.exp(x0 * x0 - x * x),
  },
];

export const MAX_NODES = 200000;
export const MAX_REFINEMENTS = 20;

// Принимает идентификатор либо само уравнение, поэтому validateProblem идемпотентна.
export function findEquation(id) {
  if (id && typeof id === "object") id = id.id;
  const equation = EQUATIONS.find(item => item.id === id);
  if (!equation) throw new Error(`Неизвестное уравнение «${id}». Доступны: ${EQUATIONS.map(e => e.id).join(", ")}.`);
  return equation;
}

export function validateProblem(input) {
  if (!input || typeof input !== "object") throw new Error("Требуется описание задачи Коши.");
  const equation = findEquation(input.equation ?? input.equationId);
  const x0 = parseNumber(input.x0, "x₀");
  const y0 = parseNumber(input.y0, "y₀");
  const xn = parseNumber(input.xn, "xn");
  const requestedH = parseNumber(input.requestedH ?? input.h, "Шаг h");
  const epsilon = parseNumber(input.epsilon ?? 1e-6, "Точность ε");
  if (xn <= x0) throw new Error("Правая граница xn должна быть больше x₀.");
  if (requestedH <= 0) throw new Error("Шаг h должен быть положительным.");
  if (requestedH > xn - x0) throw new Error("Шаг h не должен превышать длину интервала.");
  if (epsilon <= 0) throw new Error("Точность ε должна быть положительной.");
  if (epsilon >= 1) throw new Error("Точность ε должна быть меньше единицы.");
  const count = gridStepCount(x0, xn, requestedH);
  if (count + 1 > MAX_NODES) throw new Error(`Слишком мелкий шаг: узлов больше ${MAX_NODES}.`);
  const h = (xn - x0) / count;
  gridNodes(x0, xn, h);
  const singularity = equation.singularity?.(x0, y0, xn);
  if (Number.isFinite(singularity)) {
    throw new Error(`Точное решение имеет полюс внутри интервала около x = ${singularity.toPrecision(8)}. Измените начальные условия или интервал.`);
  }
  const problem = { equation, x0, y0, xn, h, requestedH, epsilon };
  const first = equation.f(x0, y0);
  if (!Number.isFinite(first)) throw new Error("Правая часть не определена в начальной точке.");
  return problem;
}

function gridStepCount(x0, xn, h) {
  const ratio = (xn - x0) / h;
  const nearest = Math.round(ratio);
  const almostInteger = Math.abs(ratio - nearest) <= 1e-12 * Math.max(1, Math.abs(ratio));
  return Math.max(1, almostInteger ? nearest : Math.ceil(ratio));
}

// Сетка всегда равномерная, содержит обе границы, а её фактический шаг не больше заданного.
export function gridNodes(x0, xn, h) {
  const count = gridStepCount(x0, xn, h);
  const step = (xn - x0) / count;
  const nodes = Array.from({ length: count + 1 }, (_, i) => i === count ? xn : x0 + i * step);
  for (let i = 1; i < nodes.length; i++) {
    if (!(nodes[i] > nodes[i - 1])) throw new Error("Шаг неразличим в машинной арифметике при заданном x₀.");
  }
  return nodes;
}

function guard(value, method, x) {
  if (!Number.isFinite(value)) {
    throw new Error(`${method}: решение ушло в бесконечность около x = ${x.toPrecision(6)}. Уменьшите шаг или интервал.`);
  }
  return value;
}

// ------------------------- Одношаговые методы -------------------------

// Метод Эйлера: y_{i+1} = y_i + h·f(x_i, y_i). Порядок точности p = 1.
export function euler(f, x0, y0, xn, h) {
  const nodes = gridNodes(x0, xn, h);
  const values = [y0];
  for (let i = 1; i < nodes.length; i++) {
    const step = nodes[i] - nodes[i - 1];
    values.push(guard(values[i - 1] + step * f(nodes[i - 1], values[i - 1]), "Метод Эйлера", nodes[i]));
  }
  return { nodes, values };
}

// Усовершенствованный метод Эйлера (метод Эйлера с пересчётом), p = 2.
// Реализован для сравнения; в вариант 19 не входит.
export function improvedEuler(f, x0, y0, xn, h) {
  const nodes = gridNodes(x0, xn, h);
  const values = [y0];
  for (let i = 1; i < nodes.length; i++) {
    const step = nodes[i] - nodes[i - 1];
    const slope = f(nodes[i - 1], values[i - 1]);
    const predictor = values[i - 1] + step * slope;
    const next = values[i - 1] + step / 2 * (slope + f(nodes[i], predictor));
    values.push(guard(next, "Усовершенствованный метод Эйлера", nodes[i]));
  }
  return { nodes, values };
}

// Метод Рунге-Кутта 4-го порядка, p = 4.
export function rungeKutta4(f, x0, y0, xn, h) {
  const nodes = gridNodes(x0, xn, h);
  const values = [y0];
  for (let i = 1; i < nodes.length; i++) {
    const step = nodes[i] - nodes[i - 1];
    const x = nodes[i - 1], y = values[i - 1];
    const k1 = step * f(x, y);
    const k2 = step * f(x + step / 2, y + k1 / 2);
    const k3 = step * f(x + step / 2, y + k2 / 2);
    const k4 = step * f(x + step, y + k3);
    values.push(guard(y + (k1 + 2 * k2 + 2 * k3 + k4) / 6, "Метод Рунге-Кутта", nodes[i]));
  }
  return { nodes, values };
}

// ------------------------- Многошаговый метод -------------------------

// Метод Адамса 4-го порядка в схеме предиктор-корректор.
// Предиктор (Адамс-Башфорт): y_{i+1} = y_i + h/24·(55f_i − 59f_{i−1} + 37f_{i−2} − 9f_{i−3}).
// Корректор (Адамс-Моултон): y_{i+1} = y_i + h/24·(9f_{i+1} + 19f_i − 5f_{i−1} + f_{i−2}),
// итерируется до |y^(k+1) − y^(k)| <= ε. Разгон — методом Рунге-Кутта.
export const ADAMS_MAX_ITERATIONS = 20;

export function adams(f, x0, y0, xn, h, epsilon = 1e-9) {
  const nodes = gridNodes(x0, xn, h);
  if (nodes.length < 5) {
    throw new Error("Метод Адамса требует не менее четырёх шагов: возьмите h <= (xn−x₀)/4.");
  }
  const start = rungeKutta4(f, x0, y0, nodes[3], h);
  const values = start.values.slice(0, 4);
  const slopes = values.map((y, i) => f(nodes[i], y));
  const corrections = [0, 0, 0, 0];
  for (let i = 3; i < nodes.length - 1; i++) {
    const step = nodes[i + 1] - nodes[i];
    let y = values[i] + step / 24 * (55 * slopes[i] - 59 * slopes[i - 1] + 37 * slopes[i - 2] - 9 * slopes[i - 3]);
    guard(y, "Метод Адамса", nodes[i + 1]);
    let iterations = 0, delta = Infinity;
    while (iterations < ADAMS_MAX_ITERATIONS && delta > epsilon) {
      const corrected = values[i] + step / 24
        * (9 * f(nodes[i + 1], y) + 19 * slopes[i] - 5 * slopes[i - 1] + slopes[i - 2]);
      guard(corrected, "Метод Адамса", nodes[i + 1]);
      delta = Math.abs(corrected - y);
      y = corrected;
      iterations++;
    }
    if (delta > epsilon) {
      throw new Error(`Метод Адамса: корректор не сошёлся за ${ADAMS_MAX_ITERATIONS} итераций при x = ${nodes[i + 1].toPrecision(6)}. Уменьшите шаг h.`);
    }
    values.push(y);
    slopes.push(f(nodes[i + 1], y));
    corrections.push(iterations);
  }
  return { nodes, values, corrections, startedBy: "Рунге-Кутта 4-го порядка" };
}

// Конечные разности правой части: ∆f_i, ∆²f_i, ∆³f_i — форма (17) из лекции.
export function backwardDifferences(slopes, i) {
  const [f3, f2, f1, f0] = [slopes[i - 3], slopes[i - 2], slopes[i - 1], slopes[i]];
  return { d1: f0 - f1, d2: f0 - 2 * f1 + f2, d3: f0 - 3 * f1 + 3 * f2 - f3 };
}

// ------------------------- Оценка погрешности -------------------------

// Правило Рунге: R = (y_h − y_{h/2})/(2^p − 1) в общих узлах двух сеток.
export function rungeError(coarse, fine, order) {
  if (fine.nodes.length !== 2 * coarse.nodes.length - 1) {
    throw new Error("Для правила Рунге требуются вложенные равномерные сетки с отношением шагов 2.");
  }
  const denominator = 2 ** order - 1;
  const tolerance = Math.max(1e-9 * Math.abs(coarse.nodes.at(-1) - coarse.nodes[0]), Number.MIN_VALUE);
  let max = 0, at = coarse.nodes[0];
  for (let i = 0; i < coarse.nodes.length; i++) {
    const j = 2 * i;
    if (Math.abs(fine.nodes[j] - coarse.nodes[i]) > tolerance) {
      throw new Error("Узлы сеток h и h/2 не совпадают.");
    }
    const value = Math.abs(coarse.values[i] - fine.values[j]) / denominator;
    if (value > max) { max = value; at = coarse.nodes[i]; }
  }
  return { value: max, at };
}

// Подбор шага по правилу Рунге: h делится пополам, пока R > ε на всём интервале.
export function refineByRunge(method, order, problem) {
  const { equation, x0, y0, xn, epsilon } = problem;
  const steps = [];
  let h = problem.h;
  let coarse;
  try {
    coarse = method(equation.f, x0, y0, xn, h);
  } catch (error) {
    return { steps, h, converged: false, reason: error.message };
  }
  for (let attempt = 0; attempt <= MAX_REFINEMENTS; attempt++) {
    if (2 * coarse.nodes.length - 1 > MAX_NODES) {
      return { steps, h, converged: false, solution: coarse, reason: `Достигнут предел ${MAX_NODES} узлов.` };
    }
    let fine;
    try {
      fine = method(equation.f, x0, y0, xn, h / 2);
    } catch (error) {
      return { steps, h, converged: false, solution: coarse, reason: error.message };
    }
    const runge = rungeError(coarse, fine, order);
    const fineH = (xn - x0) / (fine.nodes.length - 1);
    steps.push({ h: fineH, comparedH: h, nodes: fine.nodes.length, error: runge.value, at: runge.at, ok: runge.value <= epsilon });
    if (runge.value <= epsilon) return { steps, h: fineH, converged: true, solution: fine, coarse, runge };
    coarse = fine;
    h = fineH;
  }
  return { steps, h, converged: false, solution: coarse, reason: `Точность не достигнута за ${MAX_REFINEMENTS} делений шага.` };
}

// Погрешность по точному решению: ε = max|y_i точн − y_i|.
export function exactError(nodes, values, exact) {
  let max = 0, at = nodes[0];
  for (let i = 0; i < nodes.length; i++) {
    const reference = exact(nodes[i]);
    if (!Number.isFinite(reference)) {
      throw new Error(`Точное решение не определено при x = ${nodes[i].toPrecision(8)}.`);
    }
    const value = Math.abs(reference - values[i]);
    if (value > max) { max = value; at = nodes[i]; }
  }
  return { value: max, at };
}

export function refineAdams(problem, exact) {
  const { equation, x0, y0, xn, epsilon } = problem;
  const steps = [];
  let h = problem.h;
  let solution = null;
  for (let attempt = 0; attempt <= MAX_REFINEMENTS; attempt++) {
    if (gridStepCount(x0, xn, h) + 1 > MAX_NODES) {
      return { steps, h, converged: false, solution, reason: `Достигнут предел ${MAX_NODES} узлов.` };
    }
    try {
      solution = adams(equation.f, x0, y0, xn, h, Math.min(epsilon, 1e-10));
      const error = exactError(solution.nodes, solution.values, exact);
      const actualH = (xn - x0) / (solution.nodes.length - 1);
      steps.push({ h: actualH, nodes: solution.nodes.length, error: error.value, at: error.at, ok: error.value <= epsilon });
      if (error.value <= epsilon) return { steps, h: actualH, converged: true, solution, error };
      h = actualH / 2;
    } catch (error) {
      steps.push({ h, error: Number.POSITIVE_INFINITY, ok: false, reason: error.message });
      h /= 2;
    }
  }
  return { steps, h, converged: false, solution, reason: `Точность не достигнута за ${MAX_REFINEMENTS} делений шага.` };
}

function sampleAtNodes(solution, targetNodes) {
  const sourceCount = solution.nodes.length - 1;
  const targetCount = targetNodes.length - 1;
  const ratio = sourceCount / targetCount;
  if (!Number.isInteger(ratio)) throw new Error("Итоговая сетка метода не вложена в общую сетку.");
  return targetNodes.map((_, i) => solution.values[i * ratio]);
}

// ------------------------- Сводное решение -------------------------

export const METHODS = [
  { id: "euler", label: "Метод Эйлера", short: "Эйлер", kind: "one-step", order: 1, run: euler },
  { id: "rk4", label: "Метод Рунге-Кутта 4-го порядка", short: "Рунге-Кутта", kind: "one-step", order: 4, run: rungeKutta4 },
  { id: "adams", label: "Метод Адамса (предиктор-корректор)", short: "Адамс", kind: "multistep", order: 4, run: adams },
];

export const VARIANT19_METHODS = ["euler", "rk4", "adams"];

export function solve(input) {
  const problem = validateProblem(input);
  const { equation, x0, y0, xn, h, epsilon } = problem;
  const exact = equation.exact(x0, y0);
  const nodes = gridNodes(x0, xn, h);
  const exactValues = nodes.map(exact);
  const singular = exactValues.some(value => !Number.isFinite(value));
  const warnings = [];
  if (Math.abs(problem.requestedH - problem.h) > 1e-12 * Math.max(1, problem.requestedH)) {
    warnings.push(`Для равномерной сетки шаг уменьшен с ${problem.requestedH} до ${problem.h}.`);
  }

  const results = METHODS.map(method => {
    const base = { id: method.id, label: method.label, short: method.short, kind: method.kind, order: method.order };
    let initial;
    try {
      initial = method.id === "adams"
        ? method.run(equation.f, x0, y0, xn, h, epsilon)
        : method.run(equation.f, x0, y0, xn, h);
    } catch (error) {
      initial = null;
    }
    const baseError = initial ? exactError(initial.nodes, initial.values, exact) : null;
    const refinement = method.kind === "one-step"
      ? refineByRunge(method.run, method.order, problem)
      : refineAdams(problem, exact);
    if (!refinement.solution) {
      return { ...base, applicable: false, reason: refinement.reason ?? "Не удалось построить решение." };
    }
    const solution = refinement.solution;
    const error = exactError(solution.nodes, solution.values, exact);
    if (!refinement.converged) warnings.push(`${method.label}: ${refinement.reason}`);
    return { ...base, applicable: true, accuracyMet: refinement.converged,
      nodes: solution.nodes, values: solution.values, commonValues: sampleAtNodes(solution, nodes),
      h: (xn - x0) / (solution.nodes.length - 1), error,
      corrections: solution.corrections, base: initial ? { ...initial, error: baseError } : null,
      runge: method.kind === "one-step" ? refinement : undefined,
      exactRefinement: method.kind === "multistep" ? refinement : undefined };
  });

  const spread = (() => {
    const applicable = results.filter(r => r.applicable);
    if (applicable.length < 2) return 0;
    let maximum = 0;
    for (let i = 0; i < nodes.length; i++) {
      let minimum = Infinity, maximumInNode = -Infinity, count = 0;
      for (const result of applicable) {
        const value = result.commonValues[i];
        if (!Number.isFinite(value)) continue;
        minimum = Math.min(minimum, value);
        maximumInNode = Math.max(maximumInNode, value);
        count++;
      }
      if (count >= 2) maximum = Math.max(maximum, maximumInNode - minimum);
    }
    return maximum;
  })();
  return { problem, equation, exact, nodes, exactValues, singular, results, spread, warnings };
}
