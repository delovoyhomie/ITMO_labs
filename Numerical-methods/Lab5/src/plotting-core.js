import { FUNCTIONS } from './interpolation.js';
import { formatNumber as f, escapeXml as e } from './utils.js';

export function graphBounds(solution) {
  const points = solution.points;
  let xMin = Math.min(points[0].x, solution.x), xMax = Math.max(points.at(-1).x, solution.x);
  const margin = (xMax - xMin) * 0.06;
  xMin -= margin; xMax += margin;
  const model = solution.models.find(m => m.applicable && m.id.startsWith('divided'));
  const ys = points.map(p => p.y);
  for (let i = 0; i <= 200; i++) {
    const y = model.evaluate(xMin + (xMax - xMin) * i / 200);
    if (Number.isFinite(y)) ys.push(y);
  }
  if (Number.isFinite(solution.exact)) ys.push(solution.exact);
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  const yMargin = (yMax - yMin || Math.max(1, Math.abs(yMin) * 0.1)) * 0.1;
  return { xMin, xMax, yMin: yMin - yMargin, yMax: yMax + yMargin };
}

export function createGraphSvg(solution, bounds = graphBounds(solution)) {
  const { xMin, xMax, yMin, yMax } = bounds;
  const sx = x => 76 + (x - xMin) / (xMax - xMin) * 850;
  const sy = y => 440 - (y - yMin) / (yMax - yMin) * 400;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" role="img" aria-label="График интерполяции">
  <rect width="960" height="520" fill="white"/><defs><clipPath id="plotClip"><rect x="76" y="40" width="850" height="400"/></clipPath></defs>
  <style>text{font-family:Arial,sans-serif;font-size:13px;fill:#526278}.grid{stroke:#e5ecf5;stroke-width:1}</style>`];
  for (let i = 0; i <= 6; i++) {
    const x = xMin + (xMax - xMin) * i / 6, y = yMin + (yMax - yMin) * i / 6;
    parts.push(`<path class="grid" d="M${sx(x)} 40V440 M76 ${sy(y)}H926"/>
      <text x="${sx(x)}" y="466" text-anchor="middle">${e(f(x, 3))}</text>
      <text x="65" y="${sy(y) + 4}" text-anchor="end">${e(f(y, 3))}</text>`);
  }
  parts.push('<path d="M76 40V440H926" fill="none" stroke="#64748b"/><text x="940" y="444">x</text><text x="65" y="26">y</text>');
  const fn = FUNCTIONS.find(fn => fn.id === solution.functionId);
  const preferredId = solution.preferred.startsWith('I ') ? 'divided-forward' : 'divided-backward';
  const model = solution.models.find(m => m.id === preferredId && m.applicable) ?? solution.models.find(m => m.applicable);
  function curve(evaluate, color, dashed = false) {
    let d = '', pen = false;
    for (let i = 0; i <= 400; i++) {
      const x = xMin + (xMax - xMin) * i / 400, y = evaluate(x);
      if (!Number.isFinite(y)) { pen = false; continue; }
      const px = sx(x), py = sy(y);
      if (!Number.isFinite(px) || !Number.isFinite(py) || Math.abs(py) > 1e8) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)} `; pen = true;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" ${dashed ? 'stroke-dasharray="8 6"' : ''} clip-path="url(#plotClip)"/>`;
  }
  const tablePath = solution.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${sx(point.x).toFixed(2)},${sy(point.y).toFixed(2)}`)
    .join(' ');
  parts.push(curve(model.evaluate, '#2f5fa7'));
  if (fn) parts.push(curve(fn.evaluate, '#cc7045', true));
  else parts.push(`<path d="${tablePath}" fill="none" stroke="#cc7045" stroke-width="2.4" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#plotClip)"/>`);
  parts.push('<g clip-path="url(#plotClip)">');
  for (const p of solution.points) parts.push(`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="4.5" fill="white" stroke="#1f2937" stroke-width="2"/>`);
  const py = sy(model.evaluate(solution.x));
  if (Number.isFinite(py)) parts.push(`<path d="M${sx(solution.x)} 40V440" stroke="#3d7c55" stroke-dasharray="5 5"/><circle cx="${sx(solution.x)}" cy="${py}" r="6" fill="#3d7c55"/>`);
  parts.push('</g>');
  const legend = [
    ['#2f5fa7', 'Полином Ньютона'],
    ['#cc7045', fn ? `f(x) = ${fn.label}` : 'Табличные данные'],
    ['#1f2937', 'Узлы'],
    ['#3d7c55', `x* = ${f(solution.x, 4)}`],
  ];
  legend.forEach(([color, label], i) => parts.push(`<line x1="${76 + i * 210}" x2="${100 + i * 210}" y1="500" y2="500" stroke="${color}" stroke-width="3"/><text x="${108 + i * 210}" y="505">${e(label)}</text>`));
  parts.push('</svg>');
  return parts.join('');
}
