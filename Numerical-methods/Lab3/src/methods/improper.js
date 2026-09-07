import { integrateWithRunge } from "../runge.js";

const DIVERGENCE_THRESHOLD = 1e7;
const DEFAULT_MAX_TERMS = 16;
const SUB_INTEGRAL_MAX_N = 2 ** 14;
const GRADED_PANELS = 20;
const GRADED_POWER = 4;

function buildSegments(a, b, singularPoints) {
  const breaks = [a, ...singularPoints, b];
  const segments = [];
  for (let i = 0; i < breaks.length - 1; i += 1) {
    const left = breaks[i];
    const right = breaks[i + 1];
    if (right - left <= 0) {
      continue;
    }
    segments.push({
      left,
      right,
      leftSingular: singularPoints.includes(left),
      rightSingular: singularPoints.includes(right),
    });
  }
  return segments;
}

function integrateSubinterval(methodId, evaluator, left, right, epsilon, singularEnd) {
  if (!singularEnd) {
    return integrateWithRunge(methodId, evaluator, left, right, epsilon, {
      tolerant: true,
      maxN: SUB_INTEGRAL_MAX_N,
    }).value;
  }

  const span = right - left;
  let total = 0;
  for (let j = 0; j < GRADED_PANELS; j += 1) {
    const t0 = (j / GRADED_PANELS) ** GRADED_POWER;
    const t1 = ((j + 1) / GRADED_PANELS) ** GRADED_POWER;
    const panelLeft = singularEnd === "left" ? left + span * t0 : right - span * t1;
    const panelRight = singularEnd === "left" ? left + span * t1 : right - span * t0;
    total += integrateWithRunge(methodId, evaluator, panelLeft, panelRight, epsilon, {
      tolerant: true,
      maxN: SUB_INTEGRAL_MAX_N,
    }).value;
  }
  return total;
}

function partialIntegral(methodId, evaluator, segments, sigma, epsilon) {
  let total = 0;
  for (const segment of segments) {
    const left = segment.leftSingular ? segment.left + sigma : segment.left;
    const right = segment.rightSingular ? segment.right - sigma : segment.right;
    if (right - left <= 0) {
      return Number.NaN;
    }
    if (segment.leftSingular && segment.rightSingular) {
      const mid = (left + right) / 2;
      total += integrateSubinterval(methodId, evaluator, left, mid, epsilon, "left");
      total += integrateSubinterval(methodId, evaluator, mid, right, epsilon, "right");
    } else {
      const singularEnd = segment.leftSingular ? "left" : segment.rightSingular ? "right" : null;
      total += integrateSubinterval(methodId, evaluator, left, right, epsilon, singularEnd);
    }
  }
  return total;
}

function median(numbers) {
  const sorted = [...numbers].sort((left, right) => left - right);
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function investigateImproperIntegral(methodId, evaluator, a, b, epsilon, options = {}) {
  const singularPoints = evaluator.singularities
    .map((singularity) => singularity.x)
    .filter((x) => x >= a && x <= b)
    .sort((left, right) => left - right);

  if (singularPoints.length === 0) {
    throw new Error("На отрезке интегрирования не задано ни одной особой точки.");
  }

  const segments = buildSegments(a, b, singularPoints);
  const minSegment = Math.min(...segments.map((segment) => segment.right - segment.left));
  const maxTerms = options.maxTerms ?? DEFAULT_MAX_TERMS;
  const sigmaFloor = minSegment * (options.sigmaFloor ?? 1e-6);
  const subEpsilon = Math.max(epsilon * 0.05, 1e-9);

  const history = [];
  const values = [];
  let sigma = minSegment / 4;
  let previous = null;

  for (let step = 0; step < maxTerms && sigma >= sigmaFloor; step += 1, sigma /= 2) {
    const value = partialIntegral(methodId, evaluator, segments, sigma, subEpsilon);
    const delta = previous === null ? null : Math.abs(value - previous);
    history.push({ step, sigma, value, delta });

    if (!Number.isFinite(value) || Math.abs(value) > DIVERGENCE_THRESHOLD) {
      return {
        converges: false,
        value: null,
        extrapolated: null,
        history,
        segments,
        singularPoints,
        message:
          "Интеграл не существует: усечённые приближения неограниченно растут у особой точки — интеграл расходится.",
      };
    }

    values.push(value);
    previous = value;
  }

  const diffs = [];
  for (let i = 1; i < values.length; i += 1) {
    diffs.push(values[i] - values[i - 1]);
  }

  const divergent = {
    converges: false,
    value: null,
    extrapolated: null,
    ratio: null,
    history,
    segments,
    singularPoints,
    message:
      "Интеграл не существует: разности усечённых приближений не убывают при σ → 0 — интеграл расходится.",
  };

  if (values.length < 6 || diffs.length < 4) {
    return divergent;
  }

  const ratios = [];
  for (let i = 1; i < diffs.length; i += 1) {
    if (Math.abs(diffs[i - 1]) > 1e-15) {
      ratios.push(diffs[i] / diffs[i - 1]);
    }
  }
  const ratio = median(ratios);

  const bounded = values.every((value) => Number.isFinite(value) && Math.abs(value) < DIVERGENCE_THRESHOLD);
  if (!bounded || !(ratio > 0 && ratio < 0.93)) {
    return divergent;
  }

  const factor = ratio / (1 - ratio);
  const tailLimits = [];
  for (let k = Math.max(1, values.length - 5); k < values.length; k += 1) {
    tailLimits.push(values[k] + (values[k] - values[k - 1]) * factor);
  }
  const value = median(tailLimits);

  return {
    converges: true,
    value,
    extrapolated: value,
    ratio,
    history,
    segments,
    singularPoints,
    message: "Несобственный интеграл сходится: предел усечённых приближений существует.",
  };
}
