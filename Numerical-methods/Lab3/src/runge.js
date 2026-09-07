import { getMethodFunction } from "./methods/integration.js";
import { integrationMethods } from "./data/functions.js";

const methodMeta = Object.fromEntries(integrationMethods.map((method) => [method.id, method]));

const DEFAULT_INITIAL_N = 4;
const DEFAULT_MAX_N = 2 ** 22;


export function integrateWithRunge(methodId, evaluator, a, b, epsilon, options = {}) {
  const meta = methodMeta[methodId];
  if (!meta) {
    throw new Error(`Метод интегрирования "${methodId}" не поддерживается.`);
  }

  const methodFn = getMethodFunction(methodId);
  const order = meta.order;
  const rungeDenominator = 2 ** order - 1;
  const initialN = options.initialN ?? DEFAULT_INITIAL_N;
  const maxN = options.maxN ?? DEFAULT_MAX_N;

  let n = meta.requiresEven && initialN % 2 !== 0 ? initialN + 1 : initialN;
  let previousValue = methodFn(evaluator, a, b, n);

  const history = [
    {
      step: 0,
      n,
      h: (b - a) / n,
      value: previousValue,
      runge: null,
    },
  ];

  let step = 0;
  while (n * 2 <= maxN) {
    step += 1;
    const nextN = n * 2;
    const currentValue = methodFn(evaluator, a, b, nextN);
    const runge = Math.abs(currentValue - previousValue) / rungeDenominator;

    history.push({
      step,
      n: nextN,
      h: (b - a) / nextN,
      value: currentValue,
      runge,
    });

    if (runge <= epsilon) {
      return {
        value: currentValue,
        n: nextN,
        runge,
        refined: currentValue,
        iterations: step,
        order,
        converged: true,
        history,
      };
    }

    previousValue = currentValue;
    n = nextN;
  }

  if (options.tolerant) {
    const last = history[history.length - 1];
    return {
      value: last.value,
      n: last.n,
      runge: last.runge,
      refined: last.value,
      iterations: step,
      order,
      converged: false,
      history,
    };
  }

  throw new Error(
    `Требуемая точность не достигнута: превышено предельное число разбиений (n = ${maxN}). ` +
      "Попробуйте увеличить ε.",
  );
}
