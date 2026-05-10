function evaluateSafely(fn, ...args) {
  const value = fn(...args);
  return Number.isFinite(value) ? value : null;
}

export function findRootIntervals(equation, a, b, samples = 2000) {
  const intervals = [];
  const step = (b - a) / samples;
  let prevX = a;
  let prevY = evaluateSafely(equation.f, prevX);

  for (let index = 1; index <= samples; index += 1) {
    const x = a + index * step;
    const y = evaluateSafely(equation.f, x);

    if (prevY !== null && y !== null) {
      if (Math.abs(prevY) < 1e-10) {
        intervals.push([Math.max(a, prevX - step), Math.min(b, prevX + step)]);
      } else if (prevY * y < 0 || Math.abs(y) < 1e-10) {
        intervals.push([prevX, x]);
      }
    }

    prevX = x;
    prevY = y;
  }

  if (intervals.length === 0) {
    return [];
  }

  intervals.sort((left, right) => left[0] - right[0]);
  const merged = [intervals[0]];

  for (let index = 1; index < intervals.length; index += 1) {
    const current = intervals[index];
    const last = merged[merged.length - 1];
    if (current[0] <= last[1] + step * 2) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push([...current]);
    }
  }

  return merged;
}

export function verifySingleRoot(equation, a, b) {
  const intervals = findRootIntervals(equation, a, b);
  if (intervals.length === 0) {
    throw new Error("На выбранном интервале не найдено корней.");
  }
  if (intervals.length > 1) {
    throw new Error(
      `На выбранном интервале найдено несколько корней (${intervals.length}). Уточните интервал изоляции.`,
    );
  }
  return [a, b];
}

export function chooseInitialByCurvature(equation, a, b) {
  const leftValue = equation.f(a) * equation.d2f(a);
  const rightValue = equation.f(b) * equation.d2f(b);

  if (leftValue > 0) {
    return a;
  }
  if (rightValue > 0) {
    return b;
  }
  return (a + b) / 2;
}

export function chooseChordConfiguration(equation, a, b) {
  const fixed = chooseInitialByCurvature(equation, a, b);
  if (fixed === a) {
    return { fixed, moving: b };
  }
  if (fixed === b) {
    return { fixed, moving: a };
  }

  if (Math.abs(equation.f(a)) < Math.abs(equation.f(b))) {
    return { fixed: a, moving: b };
  }
  return { fixed: b, moving: a };
}

export function estimateDerivativeStats(df, a, b, samples = 400) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let maxAbs = 0;

  for (let index = 0; index <= samples; index += 1) {
    const x = a + ((b - a) * index) / samples;
    const value = df(x);
    if (!Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
    maxAbs = Math.max(maxAbs, Math.abs(value));
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || maxAbs === 0) {
    throw new Error("Не удалось оценить производную на выбранном интервале.");
  }

  return { min, max, maxAbs };
}

export function estimateMaxAbs(fn, a, b, samples = 400) {
  let max = 0;
  for (let index = 0; index <= samples; index += 1) {
    const x = a + ((b - a) * index) / samples;
    const value = fn(x);
    if (Number.isFinite(value)) {
      max = Math.max(max, Math.abs(value));
    }
  }
  return max;
}

export function estimateSystemNorm(phiJacobian, bounds, samples = 20) {
  let maxNorm = 0;
  for (let ix = 0; ix <= samples; ix += 1) {
    for (let iy = 0; iy <= samples; iy += 1) {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * ix) / samples;
      const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * iy) / samples;
      const matrix = phiJacobian(x, y);
      const rowNorm = Math.max(
        Math.abs(matrix[0][0]) + Math.abs(matrix[0][1]),
        Math.abs(matrix[1][0]) + Math.abs(matrix[1][1]),
      );
      maxNorm = Math.max(maxNorm, rowNorm);
    }
  }
  return maxNorm;
}
