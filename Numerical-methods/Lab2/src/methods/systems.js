import { estimateSystemNorm } from "../analysis.js";
import { maxAbs } from "../utils.js";

function solveLinear2x2(matrix, vector) {
  const [[a11, a12], [a21, a22]] = matrix;
  const [b1, b2] = vector;
  const determinant = a11 * a22 - a12 * a21;

  if (Math.abs(determinant) < 1e-14) {
    throw new Error("Якобиан вырожден или близок к вырождению.");
  }

  return [
    (b1 * a22 - a12 * b2) / determinant,
    (a11 * b2 - b1 * a21) / determinant,
  ];
}

export function newtonSystem(system, initial, epsilon, maxIterations = 100) {
  const history = [];
  let current = { ...initial };

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const [f1, f2] = system.f(current.x, current.y);
    const jacobian = system.jacobian(current.x, current.y);
    const [dx, dy] = solveLinear2x2(jacobian, [-f1, -f2]);
    const next = {
      x: current.x + dx,
      y: current.y + dy,
    };
    const [nextF1, nextF2] = system.f(next.x, next.y);
    const errors = [Math.abs(dx), Math.abs(dy)];

    history.push({
      iteration,
      x: current.x,
      y: current.y,
      f1,
      f2,
      dx,
      dy,
      nextX: next.x,
      nextY: next.y,
      errorX: errors[0],
      errorY: errors[1],
      nextF1,
      nextF2,
    });

    if (maxAbs(errors) <= epsilon) {
      return {
        method: "newtonSystem",
        solution: next,
        residuals: [nextF1, nextF2],
        iterations: iteration,
        history,
      };
    }

    current = next;
  }

  throw new Error("Метод Ньютона для системы не сошелся за отведенное число итераций.");
}

export function simpleIterationSystem(system, initial, epsilon, bounds, maxIterations = 100) {
  if (!system.phi || !system.phiJacobian) {
    throw new Error("Для выбранной системы не задана итерационная форма.");
  }

  const q = estimateSystemNorm(system.phiJacobian, bounds);
  if (q >= 1) {
    throw new Error(
      `Для метода простой итерации системы не выполнено достаточное условие сходимости: q = ${q.toFixed(6)} >= 1.`,
    );
  }

  const history = [];
  let current = { ...initial };

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const [nextX, nextY] = system.phi(current.x, current.y);
    const diffX = Math.abs(nextX - current.x);
    const diffY = Math.abs(nextY - current.y);
    const estimatedError = q === 0 ? Math.max(diffX, diffY) : (q / (1 - q)) * Math.max(diffX, diffY);
    const [f1, f2] = system.f(nextX, nextY);

    history.push({
      iteration,
      x: current.x,
      y: current.y,
      nextX,
      nextY,
      diffX,
      diffY,
      estimatedError,
      f1,
      f2,
    });

    if (estimatedError <= epsilon) {
      return {
        method: "simpleIterationSystem",
        solution: { x: nextX, y: nextY },
        residuals: [f1, f2],
        iterations: iteration,
        history,
        metadata: { q },
      };
    }

    current = { x: nextX, y: nextY };
  }

  throw new Error("Метод простой итерации для системы не сошелся за отведенное число итераций.");
}
