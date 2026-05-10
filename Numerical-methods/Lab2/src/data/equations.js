export const equations = [
  {
    id: "variant19_poly",
    name: "2x^3 - 1.89x^2 - 5x + 2.34",
    description: "Полином из вычислительной части варианта 19",
    f: (x) => 2 * x ** 3 - 1.89 * x ** 2 - 5 * x + 2.34,
    df: (x) => 6 * x ** 2 - 3.78 * x - 5,
    d2f: (x) => 12 * x - 3.78,
  },
  {
    id: "cos_minus_x",
    name: "cos(x) - x",
    description: "Трансцендентное уравнение с единственным корнем",
    f: (x) => Math.cos(x) - x,
    df: (x) => -Math.sin(x) - 1,
    d2f: (x) => -Math.cos(x),
  },
  {
    id: "exp_minus_3x",
    name: "e^x - 3x",
    description: "Трансцендентное уравнение",
    f: (x) => Math.exp(x) - 3 * x,
    df: (x) => Math.exp(x) - 3,
    d2f: (x) => Math.exp(x),
  },
  {
    id: "log_plus_x_minus_2",
    name: "ln(x + 3) + x - 2",
    description: "Трансцендентное уравнение с ограничением x > -3",
    f: (x) => Math.log(x + 3) + x - 2,
    df: (x) => 1 / (x + 3) + 1,
    d2f: (x) => -1 / (x + 3) ** 2,
  },
  {
    id: "sin_x",
    name: "sin(x)",
    description: "Периодическая тригонометрическая функция",
    f: (x) => Math.sin(x),
    df: (x) => Math.cos(x),
    d2f: (x) => -Math.sin(x),
  },
  {
    id: "cos_x",
    name: "cos(x)",
    description: "Периодическая тригонометрическая функция",
    f: (x) => Math.cos(x),
    df: (x) => -Math.sin(x),
    d2f: (x) => -Math.cos(x),
  },
  {
    id: "sin_minus_half_x",
    name: "sin(x) - 0.5x",
    description: "Трансцендентное уравнение",
    f: (x) => Math.sin(x) - 0.5 * x,
    df: (x) => Math.cos(x) - 0.5,
    d2f: (x) => -Math.sin(x),
  },
];

export const variant19EquationMethods = [
  { id: "chord", label: "Метод хорд" },
  { id: "newton", label: "Метод Ньютона" },
  { id: "simpleIteration", label: "Метод простой итерации" },
];

export function getEquationById(id) {
  const equation = equations.find((item) => item.id === id);
  if (!equation) {
    throw new Error(`Уравнение с id "${id}" не найдено.`);
  }
  return equation;
}
