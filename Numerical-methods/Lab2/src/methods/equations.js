import {
  chooseChordConfiguration,
  chooseInitialByCurvature,
  estimateDerivativeStats,
  estimateMaxAbs,
} from "../analysis.js";

export function bisection(equation, a, b, epsilon, maxIterations = 1000) {
  const history = [];
  let left = a;
  let right = b;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const middle = (left + right) / 2;
    const fLeft = equation.f(left);
    const fRight = equation.f(right);
    const fMiddle = equation.f(middle);
    const diff = Math.abs(right - left);

    history.push({
      iteration,
      a: left,
      b: right,
      x: middle,
      fa: fLeft,
      fb: fRight,
      fx: fMiddle,
      diff,
    });

    if (diff <= epsilon || Math.abs(fMiddle) <= epsilon) {
      return {
        method: "bisection",
        root: middle,
        fx: fMiddle,
        iterations: iteration,
        history,
      };
    }

    if (fLeft * fMiddle <= 0) {
      right = middle;
    } else {
      left = middle;
    }
  }

  throw new Error("Метод половинного деления не сошелся за отведенное число итераций.");
}

export function chordFixed(equation, a, b, epsilon, maxIterations = 1000) {
  const history = [];
  const { fixed, moving } = chooseChordConfiguration(equation, a, b);
  const fFixed = equation.f(fixed);
  let current = moving;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const fCurrent = equation.f(current);
    const denominator = fFixed - fCurrent;
    if (Math.abs(denominator) < 1e-14) {
      throw new Error("В методе хорд возникло деление на слишком малое число.");
    }

    const next = current - (fCurrent * (fixed - current)) / denominator;
    const fNext = equation.f(next);
    const diff = Math.abs(next - current);

    history.push({
      iteration,
      fixed,
      moving: current,
      next,
      fFixed,
      fMoving: fCurrent,
      fNext,
      diff,
    });

    if (diff <= epsilon || Math.abs(fNext) <= epsilon) {
      return {
        method: "chord",
        root: next,
        fx: fNext,
        iterations: iteration,
        history,
        metadata: { fixedEndpoint: fixed },
      };
    }

    current = next;
  }

  throw new Error("Метод хорд не сошелся за отведенное число итераций.");
}

export function newton(equation, a, b, epsilon, maxIterations = 1000) {
  const history = [];
  let current = chooseInitialByCurvature(equation, a, b);

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const fx = equation.f(current);
    const dfx = equation.df(current);

    if (Math.abs(dfx) < 1e-14) {
      throw new Error("Производная в методе Ньютона слишком близка к нулю.");
    }

    const next = current - fx / dfx;
    const diff = Math.abs(next - current);
    const fNext = equation.f(next);

    history.push({
      iteration,
      x: current,
      fx,
      dfx,
      next,
      diff,
      fNext,
    });

    if (diff <= epsilon || Math.abs(fNext) <= epsilon) {
      return {
        method: "newton",
        root: next,
        fx: fNext,
        iterations: iteration,
        history,
      };
    }

    current = next;
  }

  throw new Error("Метод Ньютона не сошелся за отведенное число итераций.");
}

export function secant(equation, a, b, epsilon, maxIterations = 1000) {
  const history = [];
  let previous = a;
  let current = b;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const fPrevious = equation.f(previous);
    const fCurrent = equation.f(current);
    const denominator = fCurrent - fPrevious;

    if (Math.abs(denominator) < 1e-14) {
      throw new Error("В методе секущих возникло деление на слишком малое число.");
    }

    const next = current - (fCurrent * (current - previous)) / denominator;
    const fNext = equation.f(next);
    const diff = Math.abs(next - current);

    history.push({
      iteration,
      xPrev: previous,
      x: current,
      next,
      fPrev: fPrevious,
      fx: fCurrent,
      fNext,
      diff,
    });

    if (diff <= epsilon || Math.abs(fNext) <= epsilon) {
      return {
        method: "secant",
        root: next,
        fx: fNext,
        iterations: iteration,
        history,
      };
    }

    previous = current;
    current = next;
  }

  throw new Error("Метод секущих не сошелся за отведенное число итераций.");
}

export function simpleIterationEquation(equation, a, b, epsilon, maxIterations = 1000) {
  const { min, max, maxAbs } = estimateDerivativeStats(equation.df, a, b);
  const midpoint = (a + b) / 2;
  const signProbe = Math.sign(equation.df(midpoint)) || Math.sign(min + max) || 1;
  const lambda = -signProbe / maxAbs;
  const phi = (x) => x + lambda * equation.f(x);
  const q = estimateMaxAbs((x) => 1 + lambda * equation.df(x), a, b);

  if (q >= 1) {
    throw new Error(
      `Для метода простой итерации не выполнено достаточное условие сходимости: q = ${q.toFixed(6)} >= 1.`,
    );
  }

  const history = [];
  let current = midpoint;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const next = phi(current);
    const diff = Math.abs(next - current);
    const estimatedError = q === 0 ? diff : (q / (1 - q)) * diff;
    const phiNext = phi(next);

    history.push({
      iteration,
      x: current,
      next,
      phiNext,
      diff,
      estimatedError,
    });

    if (estimatedError <= epsilon || Math.abs(equation.f(next)) <= epsilon) {
      return {
        method: "simpleIteration",
        root: next,
        fx: equation.f(next),
        iterations: iteration,
        history,
        metadata: { lambda, q },
      };
    }

    current = next;
  }

  throw new Error("Метод простой итерации не сошелся за отведенное число итераций.");
}
