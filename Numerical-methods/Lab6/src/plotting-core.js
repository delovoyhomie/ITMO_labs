import { formatNumber as f, escapeXml as e } from "./utils.js";

export const METHOD_COLORS = { euler: "#cc7045", rk4: "#2f5fa7", adams: "#7c4fa0" };
export const EXACT_COLOR = "#3d7c55";

export function graphBounds(solution) {
  const { nodes, exactValues, results } = solution;
  const xMin = nodes[0], xMax = nodes.at(-1);
  const ys = exactValues.filter(Number.isFinite);
  for (const result of results.filter(r => r.applicable)) ys.push(...result.values.filter(Number.isFinite));
  if (!ys.length) return { xMin, xMax, yMin: -1, yMax: 1 };
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  // Выбросы расходящегося метода не должны сплющивать остальные кривые.
  const reference = exactValues.filter(Number.isFinite);
  if (reference.length) {
    const span = Math.max(Math.max(...reference) - Math.min(...reference), Math.abs(Math.max(...reference)), 1);
    yMin = Math.max(yMin, Math.min(...reference) - 4 * span);
    yMax = Math.min(yMax, Math.max(...reference) + 4 * span);
  }
  const margin = (yMax - yMin || Math.max(1, Math.abs(yMin) * 0.1)) * 0.1;
  return { xMin, xMax, yMin: yMin - margin, yMax: yMax + margin };
}

export function createGraphSvg(solution, bounds = graphBounds(solution)) {
  const { xMin, xMax, yMin, yMax } = bounds;
  const sx = x => 76 + (x - xMin) / (xMax - xMin) * 850;
  const sy = y => 440 - (y - yMin) / (yMax - yMin) * 400;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 545" role="img" aria-label="График решения задачи Коши">
  <rect width="960" height="545" fill="white"/><defs><clipPath id="plotClip"><rect x="76" y="40" width="850" height="400"/></clipPath></defs>
  <style>text{font-family:Arial,sans-serif;font-size:13px;fill:#526278}.grid{stroke:#e5ecf5;stroke-width:1}</style>`];
  for (let i = 0; i <= 6; i++) {
    const x = xMin + (xMax - xMin) * i / 6, y = yMin + (yMax - yMin) * i / 6;
    parts.push(`<path class="grid" d="M${sx(x)} 40V440 M76 ${sy(y)}H926"/>
      <text x="${sx(x)}" y="466" text-anchor="middle">${e(f(x, 3))}</text>
      <text x="65" y="${sy(y) + 4}" text-anchor="end">${e(f(y, 3))}</text>`);
  }
  parts.push('<path d="M76 40V440H926" fill="none" stroke="#64748b"/><text x="940" y="444">x</text><text x="65" y="26">y</text>');

  const line = (xs, ys, color, width, dash) => {
    let d = "", pen = false;
    for (let i = 0; i < xs.length; i++) {
      const y = ys[i];
      if (!Number.isFinite(y)) { pen = false; continue; }
      const px = sx(xs[i]), py = sy(y);
      if (!Number.isFinite(px) || !Number.isFinite(py) || Math.abs(py) > 1e7) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)} `; pen = true;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${dash ? 'stroke-dasharray="8 6"' : ""} clip-path="url(#plotClip)"/>`;
  };

  // Точное решение строится по плотной сетке, приближённые — по узлам своего метода.
  const dense = Array.from({ length: 401 }, (_, i) => xMin + (xMax - xMin) * i / 400);
  parts.push(line(dense, dense.map(solution.exact), EXACT_COLOR, 3.5, false));
  const applicable = solution.results.filter(r => r.applicable);
  for (const result of applicable) {
    parts.push(line(solution.nodes, result.values, METHOD_COLORS[result.id] ?? "#94a3b8", 2.4, true));
  }
  parts.push('<g clip-path="url(#plotClip)">');
  for (const result of applicable) {
    for (let i = 0; i < solution.nodes.length; i++) {
      const py = sy(result.values[i]);
      if (!Number.isFinite(py) || Math.abs(py) > 1e7) continue;
      parts.push(`<circle cx="${sx(solution.nodes[i]).toFixed(2)}" cy="${py.toFixed(2)}" r="3.4" fill="white" stroke="${METHOD_COLORS[result.id] ?? "#94a3b8"}" stroke-width="2"/>`);
    }
  }
  parts.push("</g>");

  const legend = [[EXACT_COLOR, "Точное решение"], ...applicable.map(r => [METHOD_COLORS[r.id] ?? "#94a3b8", r.label])];
  legend.forEach(([color, label], i) => {
    const x = 76 + (i % 2) * 460, y = 494 + Math.floor(i / 2) * 20;
    parts.push(`<line x1="${x}" x2="${x + 24}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="3"/><text x="${x + 32}" y="${y + 5}">${e(label)}</text>`);
  });
  parts.push("</svg>");
  return parts.join("");
}

// Отдельный график погрешности |y точн − y_i| в логарифмическом масштабе по y.
export function createErrorSvg(solution) {
  const applicable = solution.results.filter(r => r.applicable);
  const series = applicable.map(result => ({
    result,
    values: solution.nodes.map((x, i) => Math.abs(solution.exactValues[i] - result.values[i])),
  }));
  const positive = series.flatMap(s => s.values).filter(v => Number.isFinite(v) && v > 0);
  if (!positive.length) return createGraphSvg(solution);
  const low = Math.floor(Math.log10(Math.min(...positive))) - 0.2;
  const high = Math.ceil(Math.log10(Math.max(...positive))) + 0.2;
  const xMin = solution.nodes[0], xMax = solution.nodes.at(-1);
  const sx = x => 86 + (x - xMin) / (xMax - xMin) * 840;
  const sy = v => 440 - (Math.log10(Math.max(v, 10 ** low)) - low) / (high - low) * 400;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 545" role="img" aria-label="График погрешности">
  <rect width="960" height="545" fill="white"/>
  <style>text{font-family:Arial,sans-serif;font-size:13px;fill:#526278}.grid{stroke:#e5ecf5;stroke-width:1}</style>`];
  for (let power = Math.ceil(low); power <= Math.floor(high); power++) {
    parts.push(`<path class="grid" d="M86 ${sy(10 ** power)}H926"/><text x="76" y="${sy(10 ** power) + 4}" text-anchor="end">1e${power}</text>`);
  }
  for (let i = 0; i <= 6; i++) {
    const x = xMin + (xMax - xMin) * i / 6;
    parts.push(`<path class="grid" d="M${sx(x)} 40V440"/><text x="${sx(x)}" y="466" text-anchor="middle">${e(f(x, 3))}</text>`);
  }
  parts.push('<path d="M86 40V440H926" fill="none" stroke="#64748b"/><text x="940" y="444">x</text><text x="86" y="26">|y точн − y|</text>');
  for (const { result, values } of series) {
    const color = METHOD_COLORS[result.id] ?? "#94a3b8";
    let d = "";
    values.forEach((v, i) => { if (Number.isFinite(v)) d += `${d ? "L" : "M"}${sx(solution.nodes[i]).toFixed(2)},${sy(v).toFixed(2)} `; });
    parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.6"/>`);
    values.forEach((v, i) => { if (Number.isFinite(v)) parts.push(`<circle cx="${sx(solution.nodes[i]).toFixed(2)}" cy="${sy(v).toFixed(2)}" r="3.2" fill="${color}"/>`); });
  }
  applicable.forEach((result, i) => {
    const x = 86 + (i % 2) * 460, y = 494 + Math.floor(i / 2) * 20;
    parts.push(`<line x1="${x}" x2="${x + 24}" y1="${y}" y2="${y}" stroke="${METHOD_COLORS[result.id] ?? "#94a3b8"}" stroke-width="3"/><text x="${x + 32}" y="${y + 5}">${e(result.label)}</text>`);
  });
  parts.push("</svg>");
  return parts.join("");
}
