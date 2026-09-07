export function leftRectangles(evaluator, a, b, n) {
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += evaluator.evaluate(a + i * h);
  }
  return h * sum;
}

export function rightRectangles(evaluator, a, b, n) {
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 1; i <= n; i += 1) {
    sum += evaluator.evaluate(a + i * h);
  }
  return h * sum;
}

export function middleRectangles(evaluator, a, b, n) {
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 1; i <= n; i += 1) {
    sum += evaluator.evaluate(a + (i - 0.5) * h);
  }
  return h * sum;
}

export function trapezoidal(evaluator, a, b, n) {
  const h = (b - a) / n;
  let sum = (evaluator.evaluate(a) + evaluator.evaluate(b)) / 2;
  for (let i = 1; i < n; i += 1) {
    sum += evaluator.evaluate(a + i * h);
  }
  return h * sum;
}

export function simpson(evaluator, a, b, n) {
  let segments = n;
  if (segments % 2 !== 0) {
    segments += 1;
  }
  const h = (b - a) / segments;
  let sum = evaluator.evaluate(a) + evaluator.evaluate(b);
  for (let i = 1; i < segments; i += 1) {
    sum += (i % 2 === 1 ? 4 : 2) * evaluator.evaluate(a + i * h);
  }
  return (h / 3) * sum;
}

export const cotesNumerators = {
  1: [1, 1],
  2: [1, 4, 1],
  3: [1, 3, 3, 1],
  4: [7, 32, 12, 32, 7],
  5: [19, 75, 50, 50, 75, 19],
  6: [41, 216, 27, 272, 27, 216, 41],
  7: [751, 3577, 1323, 2989, 2989, 1323, 3577, 751],
  8: [989, 5888, -928, 10496, -4540, 10496, -928, 5888, 989],
};

export const cotesDenominators = {
  1: 2,
  2: 6,
  3: 8,
  4: 90,
  5: 288,
  6: 840,
  7: 17280,
  8: 28350,
};


export function newtonCotes(evaluator, a, b, n) {
  const numerators = cotesNumerators[n];
  const denominator = cotesDenominators[n];
  if (!numerators) {
    throw new Error(`Коэффициенты Котеса для n = ${n} не заданы (поддерживаются n = 1..8).`);
  }

  const h = (b - a) / n;
  let weightedSum = 0;
  for (let i = 0; i <= n; i += 1) {
    weightedSum += numerators[i] * evaluator.evaluate(a + i * h);
  }
  return ((n * h) / denominator) * weightedSum;
}

const methodFunctions = {
  leftRect: leftRectangles,
  rightRect: rightRectangles,
  middleRect: middleRectangles,
  trapezoid: trapezoidal,
  simpson,
};


export function getMethodFunction(methodId) {
  const fn = methodFunctions[methodId];
  if (!fn) {
    throw new Error(`Метод интегрирования "${methodId}" не поддерживается.`);
  }
  return fn;
}


export function buildNodeTable(evaluator, a, b, n) {
  const h = (b - a) / n;
  const rows = [];
  for (let i = 0; i <= n; i += 1) {
    const x = a + i * h;
    rows.push({ i, x, y: evaluator.evaluate(x) });
  }
  return rows;
}
