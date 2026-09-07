import { approximationModels } from "./approximations.js";
import { clamp, escapeXml, formatNumber } from "./utils.js";

const WIDTH = 960;
const HEIGHT = 560;
const PADDING = {
  left: 72,
  right: 28,
  top: 36,
  bottom: 64,
};

function valueRange(values, fallback = [0, 1]) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) {
    return fallback;
  }

  let min = Math.min(...finiteValues);
  let max = Math.max(...finiteValues);
  if (Math.abs(max - min) < 1e-12) {
    min -= 1;
    max += 1;
  }

  const margin = (max - min) * 0.08;
  return [min - margin, max + margin];
}

function linePath(points) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(3)} ${point.y.toFixed(3)}`)
    .join(" ");
}

function createTicks(min, max, count = 7) {
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

function normalizeBounds(bounds) {
  let { xMin, xMax, yMin, yMax } = bounds;

  if (Math.abs(xMax - xMin) < 1e-12) {
    xMin -= 1;
    xMax += 1;
  }

  if (Math.abs(yMax - yMin) < 1e-12) {
    yMin -= 1;
    yMax += 1;
  }

  return { xMin, xMax, yMin, yMax };
}

function resolveGraphData(solution, options = {}) {
  const points = solution.points;
  const applicableModels = solution.models.filter((model) => model.applicable);
  const visibleModelIds = new Set(options.modelIds ?? applicableModels.map((model) => model.id));
  const visibleModels = applicableModels.filter((model) => visibleModelIds.has(model.id));
  const requestedBounds = options.bounds ?? {};

  const xValues = points.map((point) => point.x);
  const [xMinRaw, xMaxRaw] = valueRange(xValues);
  const xMin = requestedBounds.xMin ?? options.xMin ?? xMinRaw;
  const xMax = requestedBounds.xMax ?? options.xMax ?? xMaxRaw;

  const samples = [];
  const series = visibleModels.map((model) => {
    const modelSamples = [];
    for (let index = 0; index <= 220; index += 1) {
      const x = xMin + ((xMax - xMin) * index) / 220;
      const y = model.evaluate(x);
      if (Number.isFinite(y)) {
        modelSamples.push({ x, y });
        samples.push(y);
      }
    }
    return { model, samples: modelSamples };
  });

  const [yMinRaw, yMaxRaw] = valueRange([...points.map((point) => point.y), ...samples]);
  const yMin = requestedBounds.yMin ?? options.yMin ?? yMinRaw;
  const yMax = requestedBounds.yMax ?? options.yMax ?? yMaxRaw;

  return {
    points,
    visibleModels,
    series,
    bounds: normalizeBounds({ xMin, xMax, yMin, yMax }),
  };
}

export function createApproximationGraphBounds(solution, options = {}) {
  return resolveGraphData(solution, options).bounds;
}

export function createApproximationGraphSvg(solution, options = {}) {
  const { points, series, visibleModels, bounds } = resolveGraphData(solution, options);
  const { xMin, xMax, yMin, yMax } = bounds;
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const scaleX = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const scaleY = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;

  const xTicks = createTicks(xMin, xMax);
  const yTicks = createTicks(yMin, yMax);
  const zeroX = xMin <= 0 && xMax >= 0 ? scaleX(0) : null;
  const zeroY = yMin <= 0 && yMax >= 0 ? scaleY(0) : null;

  const grid = [
    ...xTicks.map((tick) => {
      const x = scaleX(tick);
      return `<line x1="${x}" y1="${PADDING.top}" x2="${x}" y2="${HEIGHT - PADDING.bottom}" class="grid-line" />`;
    }),
    ...yTicks.map((tick) => {
      const y = scaleY(tick);
      return `<line x1="${PADDING.left}" y1="${y}" x2="${WIDTH - PADDING.right}" y2="${y}" class="grid-line" />`;
    }),
  ].join("");

  const axes = [
    `<line x1="${PADDING.left}" y1="${HEIGHT - PADDING.bottom}" x2="${WIDTH - PADDING.right}" y2="${HEIGHT - PADDING.bottom}" class="axis-line" />`,
    `<line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${HEIGHT - PADDING.bottom}" class="axis-line" />`,
    zeroX === null ? "" : `<line x1="${zeroX}" y1="${PADDING.top}" x2="${zeroX}" y2="${HEIGHT - PADDING.bottom}" class="zero-line" />`,
    zeroY === null ? "" : `<line x1="${PADDING.left}" y1="${zeroY}" x2="${WIDTH - PADDING.right}" y2="${zeroY}" class="zero-line" />`,
  ].join("");

  const labels = [
    ...xTicks.map((tick) => {
      const x = scaleX(tick);
      return `<text x="${x}" y="${HEIGHT - PADDING.bottom + 28}" text-anchor="middle" class="tick-label">${escapeXml(formatNumber(tick, 3))}</text>`;
    }),
    ...yTicks.map((tick) => {
      const y = scaleY(tick);
      return `<text x="${PADDING.left - 14}" y="${y + 4}" text-anchor="end" class="tick-label">${escapeXml(formatNumber(tick, 3))}</text>`;
    }),
  ].join("");

  const modelPaths = visibleModels
    .map((model) => {
      const modelSeries = series.find((item) => item.model.id === model.id);
      const path = linePath(modelSeries.samples.map((point) => ({ x: scaleX(point.x), y: scaleY(point.y) })));
      return `<path d="${path}" fill="none" stroke="${model.color}" stroke-width="${model.id === solution.best.id ? 3.6 : 2.4}" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#plotClip)" />`;
    })
    .join("");

  const pointMarks = points
    .map((point) => {
      if (point.x < xMin || point.x > xMax || point.y < yMin || point.y > yMax) {
        return "";
      }
      const x = clamp(scaleX(point.x), PADDING.left, WIDTH - PADDING.right);
      const y = clamp(scaleY(point.y), PADDING.top, HEIGHT - PADDING.bottom);
      return `<circle cx="${x}" cy="${y}" r="4.8" class="data-point"><title>x=${escapeXml(formatNumber(point.x, 6))}, y=${escapeXml(formatNumber(point.y, 6))}</title></circle>`;
    })
    .join("");

  const legend = visibleModels
    .map((model, index) => {
      const x = PADDING.left + index * 142;
      const y = HEIGHT - 20;
      return [
        `<line x1="${x}" y1="${y - 5}" x2="${x + 28}" y2="${y - 5}" stroke="${model.color}" stroke-width="3" stroke-linecap="round" />`,
        `<text x="${x + 36}" y="${y}" class="legend-label">${escapeXml(model.shortLabel)}</text>`,
      ].join("");
    })
    .join("");

  return `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="График аппроксимации" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="plotClip">
        <rect x="${PADDING.left}" y="${PADDING.top}" width="${plotWidth}" height="${plotHeight}" />
      </clipPath>
    </defs>
    <style>
      .plot-bg { fill: #ffffff; }
      .grid-line { stroke: rgba(47, 95, 167, 0.12); stroke-width: 1; }
      .axis-line { stroke: #334155; stroke-width: 1.4; }
      .zero-line { stroke: rgba(31, 41, 55, 0.25); stroke-width: 1.2; stroke-dasharray: 5 6; }
      .tick-label, .legend-label, .axis-label { fill: #5b6778; font: 13px "SFMono-Regular", Menlo, Consolas, monospace; }
      .data-point { fill: #ffffff; stroke: #1f2937; stroke-width: 2; }
    </style>
    <rect width="${WIDTH}" height="${HEIGHT}" class="plot-bg" rx="12" />
    ${grid}
    ${axes}
    ${labels}
    ${modelPaths}
    ${pointMarks}
    <text x="${WIDTH - PADDING.right}" y="${HEIGHT - PADDING.bottom + 48}" text-anchor="end" class="axis-label">x</text>
    <text x="${PADDING.left - 42}" y="${PADDING.top - 12}" class="axis-label">y</text>
    ${legend}
  </svg>`;
}

export function getModelColor(modelId) {
  return approximationModels.find((model) => model.id === modelId)?.color ?? "#2f5fa7";
}
