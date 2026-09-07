import { EPSILON, formatNumber, mean, parseLooseNumber, sum } from "./utils.js";

export { formatNumber } from "./utils.js";

export const approximationModels = [
  {
    id: "linear",
    label: "Линейная",
    shortLabel: "Линейная",
    formula: "a*x + b",
    color: "#2f5fa7",
  },
  {
    id: "quadratic",
    label: "Полиномиальная 2-й степени",
    shortLabel: "Квадратичная",
    formula: "a*x^2 + b*x + c",
    color: "#b54d4d",
  },
  {
    id: "cubic",
    label: "Полиномиальная 3-й степени",
    shortLabel: "Кубическая",
    formula: "a*x^3 + b*x^2 + c*x + d",
    color: "#3d7c55",
  },
  {
    id: "exponential",
    label: "Экспоненциальная",
    shortLabel: "Экспонента",
    formula: "a*e^(b*x)",
    color: "#7c4d9e",
  },
  {
    id: "logarithmic",
    label: "Логарифмическая",
    shortLabel: "Логарифм",
    formula: "a*ln(x) + b",
    color: "#b8752a",
  },
  {
    id: "power",
    label: "Степенная",
    shortLabel: "Степенная",
    formula: "a*x^b",
    color: "#1f7f85",
  },
];

export function variant19Function(x) {
  return (5 * x) / (x ** 4 + 19);
}

export function createVariant19Points() {
  return Array.from({ length: 11 }, (_, index) => {
    const x = Number((index * 0.2).toFixed(10));
    return { x, y: variant19Function(x) };
  });
}

export function validatePoints(inputPoints) {
  if (!Array.isArray(inputPoints)) {
    throw new Error("Нужно передать массив точек.");
  }

  if (inputPoints.length < 8 || inputPoints.length > 12) {
    throw new Error("Таблица должна содержать от 8 до 12 точек.");
  }

  const points = inputPoints.map((point, index) => {
    const rawX = Array.isArray(point) ? point[0] : point?.x;
    const rawY = Array.isArray(point) ? point[1] : point?.y;
    const x = parseLooseNumber(rawX);
    const y = parseLooseNumber(rawY);

    if (x === null || y === null) {
      throw new Error(`Точка ${index + 1} содержит некорректные координаты.`);
    }

    return { x, y };
  });

  const usedX = new Set();
  for (const point of points) {
    const key = formatNumber(point.x, 12);
    if (usedX.has(key)) {
      throw new Error(`Значение x=${formatNumber(point.x, 6)} повторяется.`);
    }
    usedX.add(key);
  }

  return points.sort((left, right) => left.x - right.x);
}

export function parsePointsInput(rawInput) {
  if (Array.isArray(rawInput)) {
    return validatePoints(rawInput);
  }

  if (typeof rawInput === "string") {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      throw new Error("Входные данные пустые.");
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return parsePointsInput(JSON.parse(trimmed));
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Некорректный JSON: ${error.message}`);
        }
        throw error;
      }
    }

    try {
      return parsePointsInput(JSON.parse(trimmed));
    } catch {
      return validatePoints(parsePointsText(trimmed));
    }
  }

  if (rawInput && Array.isArray(rawInput.points)) {
    return validatePoints(rawInput.points);
  }

  if (rawInput && Array.isArray(rawInput.x) && Array.isArray(rawInput.y)) {
    if (rawInput.x.length !== rawInput.y.length) {
      throw new Error("Массивы x и y должны иметь одинаковую длину.");
    }
    return validatePoints(rawInput.x.map((x, index) => ({ x, y: rawInput.y[index] })));
  }

  throw new Error("Не удалось найти точки во входных данных.");
}

export function parsePointsText(content) {
  const lines = String(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));

  if (lines.length === 0) {
    throw new Error("Текстовый файл не содержит точек.");
  }

  const startIndex = lines.length > 1 && /^\d+$/.test(lines[0]) ? 1 : 0;
  const points = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const withoutBrackets = line.replace(/[()[\]]/g, " ");
    let parts = withoutBrackets.split(/[;\s]+/).filter(Boolean);

    if (parts.length < 2 && withoutBrackets.includes(",")) {
      parts = withoutBrackets.split(",").map((part) => part.trim()).filter(Boolean);
    }

    if (parts.length < 2) {
      throw new Error(`Строка "${line}" должна содержать x и y.`);
    }

    const x = parseLooseNumber(parts[0]);
    const y = parseLooseNumber(parts[1]);
    if (x === null || y === null) {
      if (/^[a-zа-яё]/i.test(line)) {
        continue;
      }
      throw new Error(`Не удалось прочитать числа в строке "${line}".`);
    }

    points.push({ x, y });
  }

  return points;
}

export function gaussianElimination(matrix, vector) {
  const size = vector.length;
  const a = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(a[pivotRow][column]) < EPSILON) {
      throw new Error("Система нормальных уравнений вырождена.");
    }

    [a[column], a[pivotRow]] = [a[pivotRow], a[column]];

    for (let row = column + 1; row < size; row += 1) {
      const factor = a[row][column] / a[column][column];
      for (let currentColumn = column; currentColumn <= size; currentColumn += 1) {
        a[row][currentColumn] -= factor * a[column][currentColumn];
      }
    }
  }

  const result = Array(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let value = a[row][size];
    for (let column = row + 1; column < size; column += 1) {
      value -= a[row][column] * result[column];
    }
    result[row] = value / a[row][row];
  }

  return result;
}

export function leastSquaresPolynomial(points, degree) {
  const size = degree + 1;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const vector = Array(size).fill(0);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      matrix[row][column] = sum(points.map((point) => point.x ** (row + column)));
    }
    vector[row] = sum(points.map((point) => point.y * point.x ** row));
  }

  return gaussianElimination(matrix, vector);
}

export function evaluatePolynomial(coefficients, x) {
  return coefficients.reduce((value, coefficient, index) => value + coefficient * x ** index, 0);
}

function calculatePearson(points) {
  const xMean = mean(points.map((point) => point.x));
  const yMean = mean(points.map((point) => point.y));
  const numerator = sum(points.map((point) => (point.x - xMean) * (point.y - yMean)));
  const xDenominator = sum(points.map((point) => (point.x - xMean) ** 2));
  const yDenominator = sum(points.map((point) => (point.y - yMean) ** 2));
  const denominator = Math.sqrt(xDenominator * yDenominator);
  return denominator < EPSILON ? 0 : numerator / denominator;
}

function calculateStats(points, evaluate) {
  const values = points.map((point) => {
    const approximation = evaluate(point.x);
    const residual = approximation - point.y;
    return {
      x: point.x,
      y: point.y,
      approximation,
      residual,
      squaredResidual: residual ** 2,
    };
  });

  const s = sum(values.map((row) => row.squaredResidual));
  const sigma = Math.sqrt(s / points.length);
  const yMean = mean(points.map((point) => point.y));
  const totalScatter = sum(points.map((point) => (point.y - yMean) ** 2));
  const r2 = totalScatter < EPSILON ? (s < EPSILON ? 1 : 0) : 1 - s / totalScatter;

  return { values, s, sigma, r2 };
}

function signedTerm(value, suffix = "", digits = 6) {
  const sign = value < 0 ? "-" : "+";
  return `${sign} ${formatNumber(Math.abs(value), digits)}${suffix}`;
}

export function formatPolynomial(coefficients, digits = 6) {
  const terms = [];

  for (let degree = coefficients.length - 1; degree >= 0; degree -= 1) {
    const coefficient = coefficients[degree];
    const absolute = Math.abs(coefficient);
    const suffix = degree === 0 ? "" : degree === 1 ? "*x" : `*x^${degree}`;
    if (terms.length === 0) {
      terms.push(`${coefficient < 0 ? "-" : ""}${formatNumber(absolute, digits)}${suffix}`);
    } else {
      terms.push(signedTerm(coefficient, suffix, digits));
    }
  }

  return terms.join(" ");
}

function createApplicableModel(modelId, points, parameters, evaluate) {
  const model = approximationModels.find((item) => item.id === modelId);
  const stats = calculateStats(points, evaluate);
  const equation = formatModelEquation(modelId, parameters);

  return {
    ...model,
    applicable: true,
    parameters,
    equation,
    evaluate,
    ...stats,
  };
}

function createInvalidModel(modelId, message) {
  const model = approximationModels.find((item) => item.id === modelId);
  return {
    ...model,
    applicable: false,
    parameters: null,
    equation: "не применима",
    error: message,
    values: [],
    s: Number.POSITIVE_INFINITY,
    sigma: Number.POSITIVE_INFINITY,
    r2: Number.NEGATIVE_INFINITY,
  };
}

export function formatModelEquation(modelId, parameters, digits = 6) {
  if (modelId === "linear") {
    return `φ(x) = ${formatNumber(parameters.a, digits)}*x ${signedTerm(parameters.b, "", digits)}`;
  }

  if (modelId === "quadratic" || modelId === "cubic") {
    return `φ(x) = ${formatPolynomial(parameters.coefficients, digits)}`;
  }

  if (modelId === "exponential") {
    return `φ(x) = ${formatNumber(parameters.a, digits)}*e^(${formatNumber(parameters.b, digits)}*x)`;
  }

  if (modelId === "logarithmic") {
    return `φ(x) = ${formatNumber(parameters.a, digits)}*ln(x) ${signedTerm(parameters.b, "", digits)}`;
  }

  if (modelId === "power") {
    return `φ(x) = ${formatNumber(parameters.a, digits)}*x^${formatNumber(parameters.b, digits)}`;
  }

  return "φ(x)";
}

function fitPolynomialModel(points, degree, modelId) {
  const coefficients = leastSquaresPolynomial(points, degree);
  return createApplicableModel(
    modelId,
    points,
    {
      coefficients,
      ...(degree === 1 ? { a: coefficients[1], b: coefficients[0] } : {}),
    },
    (x) => evaluatePolynomial(coefficients, x),
  );
}

function requireDomain(points, predicate, message) {
  if (!points.every(predicate)) {
    throw new Error(message);
  }
}

function fitExponential(points) {
  requireDomain(points, (point) => point.y > 0, "для экспоненциальной модели нужны значения y > 0");
  const transformed = points.map((point) => ({ x: point.x, y: Math.log(point.y) }));
  const [lnA, b] = leastSquaresPolynomial(transformed, 1);
  const a = Math.exp(lnA);
  return createApplicableModel("exponential", points, { a, b }, (x) => a * Math.exp(b * x));
}

function fitLogarithmic(points) {
  requireDomain(points, (point) => point.x > 0, "для логарифмической модели нужны значения x > 0");
  const transformed = points.map((point) => ({ x: Math.log(point.x), y: point.y }));
  const [b, a] = leastSquaresPolynomial(transformed, 1);
  return createApplicableModel("logarithmic", points, { a, b }, (x) => a * Math.log(x) + b);
}

function fitPower(points) {
  requireDomain(points, (point) => point.x > 0 && point.y > 0, "для степенной модели нужны значения x > 0 и y > 0");
  const transformed = points.map((point) => ({ x: Math.log(point.x), y: Math.log(point.y) }));
  const [lnA, b] = leastSquaresPolynomial(transformed, 1);
  const a = Math.exp(lnA);
  return createApplicableModel("power", points, { a, b }, (x) => a * x ** b);
}

function fitModel(points, modelId) {
  if (modelId === "linear") {
    return fitPolynomialModel(points, 1, "linear");
  }
  if (modelId === "quadratic") {
    return fitPolynomialModel(points, 2, "quadratic");
  }
  if (modelId === "cubic") {
    return fitPolynomialModel(points, 3, "cubic");
  }
  if (modelId === "exponential") {
    return fitExponential(points);
  }
  if (modelId === "logarithmic") {
    return fitLogarithmic(points);
  }
  if (modelId === "power") {
    return fitPower(points);
  }
  throw new Error(`Неизвестная модель: ${modelId}`);
}

export function solveApproximations(inputPoints) {
  const points = validatePoints(inputPoints);
  const models = approximationModels.map((model) => {
    try {
      return fitModel(points, model.id);
    } catch (error) {
      return createInvalidModel(model.id, error.message);
    }
  });

  const applicableModels = models.filter((model) => model.applicable);
  if (applicableModels.length === 0) {
    throw new Error("Ни одна аппроксимирующая функция не применима к этим данным.");
  }

  const best = applicableModels.reduce((currentBest, model) => (
    model.sigma < currentBest.sigma ? model : currentBest
  ));

  return {
    points,
    models,
    best,
    pearson: calculatePearson(points),
  };
}

export function getDeterminationMessage(r2) {
  if (!Number.isFinite(r2)) {
    return "модель не применима";
  }
  if (r2 >= 0.95) {
    return "высокая точность аппроксимации";
  }
  if (r2 >= 0.75) {
    return "удовлетворительная точность аппроксимации";
  }
  if (r2 >= 0.5) {
    return "слабая аппроксимация";
  }
  return "модель плохо описывает данные";
}

export function formatPointsTable(points, digits = 6) {
  return points
    .map((point, index) => `${String(index + 1).padStart(2, " ")}  x=${formatNumber(point.x, digits).padStart(10, " ")}  y=${formatNumber(point.y, digits).padStart(12, " ")}`)
    .join("\n");
}

export function formatResultText(solution) {
  const lines = [];
  lines.push("Лабораторная работа 4. Аппроксимация функции методом МНК");
  lines.push("");
  lines.push("Исходные точки:");
  lines.push(formatPointsTable(solution.points, 6));
  lines.push("");
  lines.push("Итоги по моделям:");

  for (const model of solution.models) {
    if (!model.applicable) {
      lines.push(`- ${model.label}: не применима (${model.error}).`);
      continue;
    }

    lines.push(
      `- ${model.label}: ${model.equation}; S=${formatNumber(model.s, 8)}; ` +
        `σ=${formatNumber(model.sigma, 8)}; R²=${formatNumber(model.r2, 8)} ` +
        `(${getDeterminationMessage(model.r2)}).`,
    );
  }

  lines.push("");
  lines.push(`Коэффициент корреляции Пирсона для линейной зависимости: r=${formatNumber(solution.pearson, 8)}.`);
  lines.push(`Лучшая модель: ${solution.best.label}.`);
  lines.push(solution.best.equation);
  lines.push("");
  lines.push("Массивы xi, yi, φ(xi), εi для лучшей модели:");
  lines.push(" i            x            y        phi(x)       epsilon");
  solution.best.values.forEach((row, index) => {
    lines.push(
      `${String(index + 1).padStart(2, " ")} ` +
        `${formatNumber(row.x, 6).padStart(12, " ")} ` +
        `${formatNumber(row.y, 8).padStart(12, " ")} ` +
        `${formatNumber(row.approximation, 8).padStart(12, " ")} ` +
        `${formatNumber(row.residual, 8).padStart(12, " ")}`,
    );
  });

  return lines.join("\n");
}
