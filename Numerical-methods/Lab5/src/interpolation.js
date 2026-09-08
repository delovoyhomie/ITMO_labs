import { parseNumber } from "./utils.js";

export const VARIANT19 = {
  points: [0.1213, 1.1316, 2.1459, 3.1565, 4.1571, 5.1819, 6.1969]
    .map((y, i) => ({ x: (105 + 10 * i) / 100, y })),
  targets: [1.573, 1.375],
};

export const FUNCTIONS = [
  { id: "sin", label: "sin(x)", evaluate: Math.sin },
  { id: "exp", label: "exp(x)", evaluate: Math.exp },
  { id: "cubic", label: "x³ − 2x + 1", evaluate: x => x ** 3 - 2 * x + 1 },
];

export function validatePoints(input) {
  if (!Array.isArray(input) || input.length < 2 || input.length > 50) {
    throw new Error("Таблица должна содержать от 2 до 50 точек.");
  }
  const points = input.map((p, i) => {
    if (!p || typeof p !== "object" || (Array.isArray(p) && p.length !== 2)) {
      throw new Error(`Строка ${i + 1}: требуется пара x, y.`);
    }
    return { x: parseNumber(Array.isArray(p) ? p[0] : p.x, `x в строке ${i + 1}`),
      y: parseNumber(Array.isArray(p) ? p[1] : p.y, `y в строке ${i + 1}`) };
  }).sort((a, b) => a.x - b.x);
  for (let i = 1; i < points.length; i++) {
    const scale = Math.max(Math.abs(points[i].x), Math.abs(points[i - 1].x), Number.MIN_VALUE);
    if (points[i].x - points[i - 1].x <= 32 * Number.EPSILON * scale) {
      throw new Error("Узлы x должны быть различными и различимыми в машинной точности.");
    }
  }
  return points;
}

export function uniformStep(points) {
  const h = (points.at(-1).x - points[0].x) / (points.length - 1);
  if (!Number.isFinite(h) || h <= 0) return null;
  const scale = Math.max(...points.map(p => Math.abs(p.x)), h);
  const tolerance = Math.max(h * 1e-10, 16 * Number.EPSILON * scale);
  return points.every((p, i) => Math.abs(p.x - (points[0].x + i * h)) <= tolerance) ? h : null;
}

// Columns: table[k][i] is the difference of order k starting at node i.
export function differenceTable(points, divided = false) {
  const table = [points.map(p => p.y)];
  for (let k = 1; k < points.length; k++) {
    table.push(Array.from({ length: points.length - k }, (_, i) => {
      const difference = table[k - 1][i + 1] - table[k - 1][i];
      const value = divided ? difference / (points[i + k].x - points[i].x) : difference;
      if (!Number.isFinite(value)) throw new Error("Переполнение таблицы разностей. Уменьшите масштаб данных.");
      return value;
    }));
  }
  return table;
}

export function lagrange(points, x) {
  return points.reduce((sum, point, i) => {
    let basis = 1;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) basis *= (x - points[j].x) / (point.x - points[j].x);
    }
    return sum + point.y * basis;
  }, 0);
}

export function newtonDivided(points, table, x, backward = false) {
  const n = points.length - 1;
  let result = table[n][0];
  for (let k = n - 1; k >= 0; k--) {
    const index = backward ? n - k : 0;
    const node = backward ? n - k : k;
    result = table[k][index] + (x - points[node].x) * result;
  }
  return result;
}

export function newtonFinite(points, table, x, backward = false) {
  const h = uniformStep(points);
  if (h === null) throw new Error("Нужна равномерная сетка.");
  const n = points.length - 1;
  const t = (x - points[backward ? n : 0].x) / h;
  let factor = 1;
  let result = table[0][backward ? n : 0];
  for (let k = 1; k <= n; k++) {
    factor *= (t + (backward ? k - 1 : 1 - k)) / k;
    result += factor * table[k][backward ? n - k : 0];
  }
  return result;
}

export function gauss(points, table, x, backward = false) {
  const h = uniformStep(points);
  if (h === null || points.length % 2 !== 1 || points.length < 3) {
    throw new Error("Для полной схемы Гаусса нужны равномерная сетка и нечётное число узлов не менее 3.");
  }
  const center = (points.length - 1) / 2;
  const t = (x - points[center].x) / h;
  let result = table[0][center];
  let factor = 1;
  for (let k = 1; k < points.length; k++) {
    const j = k - 1;
    const offset = j === 0 ? 0 : (j % 2 === 1 ? (j + 1) / 2 : -j / 2);
    factor *= (t - (backward ? -offset : offset)) / k;
    const index = center - (backward ? Math.ceil(k / 2) : Math.floor(k / 2));
    result += factor * table[k][index];
  }
  return result;
}

export function stirling(points, table, x) {
  const h = uniformStep(points);
  if (h === null || points.length % 2 !== 1 || points.length < 3) {
    throw new Error("Стирлинг: нужны равномерная сетка и нечётное число узлов не менее 3.");
  }
  const m = (points.length - 1) / 2;
  const t = (x - points[m].x) / h;
  let result = table[0][m];
  let product = 1;
  let factorial = 1;
  for (let r = 1; r <= m; r++) {
    factorial *= 2 * r - 1;
    result += t * product / factorial * (table[2 * r - 1][m - r] + table[2 * r - 1][m - r + 1]) / 2;
    factorial *= 2 * r;
    result += t * t * product / factorial * table[2 * r][m - r];
    product *= t * t - r * r;
  }
  return result;
}

export function bessel(points, table, x) {
  const h = uniformStep(points);
  if (h === null || points.length % 2 !== 0) {
    throw new Error("Бессель: нужны равномерная сетка и чётное число узлов.");
  }
  const m = points.length / 2 - 1;
  const t = (x - points[m].x) / h;
  let result = (table[0][m] + table[0][m + 1]) / 2 + (t - 0.5) * table[1][m];
  let product = 1;
  let factorial = 1;
  for (let r = 1; r <= m; r++) {
    product *= (t + r - 1) * (t - r);
    factorial *= 2 * r;
    result += product / factorial * (table[2 * r][m - r] + table[2 * r][m - r + 1]) / 2;
    factorial *= 2 * r + 1;
    result += (t - 0.5) * product / factorial * table[2 * r + 1][m - r];
  }
  return result;
}

export function generatePoints(id, a, b, count) {
  const fn = FUNCTIONS.find(item => item.id === id);
  if (!fn) throw new Error("Неизвестная функция. Доступны sin, exp, cubic.");
  a = parseNumber(a, "Начало интервала");
  b = parseNumber(b, "Конец интервала");
  count = parseNumber(count, "Число точек");
  if (!(a < b) || !Number.isFinite(b - a)) throw new Error("Нужен конечный интервал a < b.");
  if (!Number.isInteger(count) || count < 2 || count > 50) throw new Error("Число точек должно быть целым от 2 до 50.");
  return validatePoints(Array.from({ length: count }, (_, i) => {
    const x = i === count - 1 ? b : a + (b - a) * i / (count - 1);
    return { x, y: fn.evaluate(x) };
  }));
}

export function solve(input, target, functionId = null) {
  const points = validatePoints(input);
  const x = parseNumber(target, "Аргумент интерполяции");
  const h = uniformStep(points);
  const divided = differenceTable(points, true);
  const finite = h === null ? null : differenceTable(points);
  const fn = functionId ? FUNCTIONS.find(item => item.id === functionId) : null;
  if (functionId && !fn) throw new Error("Неизвестная исходная функция.");
  const warnings = [];
  if (x < points[0].x || x > points.at(-1).x) warnings.push("Аргумент вне интервала: выполняется экстраполяция.");
  if (points.length > 15) warnings.push("Высокая степень полинома: возможны осцилляции и накопление ошибок округления.");
  if (h === null) warnings.push("Сетка неравномерная: методы с конечными разностями неприменимы.");
  const definitions = [
    ["lagrange", "Лагранж", z => lagrange(points, z)],
    ["divided-forward", "Ньютон: разделённые, I", z => newtonDivided(points, divided, z)],
    ["divided-backward", "Ньютон: разделённые, II", z => newtonDivided(points, divided, z, true)],
    ["finite-forward", "Ньютон: конечные, I", z => newtonFinite(points, finite, z)],
    ["finite-backward", "Ньютон: конечные, II", z => newtonFinite(points, finite, z, true)],
    ["gauss-forward", "Гаусс, I", z => gauss(points, finite, z)],
    ["gauss-backward", "Гаусс, II", z => gauss(points, finite, z, true)],
    ["stirling", "Стирлинг", z => stirling(points, finite, z)],
    ["bessel", "Бессель", z => bessel(points, finite, z)],
  ];
  const models = definitions.map(([id, label, evaluate], i) => {
    try {
      const value = evaluate(x);
      if (!Number.isFinite(value)) throw new Error("Переполнение при вычислении полинома.");
      return { id, label, evaluate, value, applicable: true, extra: i >= 5 };
    } catch (error) {
      return { id, label, applicable: false, reason: error.message, extra: i >= 5 };
    }
  });
  const valid = models.filter(m => m.applicable);
  if (!valid.some(m => !m.extra)) throw new Error("Вычисление невозможно в машинной точности. Измените масштаб данных.");
  const preferred = x <= points[0].x + (points.at(-1).x - points[0].x) / 2 ? "I (вперёд)" : "II (назад)";
  const spread = Math.max(...valid.map(m => m.value)) - Math.min(...valid.map(m => m.value));
  if (spread > 1e-8 * Math.max(1, ...valid.map(m => Math.abs(m.value)))) warnings.push("Заметное расхождение методов из-за численной неустойчивости. Уменьшите число узлов или масштаб данных.");
  const exact = fn?.evaluate(x);
  if (fn && !Number.isFinite(exact)) warnings.push("Исходная функция не имеет конечного машинного значения в выбранной точке.");
  return { points, x, h, divided, finite, models, preferred, spread, warnings,
    functionId, exact: Number.isFinite(exact) ? exact : null };
}
