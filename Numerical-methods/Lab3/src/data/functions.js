import { FunctionEvaluator } from "../function-evaluator.js";

const properDefinitions = [
  {
    id: "variant19_poly",
    name: "x³ − 3x² + 6x − 19",
    description: "Полином из вычислительной части варианта 19 (точное значение на [2; 4] равно 2)",
    kind: "proper",
    f: (x) => x ** 3 - 3 * x ** 2 + 6 * x - 19,
    F: (x) => x ** 4 / 4 - x ** 3 + 3 * x ** 2 - 19 * x,
    defaultInterval: [2, 4],
    view: [1, 5],
  },
  {
    id: "square",
    name: "x²",
    description: "Квадратичная функция (пример из лекции, ∫ на [1; 2] = 7/3)",
    kind: "proper",
    f: (x) => x ** 2,
    F: (x) => x ** 3 / 3,
    defaultInterval: [1, 2],
    view: [0, 3],
  },
  {
    id: "inverse_x",
    name: "1 / x",
    description: "Гипербола (пример Ньютона — Котеса из лекции, ∫ на [1; 2] = ln 2)",
    kind: "proper",
    f: (x) => 1 / x,
    F: (x) => Math.log(Math.abs(x)),
    defaultInterval: [1, 2],
    view: [0.3, 3],
    yClip: 6,
  },
  {
    id: "sine",
    name: "sin(x)",
    description: "Тригонометрическая функция, ∫ на [0; π] = 2",
    kind: "proper",
    f: (x) => Math.sin(x),
    F: (x) => -Math.cos(x),
    defaultInterval: [0, Math.PI],
    view: [-1, 2 * Math.PI],
  },
  {
    id: "gaussian",
    name: "e^(−x²)",
    description: "Неберущийся интеграл: первообразная не выражается через элементарные функции",
    kind: "proper",
    f: (x) => Math.exp(-(x ** 2)),
    F: null,
    defaultInterval: [0, 1],
    view: [-2, 2],
  },
];

const improperDefinitions = [
  {
    id: "inv_sqrt_x",
    name: "1 / √x",
    description: "Бесконечный разрыв в точке a = 0. Интеграл сходится, ∫ на [0; 1] = 2",
    kind: "improper",
    f: (x) => 1 / Math.sqrt(x),
    F: (x) => 2 * Math.sqrt(x),
    defaultInterval: [0, 1],
    view: [0, 1.2],
    yClip: 8,
    singularities: [{ x: 0, side: "right" }],
    convergence: "converges",
  },
  {
    id: "inv_one_minus_x",
    name: "1 / (1 − x)",
    description: "Бесконечный разрыв в точке b = 1. Интеграл расходится",
    kind: "improper",
    f: (x) => 1 / (1 - x),
    F: (x) => -Math.log(Math.abs(1 - x)),
    defaultInterval: [0, 1],
    view: [-0.1, 1.1],
    yClip: 10,
    singularities: [{ x: 1, side: "left" }],
    convergence: "diverges",
  },
  {
    id: "inv_cbrt_interior",
    name: "1 / ∛((x − 2)²)",
    description: "Бесконечный разрыв во внутренней точке c = 2 отрезка [1; 3]. Сходится, ∫ = 6",
    kind: "improper",
    f: (x) => 1 / Math.cbrt((x - 2) ** 2),
    F: (x) => 3 * Math.cbrt(x - 2),
    defaultInterval: [1, 3],
    view: [1, 3],
    yClip: 8,
    singularities: [{ x: 2, side: "both" }],
    convergence: "converges",
  },
];

const allDefinitions = [...properDefinitions, ...improperDefinitions];

export const properFunctions = properDefinitions;
export const improperFunctions = improperDefinitions;
export const functionDefinitions = allDefinitions;

export const integrationMethods = [
  { id: "leftRect", label: "Левые прямоугольники", order: 1, requiresEven: false },
  { id: "rightRect", label: "Правые прямоугольники", order: 1, requiresEven: false },
  { id: "middleRect", label: "Средние прямоугольники", order: 2, requiresEven: false },
  { id: "trapezoid", label: "Метод трапеций", order: 2, requiresEven: false },
  { id: "simpson", label: "Метод Симпсона", order: 4, requiresEven: true },
];

export function getFunctionDefinition(id) {
  return allDefinitions.find((item) => item.id === id) ?? null;
}

export function getFunctionEvaluator(id) {
  const definition = getFunctionDefinition(id);
  if (!definition) {
    throw new Error(`Функция с id "${id}" не найдена.`);
  }
  return new FunctionEvaluator(definition);
}
