function svgHeader(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">`;
}

function mapValue(value, fromMin, fromMax, toMin, toMax) {
  return toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin);
}

function formatTick(value) {
  if (Math.abs(value) < 1e-10) {
    return "0.00";
  }
  return value.toFixed(2);
}

function formatMarkerValue(value) {
  if (Math.abs(value) < 1e-10) {
    return "0.0000";
  }
  return value.toFixed(4);
}

function isPointInsideBounds(point, bounds) {
  return (
    point.x >= bounds.xMin &&
    point.x <= bounds.xMax &&
    point.y >= bounds.yMin &&
    point.y <= bounds.yMax
  );
}

function buildPointMarker(marker, bounds, width, height, margin, color) {
  if (!marker || !isPointInsideBounds(marker, bounds)) {
    return [];
  }

  const left = margin;
  const right = width - margin;
  const top = margin;
  const bottom = height - margin;
  const cx = mapValue(marker.x, bounds.xMin, bounds.xMax, left, right);
  const cy = mapValue(marker.y, bounds.yMin, bounds.yMax, bottom, top);
  const label = marker.label ?? `(${formatMarkerValue(marker.x)}, ${formatMarkerValue(marker.y)})`;
  const labelWidth = Math.max(138, label.length * 7.2 + 18);
  const placeLeft = cx + labelWidth + 18 > right;
  const labelX = placeLeft ? cx - labelWidth - 14 : cx + 14;
  const labelY = cy < top + 42 ? cy + 10 : cy - 34;

  return [
    `<line x1="${cx}" y1="${top}" x2="${cx}" y2="${bottom}" stroke="${color}" stroke-width="1" stroke-dasharray="5 5" opacity="0.55"/>`,
    `<line x1="${left}" y1="${cy}" x2="${right}" y2="${cy}" stroke="${color}" stroke-width="1" stroke-dasharray="5 5" opacity="0.55"/>`,
    `<circle cx="${cx}" cy="${cy}" r="6.5" fill="${color}" stroke="#fffdf8" stroke-width="2.5"/>`,
    `<circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.35"/>`,
    `<rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="24" rx="12" fill="#fffdf8" stroke="${color}" stroke-width="1"/>`,
    `<text x="${labelX + 10}" y="${labelY + 16}" fill="#3c3129" font-size="12" font-family="Menlo, Consolas, monospace">${label}</text>`,
  ];
}

function buildAxes(bounds, width, height, margin) {
  const elements = [];
  const innerWidth = width - margin * 2;
  const innerHeight = height - margin * 2;
  const left = margin;
  const right = width - margin;
  const top = margin;
  const bottom = height - margin;
  const xTicks = 8;
  const yTicks = 6;

  elements.push(
    `<rect x="${margin}" y="${margin}" width="${innerWidth}" height="${innerHeight}" rx="18" fill="#fffdf8" stroke="#d9d0c3"/>`,
  );

  for (let index = 0; index <= xTicks; index += 1) {
    const value = bounds.xMin + ((bounds.xMax - bounds.xMin) * index) / xTicks;
    const x = mapValue(value, bounds.xMin, bounds.xMax, left, right);
    elements.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#ebe3d7" stroke-width="1"/>`);
    elements.push(
      `<text x="${x}" y="${bottom + 18}" fill="#7b7267" font-size="11" text-anchor="middle">${formatTick(value)}</text>`,
    );
  }

  for (let index = 0; index <= yTicks; index += 1) {
    const value = bounds.yMin + ((bounds.yMax - bounds.yMin) * index) / yTicks;
    const y = mapValue(value, bounds.yMin, bounds.yMax, bottom, top);
    elements.push(`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#ebe3d7" stroke-width="1"/>`);
    elements.push(
      `<text x="${left - 10}" y="${y + 4}" fill="#7b7267" font-size="11" text-anchor="end">${formatTick(value)}</text>`,
    );
  }

  if (bounds.xMin <= 0 && bounds.xMax >= 0) {
    const x = mapValue(0, bounds.xMin, bounds.xMax, left, right);
    elements.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#9a8f82" stroke-width="1.4"/>`);
    elements.push(`<text x="${x + 8}" y="${top + 14}" fill="#5d564f" font-size="12">y</text>`);
  }

  if (bounds.yMin <= 0 && bounds.yMax >= 0) {
    const y = mapValue(0, bounds.yMin, bounds.yMax, bottom, top);
    elements.push(`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#9a8f82" stroke-width="1.4"/>`);
    elements.push(`<text x="${right - 12}" y="${y - 8}" fill="#5d564f" font-size="12">x</text>`);
  }

  elements.push(
    `<text x="${margin}" y="${height - margin + 34}" fill="#5d564f" font-size="13">x: [${bounds.xMin.toFixed(2)}, ${bounds.xMax.toFixed(2)}]</text>`,
  );
  elements.push(
    `<text x="${width - margin - 180}" y="${margin - 14}" fill="#5d564f" font-size="14">y: [${bounds.yMin.toFixed(2)}, ${bounds.yMax.toFixed(2)}]</text>`,
  );

  return elements;
}

function interpolate(p1, p2, v1, v2) {
  if (Math.abs(v1 - v2) < 1e-14) {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }
  const t = v1 / (v1 - v2);
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

function marchingSquaresSegments(fn, bounds, steps = 80) {
  const segments = [];
  const dx = (bounds.xMax - bounds.xMin) / steps;
  const dy = (bounds.yMax - bounds.yMin) / steps;

  const caseMap = {
    0: [],
    1: [[3, 0]],
    2: [[0, 1]],
    3: [[3, 1]],
    4: [[1, 2]],
    5: [[3, 2], [0, 1]],
    6: [[0, 2]],
    7: [[3, 2]],
    8: [[2, 3]],
    9: [[0, 2]],
    10: [[0, 3], [1, 2]],
    11: [[1, 2]],
    12: [[3, 1]],
    13: [[0, 1]],
    14: [[3, 0]],
    15: [],
  };

  for (let ix = 0; ix < steps; ix += 1) {
    for (let iy = 0; iy < steps; iy += 1) {
      const x0 = bounds.xMin + ix * dx;
      const x1 = x0 + dx;
      const y0 = bounds.yMin + iy * dy;
      const y1 = y0 + dy;

      const points = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
      const values = points.map((point) => fn(point.x, point.y));
      const mask = values.reduce((accumulator, value, index) => accumulator + (value > 0 ? 2 ** index : 0), 0);
      const pairs = caseMap[mask];

      if (!pairs || pairs.length === 0) {
        continue;
      }

      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ];

      for (const [edgeA, edgeB] of pairs) {
        const [startA, startB] = edges[edgeA];
        const [endA, endB] = edges[edgeB];
        const start = interpolate(points[startA], points[startB], values[startA], values[startB]);
        const end = interpolate(points[endA], points[endB], values[endA], values[endB]);
        segments.push([start, end]);
      }
    }
  }

  return segments;
}

export function createEquationGraphSvg(equation, options) {
  const {
    a,
    b,
    width = 960,
    height = 560,
    samples = 800,
    marker,
    bounds: requestedBounds,
  } = options;

  const values = [];
  for (let index = 0; index <= samples; index += 1) {
    const x = a + ((b - a) * index) / samples;
    const y = equation.f(x);
    if (Number.isFinite(y)) {
      values.push({ x, y });
    }
  }

  if (values.length < 2) {
    throw new Error("Недостаточно данных для построения графика уравнения.");
  }

  const yValues = values.map((point) => point.y);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 0);
  const padding = Math.max(1, (maxY - minY) * 0.1 || 1);
  const bounds = {
    xMin: requestedBounds?.xMin ?? a,
    xMax: requestedBounds?.xMax ?? b,
    yMin: requestedBounds?.yMin ?? minY - padding,
    yMax: requestedBounds?.yMax ?? maxY + padding,
  };
  const margin = 56;

  let path = "";
  values.forEach((point, index) => {
    const x = mapValue(point.x, bounds.xMin, bounds.xMax, margin, width - margin);
    const y = mapValue(point.y, bounds.yMin, bounds.yMax, height - margin, margin);
    path += `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  });

  const svg = [
    svgHeader(width, height),
    `<rect width="${width}" height="${height}" fill="#f6f1e8"/>`,
    `<text x="${margin}" y="34" fill="#332d28" font-size="24" font-family="Menlo, Consolas, monospace">График: ${equation.name}</text>`,
    ...buildAxes(bounds, width, height, margin),
    `<path d="${path.trim()}" stroke="#c44938" stroke-width="2.4" fill="none"/>`,
    ...buildPointMarker(marker, bounds, width, height, margin, "#8f2d21"),
    "</svg>",
  ].join("\n");

  return { svg, bounds };
}

export function createSystemGraphSvg(system, options) {
  const {
    bounds,
    width = 960,
    height = 620,
    marker,
  } = options;
  const margin = 56;
  const [fn1, fn2] = [
    (x, y) => system.f(x, y)[0],
    (x, y) => system.f(x, y)[1],
  ];
  const segments1 = marchingSquaresSegments(fn1, bounds);
  const segments2 = marchingSquaresSegments(fn2, bounds);

  const toPixel = (point) => ({
    x: mapValue(point.x, bounds.xMin, bounds.xMax, margin, width - margin),
    y: mapValue(point.y, bounds.yMin, bounds.yMax, height - margin, margin),
  });

  const lineElements = [];
  for (const [startPoint, endPoint] of segments1) {
    const start = toPixel(startPoint);
    const end = toPixel(endPoint);
    lineElements.push(
      `<line x1="${start.x.toFixed(2)}" y1="${start.y.toFixed(2)}" x2="${end.x.toFixed(2)}" y2="${end.y.toFixed(2)}" stroke="#c44938" stroke-width="1.8"/>`,
    );
  }
  for (const [startPoint, endPoint] of segments2) {
    const start = toPixel(startPoint);
    const end = toPixel(endPoint);
    lineElements.push(
      `<line x1="${start.x.toFixed(2)}" y1="${start.y.toFixed(2)}" x2="${end.x.toFixed(2)}" y2="${end.y.toFixed(2)}" stroke="#197278" stroke-width="1.8"/>`,
    );
  }

  const legend = [
    `<rect x="${width - 260}" y="${margin}" width="204" height="82" rx="16" fill="#fffdf8" stroke="#d9d0c3"/>`,
    `<line x1="${width - 236}" y1="${margin + 28}" x2="${width - 196}" y2="${margin + 28}" stroke="#c44938" stroke-width="2.4"/>`,
    `<text x="${width - 186}" y="${margin + 33}" fill="#332d28" font-size="15">F1(x, y) = 0</text>`,
    `<line x1="${width - 236}" y1="${margin + 56}" x2="${width - 196}" y2="${margin + 56}" stroke="#197278" stroke-width="2.4"/>`,
    `<text x="${width - 186}" y="${margin + 61}" fill="#332d28" font-size="15">F2(x, y) = 0</text>`,
  ];

  const svg = [
    svgHeader(width, height),
    `<rect width="${width}" height="${height}" fill="#f6f1e8"/>`,
    `<text x="${margin}" y="34" fill="#332d28" font-size="24" font-family="Menlo, Consolas, monospace">Система: ${system.name}</text>`,
    ...buildAxes(bounds, width, height, margin),
    ...lineElements,
    ...buildPointMarker(marker, bounds, width, height, margin, "#6b3bb8"),
    ...legend,
    "</svg>",
  ].join("\n");

  return { svg, bounds };
}
