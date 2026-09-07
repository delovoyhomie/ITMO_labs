function svgHeader(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">`;
}

function mapValue(value, fromMin, fromMax, toMin, toMax) {
  return toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function buildBoundaryLine(value, label, bounds, width, height, margin, color) {
  if (value < bounds.xMin || value > bounds.xMax) {
    return [];
  }
  const top = margin;
  const bottom = height - margin;
  const x = mapValue(value, bounds.xMin, bounds.xMax, margin, width - margin);
  return [
    `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="${color}" stroke-width="1.6" stroke-dasharray="6 4"/>`,
    `<text x="${x + 4}" y="${bottom - 8}" fill="${color}" font-size="12" font-family="Menlo, Consolas, monospace">${label}</text>`,
  ];
}

function quadraticInterpolate(x0, y0, x1, y1, x2, y2, x) {
  const l0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
  const l1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
  const l2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
  return y0 * l0 + y1 * l1 + y2 * l2;
}

function buildMethodOverlay(evaluator, method, a, b, count, toPixelX, toPixelY, zeroPixelY, yClip) {
  const fillColor = "#1f6f8b";
  const fillOpacity = 0.16;
  const strokeColor = "#155b73";
  const clampY = (value) => (yClip !== undefined ? clamp(value, -yClip, yClip) : value);
  const sampleY = (x) => {
    const y = evaluator.tryEvaluate(x);
    return clampY(y === null ? 0 : y);
  };
  const node = (x) => `<circle cx="${toPixelX(x).toFixed(2)}" cy="${toPixelY(sampleY(x)).toFixed(2)}" r="2.6" fill="${strokeColor}"/>`;
  const elements = [];

  if (method === "leftRect" || method === "rightRect" || method === "middleRect") {
    const n = Math.max(1, count);
    const h = (b - a) / n;
    for (let i = 0; i < n; i += 1) {
      const x0 = a + i * h;
      const x1 = x0 + h;
      const xs = method === "leftRect" ? x0 : method === "rightRect" ? x1 : (x0 + x1) / 2;
      const py = toPixelY(sampleY(xs)).toFixed(2);
      const px0 = toPixelX(x0).toFixed(2);
      const px1 = toPixelX(x1).toFixed(2);
      const z = zeroPixelY.toFixed(2);
      elements.push(
        `<path d="M ${px0} ${z} L ${px0} ${py} L ${px1} ${py} L ${px1} ${z} Z" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="1"/>`,
      );
      elements.push(node(xs));
    }
  } else if (method === "trapezoid") {
    const n = Math.max(1, count);
    const h = (b - a) / n;
    for (let i = 0; i < n; i += 1) {
      const x0 = a + i * h;
      const x1 = x0 + h;
      const px0 = toPixelX(x0).toFixed(2);
      const px1 = toPixelX(x1).toFixed(2);
      const py0 = toPixelY(sampleY(x0)).toFixed(2);
      const py1 = toPixelY(sampleY(x1)).toFixed(2);
      const z = zeroPixelY.toFixed(2);
      elements.push(
        `<path d="M ${px0} ${z} L ${px0} ${py0} L ${px1} ${py1} L ${px1} ${z} Z" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="1"/>`,
      );
    }
    for (let i = 0; i <= n; i += 1) elements.push(node(a + i * h));
  } else if (method === "simpson") {
    const n = count % 2 === 0 ? Math.max(2, count) : Math.max(2, count + 1);
    const h = (b - a) / n;
    const segments = 28;
    for (let k = 0; k < n; k += 2) {
      const x0 = a + k * h;
      const x1 = a + (k + 1) * h;
      const x2 = a + (k + 2) * h;
      const y0 = sampleY(x0);
      const y1 = sampleY(x1);
      const y2 = sampleY(x2);
      let d = `M ${toPixelX(x0).toFixed(2)} ${zeroPixelY.toFixed(2)} L ${toPixelX(x0).toFixed(2)} ${toPixelY(y0).toFixed(2)}`;
      for (let s = 1; s <= segments; s += 1) {
        const x = x0 + ((x2 - x0) * s) / segments;
        const y = clampY(quadraticInterpolate(x0, y0, x1, y1, x2, y2, x));
        d += ` L ${toPixelX(x).toFixed(2)} ${toPixelY(y).toFixed(2)}`;
      }
      d += ` L ${toPixelX(x2).toFixed(2)} ${zeroPixelY.toFixed(2)} Z`;
      elements.push(`<path d="${d}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="1.4"/>`);
    }
    for (let i = 0; i <= n; i += 1) elements.push(node(a + i * h));
  }
  return elements;
}

export function createIntegralGraphSvg(evaluator, options) {
  const {
    a,
    b,
    width = 960,
    height = 560,
    samples = 800,
    bounds: requestedBounds,
    viewRange,
    yClip,
    areaLabel,
    overlay,
  } = options;

  const toNumber = (value, fallback) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const xMin = toNumber(requestedBounds?.xMin, toNumber(viewRange?.[0], a));
  const xMax = toNumber(requestedBounds?.xMax, toNumber(viewRange?.[1], b));

  const points = [];
  for (let index = 0; index <= samples; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / samples;
    let y = evaluator.tryEvaluate(x);
    if (y === null) {
      points.push({ x, y: null });
      continue;
    }
    if (yClip !== undefined) {
      y = clamp(y, -yClip, yClip);
    }
    points.push({ x, y });
  }

  const finiteYs = points.filter((point) => point.y !== null).map((point) => point.y);
  if (finiteYs.length < 2) {
    throw new Error("Недостаточно данных для построения графика функции.");
  }

  const minY = Math.min(...finiteYs, 0);
  const maxY = Math.max(...finiteYs, 0);
  const padding = Math.max(1e-6, (maxY - minY) * 0.1 || 1);
  const bounds = {
    xMin,
    xMax,
    yMin: toNumber(requestedBounds?.yMin, minY - padding),
    yMax: toNumber(requestedBounds?.yMax, maxY + padding),
  };
  const margin = 56;
  const left = margin;
  const right = width - margin;
  const top = margin;
  const bottom = height - margin;

  const toPixelX = (value) => mapValue(value, bounds.xMin, bounds.xMax, left, right);
  const toPixelY = (value) => clamp(mapValue(value, bounds.yMin, bounds.yMax, bottom, top), top, bottom);
  const zeroPixelY = toPixelY(0);

  const areaLeft = Math.max(a, bounds.xMin);
  const areaRight = Math.min(b, bounds.xMax);
  const areaCommands = [];
  if (areaRight > areaLeft) {
    const areaSamples = 240;
    areaCommands.push(`M ${toPixelX(areaLeft).toFixed(2)} ${zeroPixelY.toFixed(2)}`);
    for (let index = 0; index <= areaSamples; index += 1) {
      const x = areaLeft + ((areaRight - areaLeft) * index) / areaSamples;
      const y = evaluator.tryEvaluate(x);
      const clippedY = y === null ? (yClip ?? bounds.yMax) : yClip !== undefined ? clamp(y, -yClip, yClip) : y;
      areaCommands.push(`L ${toPixelX(x).toFixed(2)} ${toPixelY(clippedY).toFixed(2)}`);
    }
    areaCommands.push(`L ${toPixelX(areaRight).toFixed(2)} ${zeroPixelY.toFixed(2)}`);
    areaCommands.push("Z");
  }

  let pathCommands = "";
  let penDown = false;
  for (const point of points) {
    if (point.y === null) {
      penDown = false;
      continue;
    }
    const px = toPixelX(point.x);
    const py = toPixelY(point.y);
    pathCommands += `${penDown ? "L" : "M"} ${px.toFixed(2)} ${py.toFixed(2)} `;
    penDown = true;
  }

  const areaCaption = areaLabel ?? `∫ f(x) dx, x ∈ [${formatMarkerValue(a)}, ${formatMarkerValue(b)}]`;

  let overlayMarkup = "";
  let overlayLegend = "";
  if (overlay && overlay.method && overlay.partitionCount > 0 && b > a) {
    const innerWidth = width - margin * 2;
    const innerHeight = height - margin * 2;
    const clipId = `plot-clip-${Math.round(width)}x${Math.round(height)}`;
    const overlayElements = buildMethodOverlay(
      evaluator,
      overlay.method,
      a,
      b,
      overlay.partitionCount,
      toPixelX,
      toPixelY,
      zeroPixelY,
      yClip,
    );
    if (overlayElements.length > 0) {
      overlayMarkup = [
        `<clipPath id="${clipId}"><rect x="${left}" y="${top}" width="${innerWidth}" height="${innerHeight}"/></clipPath>`,
        `<g clip-path="url(#${clipId})">${overlayElements.join("")}</g>`,
      ].join("\n");
      const legendY = top + 18;
      const legendText = overlay.label ? overlay.label : `N=${overlay.partitionCount}`;
      overlayLegend = [
        `<rect x="${left + 12}" y="${legendY - 9}" width="16" height="11" rx="2" fill="#1f6f8b" fill-opacity="0.16" stroke="#155b73" stroke-width="1"/>`,
        `<text x="${left + 34}" y="${legendY}" fill="#155b73" font-size="13" font-family="Menlo, Consolas, monospace">${legendText}</text>`,
      ].join("\n");
    }
  }

  const svg = [
    svgHeader(width, height),
    `<rect width="${width}" height="${height}" fill="#f6f1e8"/>`,
    `<text x="${margin}" y="34" fill="#332d28" font-size="22" font-family="Menlo, Consolas, monospace">График: ${evaluator.name}</text>`,
    ...buildAxes(bounds, width, height, margin),
    areaCommands.length > 0
      ? `<path d="${areaCommands.join(" ")}" fill="#c44938" fill-opacity="0.16" stroke="none"/>`
      : "",
    overlayMarkup,
    ...buildBoundaryLine(a, "a", bounds, width, height, margin, "#2f6f73"),
    ...buildBoundaryLine(b, "b", bounds, width, height, margin, "#2f6f73"),
    `<path d="${pathCommands.trim()}" stroke="#c44938" stroke-width="2.4" fill="none"/>`,
    overlayLegend,
    `<text x="${margin}" y="${height - 14}" fill="#8f2d21" font-size="13" font-family="Menlo, Consolas, monospace">${areaCaption}</text>`,
    "</svg>",
  ]
    .filter(Boolean)
    .join("\n");

  return { svg, bounds };
}
