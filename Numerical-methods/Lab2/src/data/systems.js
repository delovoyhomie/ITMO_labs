export const systems = [
  {
    id: "variant19_system",
    name: "{ sin(y - 1) + x = 1.3; y - sin(x + 1) = 0.8 }",
    description: "Система из вычислительной части варианта 19",
    f: (x, y) => [Math.sin(y - 1) + x - 1.3, y - Math.sin(x + 1) - 0.8],
    jacobian: (x, y) => [
      [1, Math.cos(y - 1)],
      [-Math.cos(x + 1), 1],
    ],
    phi: (x, y) => [1.3 - Math.sin(y - 1), 0.8 + Math.sin(x + 1)],
    phiJacobian: (x, y) => [
      [0, -Math.cos(y - 1)],
      [Math.cos(x + 1), 0],
    ],
  },
  {
    id: "variant20_system",
    name: "{ sin(x + y) - 1.1x = 0.1; x^2 + y^2 = 1 }",
    description: "Система из таблицы 8, удобная для метода Ньютона",
    f: (x, y) => [Math.sin(x + y) - 1.1 * x - 0.1, x ** 2 + y ** 2 - 1],
    jacobian: (x, y) => [
      [Math.cos(x + y) - 1.1, Math.cos(x + y)],
      [2 * x, 2 * y],
    ],
  },
  {
    id: "variant24_system",
    name: "{ sin(x - y) - xy = -1; 0.3x^2 + y^2 = 2 }",
    description: "Система из таблицы 8, удобная для метода Ньютона",
    f: (x, y) => [Math.sin(x - y) - x * y + 1, 0.3 * x ** 2 + y ** 2 - 2],
    jacobian: (x, y) => [
      [Math.cos(x - y) - y, -Math.cos(x - y) - x],
      [0.6 * x, 2 * y],
    ],
  },
];

export const variant19SystemMethods = [
  { id: "newtonSystem", label: "Метод Ньютона" },
];

export function getSystemById(id) {
  const system = systems.find((item) => item.id === id);
  if (!system) {
    throw new Error(`Система с id "${id}" не найдена.`);
  }
  return system;
}
