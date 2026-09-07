import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  EQUATIONS, METHODS, adams, backwardDifferences, euler, exactError, gridNodes, improvedEuler,
  refineByRunge, rungeError, rungeKutta4, solve, validateProblem,
} from "./ode.js";
import { parseProblem, formatSolution } from "./io.js";
import { createGraphSvg, createErrorSvg } from "./plotting-core.js";

const DEMO = { equation: "bernoulli", x0: 1, y0: -1, xn: 1.5, h: 0.1, epsilon: 1e-6 };
const close = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ""} ${actual} ≉ ${expected} (±${tolerance})`);

test("метод Эйлера воспроизводит пример 1 из лекции", () => {
  const f = (x, y) => y + (1 + x) * y * y;
  const { values } = euler(f, 1, -1, 1.5, 0.1);
  const lecture = [-1, -0.9, -0.8199, -0.753998, -0.698640, -0.651361];
  values.forEach((value, i) => close(value, lecture[i], 1e-6, `узел ${i}`));
});

test("метод Рунге-Кутта воспроизводит пример 3 из лекции", () => {
  const f = (x, y) => y + (1 + x) * y * y;
  const { values } = rungeKutta4(f, 1, -1, 1.5, 0.1);
  const lecture = [-1, -0.909093, -0.833336, -0.769234, -0.714289, -0.666670];
  values.forEach((value, i) => close(value, lecture[i], 2e-6, `узел ${i}`));
});

test("метод Эйлера точен для y' = const", () => {
  const { nodes, values } = euler(() => 2, 0, 1, 1, 0.125);
  nodes.forEach((x, i) => close(values[i], 1 + 2 * x, 1e-12));
});

test("метод Рунге-Кутта точен для кубического многочлена", () => {
  const { nodes, values } = rungeKutta4(x => 3 * x * x, 0, 0, 2, 0.25);
  nodes.forEach((x, i) => close(values[i], x ** 3, 1e-12));
});

test("порядок метода Эйлера равен единице, Рунге-Кутта — четырём", () => {
  const f = (x, y) => y;
  const error = (method, h) => Math.max(...method(f, 0, 1, 1, h).nodes
    .map((x, i) => Math.abs(Math.exp(x) - method(f, 0, 1, 1, h).values[i])));
  close(error(euler, 0.05) / error(euler, 0.025), 2, 0.15, "Эйлер");
  close(error(rungeKutta4, 0.1) / error(rungeKutta4, 0.05), 16, 2.5, "Рунге-Кутта");
  close(error(improvedEuler, 0.05) / error(improvedEuler, 0.025), 4, 0.3, "Эйлер с пересчётом");
});

test("метод Адамса разгоняется методом Рунге-Кутта", () => {
  const f = (x, y) => x + y;
  const a = adams(f, 0, 1, 1, 0.1, 1e-12);
  const rk = rungeKutta4(f, 0, 1, 1, 0.1);
  for (let i = 0; i <= 3; i++) close(a.values[i], rk.values[i], 0, `стартовый узел ${i}`);
  assert.equal(a.startedBy, "Рунге-Кутта 4-го порядка");
  assert.ok(a.corrections.slice(4).every(count => count >= 1), "корректор должен выполняться хотя бы раз");
});

test("метод Адамса имеет четвёртый порядок точности", () => {
  const f = (x, y) => x + y;
  const exact = x => 2 * Math.exp(x) - x - 1;
  const error = h => Math.max(...adams(f, 0, 1, 1, h, 1e-14).nodes
    .map((x, i) => Math.abs(exact(x) - adams(f, 0, 1, 1, h, 1e-14).values[i])));
  close(error(0.05) / error(0.025), 16, 3, "отношение погрешностей");
});

test("метод Адамса требует не менее четырёх шагов", () => {
  assert.throws(() => adams((x, y) => y, 0, 1, 1, 0.5, 1e-9), /не менее четырёх шагов/);
});

test("предиктор Адамса совпадает с разностной формой (17) из лекции", () => {
  const slopes = [0.4, 1.1, 1.9, 3.2];
  const { d1, d2, d3 } = backwardDifferences(slopes, 3);
  const differenceForm = slopes[3] + d1 / 2 + 5 * d2 / 12 + 3 * d3 / 8;
  const coefficientForm = (55 * slopes[3] - 59 * slopes[2] + 37 * slopes[1] - 9 * slopes[0]) / 24;
  close(differenceForm, coefficientForm, 1e-12);
});

test("правило Рунге вычисляет (y_h − y_h/2)/(2^p − 1)", () => {
  const coarse = { nodes: [0, 1, 2], values: [0, 1, 2] };
  const fine = { nodes: [0, 0.5, 1, 1.5, 2], values: [0, 0, 1.3, 0, 2] };
  const runge = rungeError(coarse, fine, 1);
  close(runge.value, 0.3, 1e-12);
  close(runge.at, 1, 0);
});

test("подбор шага по правилу Рунге доводит Эйлера до заданной точности", () => {
  const problem = validateProblem({ equation: "linear", x0: 0, y0: 1, xn: 1, h: 0.1, epsilon: 1e-4 });
  const refined = refineByRunge(euler, 1, problem);
  assert.ok(refined.converged, refined.reason);
  assert.ok(refined.h < problem.h, "шаг должен уменьшиться");
  assert.ok(refined.steps.at(-1).error <= problem.epsilon);
  assert.ok(refined.steps.slice(0, -1).every(step => !step.ok), "промежуточные шаги не проходят проверку");
});

test("точное решение каждого уравнения удовлетворяет самому уравнению", () => {
  for (const equation of EQUATIONS) {
    const y = equation.exact(0.3, 0.7);
    for (const x of [0.4, 0.6, 0.9]) {
      const derivative = (y(x + 1e-6) - y(x - 1e-6)) / 2e-6;
      close(derivative, equation.f(x, y(x)), 1e-4, equation.id);
    }
    close(y(0.3), 0.7, 1e-12, `${equation.id}: начальное условие`);
  }
});

test("точное решение примера варианта равно −1/x", () => {
  const y = EQUATIONS.find(e => e.id === "bernoulli").exact(1, -1);
  for (const x of [1, 1.25, 1.5]) close(y(x), -1 / x, 1e-12);
});

test("сетка строится от x0 с шагом h и не выходит за xn", () => {
  const nodes = gridNodes(0, 1, 0.25);
  assert.equal(nodes.length, 5);
  close(nodes.at(-1), 1, 1e-12);
  assert.deepEqual(gridNodes(1, 1.5, 0.1).length, 6);
});

test("погрешность по точному решению берёт максимум по узлам", () => {
  const result = exactError([0, 1, 2], [0, 1, 2], x => x * x);
  close(result.value, 2, 1e-12);
  close(result.at, 2, 0);
});

test("solve возвращает три метода варианта 19", () => {
  const solution = solve(DEMO);
  assert.deepEqual(solution.results.map(r => r.id), METHODS.map(m => m.id));
  assert.deepEqual(solution.results.map(r => r.id), ["euler", "rk4", "adams"]);
  assert.ok(solution.results.every(r => r.applicable));
  assert.equal(solution.nodes.length, 6);
  assert.equal(solution.exactValues.length, 6);
  for (const result of solution.results) assert.equal(result.values.length, 6);
});

test("на задаче варианта Рунге-Кутта и Адамс точнее Эйлера на три порядка", () => {
  const { results } = solve(DEMO);
  const error = id => results.find(r => r.id === id).error.value;
  assert.ok(error("rk4") < error("euler") / 1000);
  assert.ok(error("adams") < error("euler") / 1000);
  assert.ok(error("adams") > 0, "метод Адамса накапливает собственную погрешность");
});

test("одношаговые методы получают оценку Рунге, многошаговый — по точному решению", () => {
  const { results } = solve({ ...DEMO, epsilon: 1e-4 });
  for (const result of results) {
    if (result.kind === "one-step") assert.ok(result.runge.converged, `${result.id}: ${result.runge.reason}`);
    else assert.equal(result.runge, undefined);
  }
});

test("жёсткая задача: явный метод Эйлера расходится при крупном шаге", () => {
  const stiff = { equation: "stiff", x0: 0, y0: 1, xn: 3, h: 0.5, epsilon: 1e-4 };
  const { results } = solve(stiff);
  const error = id => results.find(r => r.id === id).error.value;
  assert.ok(error("euler") > 1, `погрешность Эйлера ${error("euler")}`);
  assert.ok(error("rk4") < error("euler"));
  const fine = solve({ ...stiff, h: 0.1 });
  assert.ok(fine.results.find(r => r.id === "euler").error.value < 0.5, "при h = 0.1 метод Эйлера устойчив");
});

test("расходящееся решение даёт понятную ошибку, а не NaN", () => {
  assert.throws(() => euler((x, y) => y * y, 0, 1e5, 5, 0.5), /бесконечность/);
});

test("проверка входных данных отклоняет некорректные наборы", () => {
  const base = { equation: "linear", x0: 0, y0: 1, xn: 1, h: 0.1, epsilon: 1e-6 };
  assert.throws(() => validateProblem({ ...base, xn: 0 }), /xn должна быть больше/);
  assert.throws(() => validateProblem({ ...base, h: 0 }), /Шаг h должен быть положительным/);
  assert.throws(() => validateProblem({ ...base, h: 2 }), /не должен превышать длину интервала/);
  assert.throws(() => validateProblem({ ...base, epsilon: 0 }), /ε должна быть положительной/);
  assert.throws(() => validateProblem({ ...base, epsilon: 5 }), /ε должна быть меньше единицы/);
  assert.throws(() => validateProblem({ ...base, h: 1e-9 }), /Слишком мелкий шаг/);
  assert.throws(() => validateProblem({ ...base, equation: "none" }), /Неизвестное уравнение/);
  assert.throws(() => validateProblem({ ...base, y0: "abc" }), /требуется конечное число/);
  assert.throws(() => validateProblem(null), /описание задачи Коши/);
});

test("десятичная запятая принимается во всех числовых полях", () => {
  const problem = validateProblem({ equation: "linear", x0: "0", y0: "1,5", xn: "1", h: "0,25", epsilon: "1e-6" });
  close(problem.y0, 1.5, 0);
  close(problem.h, 0.25, 0);
});

test("чтение задачи из JSON и из текстового формата", () => {
  const json = parseProblem('{"equation":"sum","x0":0,"y0":1,"xn":1,"h":0.1,"epsilon":1e-6}');
  assert.equal(json.equation.id, "sum");
  const text = parseProblem("# комментарий\nequation = square\nx0 = 0\ny0 = 0,5\nxn = 2\nh = 0,2\nepsilon = 1e-6");
  assert.equal(text.equation.id, "square");
  close(text.y0, 0.5, 0);
});

test("чтение отклоняет пустой файл, битый JSON и неизвестные поля", () => {
  assert.throws(() => parseProblem("   "), /Файл пуст/);
  assert.throws(() => parseProblem("{oops"), /Некорректный JSON/);
  assert.throws(() => parseProblem("[1, 2]"), /Ожидается объект/);
  assert.throws(() => parseProblem("equation = linear\nstep = 0.1"), /неизвестное поле/);
  assert.throws(() => parseProblem("equation = linear\nx0 = 0"), /Не заданы поля/);
  assert.throws(() => parseProblem("equation linear"), /имя = значение/);
});

test("текстовый отчёт содержит таблицу значений и обе оценки погрешности", () => {
  const text = formatSolution(solve(DEMO));
  for (const fragment of ["Таблица приближённых значений", "Правило Рунге", "max|y точн − y|",
    "Метод Адамса", "y точн", "Точность ε"]) {
    assert.ok(text.includes(fragment), `нет фрагмента «${fragment}»`);
  }
});

test("графики содержат точное решение и все приближения разными цветами", () => {
  const solution = solve(DEMO);
  const svg = createGraphSvg(solution);
  assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
  for (const color of ["#3d7c55", "#cc7045", "#2f5fa7", "#7c4fa0"]) assert.ok(svg.includes(color), color);
  assert.ok(!svg.includes("NaN"), "координаты не должны содержать NaN");
  const errorSvg = createErrorSvg(solution);
  assert.ok(errorSvg.includes("|y точн − y|") && !errorSvg.includes("NaN"));
});

test("особенность точного решения не ломает расчёт", () => {
  const solution = solve({ equation: "bernoulli", x0: 1, y0: -1, xn: 1.4, h: 0.1, epsilon: 1e-4 });
  assert.ok(solution.results.every(r => r.applicable));
  assert.ok(solution.exactValues.every(Number.isFinite));
});

// Сквозные проверки консольной программы: stdin перенаправлен, поэтому
// они ловят ошибки построчного ввода, невидимые при прямом вызове solve().
function runCli(args, input = "") {
  const result = spawnSync(process.execPath, [new URL("index.js", import.meta.url).pathname, ...args],
    { input, encoding: "utf8" });
  return { ...result, output: `${result.stdout}${result.stderr}` };
}

test("консоль: ввод с клавиатуры доходит до последнего вопроса", () => {
  const { status, output } = runCli([], "4\n1\n-1\n1,5\n0,1\n\n");
  assert.equal(status, 0, output);
  for (const fragment of ["Номер уравнения", "x₀:", "y₀ = y(x₀):", "xₙ:", "Шаг h:", "Точность ε",
    "Таблица приближённых значений", "Правило Рунге"]) {
    assert.ok(output.includes(fragment), `нет фрагмента «${fragment}»: ${output.slice(0, 400)}`);
  }
  assert.ok(output.includes("-0.90909331"), "первый узел рассчитан неверно");
});

test("консоль: неверный номер уравнения запрашивается повторно", () => {
  const { status, output } = runCli([], "abc\n9\n1\n0\n1\n1\n0,25\n\n");
  assert.equal(status, 0, output);
  assert.ok(output.match(/Введите целое число от 1 до 6/g).length >= 2);
  assert.ok(output.includes("Уравнение: y' = y"));
});

test("консоль: нечисловое значение отклоняется и запрашивается снова", () => {
  const { status, output } = runCli([], "1\nxyz\n0\n1\n1\n0,25\n\n");
  assert.equal(status, 0, output);
  assert.ok(output.includes("x₀: требуется конечное число."));
});

test("консоль: параметры командной строки, справка и ошибки", () => {
  const demo = runCli(["--demo"]);
  assert.equal(demo.status, 0, demo.output);
  assert.ok(demo.output.includes("Метод Адамса"));

  const flags = runCli(["--equation", "sum", "--x0", "0", "--y0", "1", "--xn", "1", "--h", "0.1"]);
  assert.equal(flags.status, 0, flags.output);
  assert.ok(flags.output.includes("y' = x + y"));

  assert.ok(runCli(["--help"]).output.includes("--error-graph"));
  assert.equal(runCli(["--demo", "--input", "examples/variant19.json"]).status, 1);
  assert.ok(runCli(["--wrong"]).output.includes("Неизвестный параметр"));
  assert.ok(runCli(["--equation", "sum", "--x0", "0"]).output.includes("Не задан параметр --y0"));
});

test("консоль: обрыв ввода не приводит к зависанию", () => {
  const { status, output } = runCli([], "4\n1\n");
  assert.equal(status, 1);
  assert.ok(output.includes("Ввод прерван"));
});
