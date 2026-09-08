import { validatePoints, FUNCTIONS } from './interpolation.js';
import { parseNumber, formatNumber as f } from './utils.js';

export function parseDataset(text) {
  text = text.replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error('Файл пуст.');
  let points, targets = [], functionId = null;
  if (/^[\[{]/.test(text)) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Некорректный JSON.'); }
    if (Array.isArray(data)) points = data;
    else if (Array.isArray(data.points)) points = data.points;
    else if (Array.isArray(data.x) && Array.isArray(data.y) && data.x.length === data.y.length) {
      points = data.x.map((x, i) => ({ x, y: data.y[i] }));
    } else throw new Error('Нужны points либо массивы x и y одинаковой длины.');
    const rawTargets = Array.isArray(data) ? [] : (data.targets ?? (data.target === undefined ? [] : [data.target]));
    if (!Array.isArray(rawTargets)) throw new Error('targets должен быть массивом.');
    targets = rawTargets.map(x => parseNumber(x, 'Аргумент'));
    functionId = data.functionId ?? null;
  } else {
    const rows = text.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
    if (/^x(?:\s+|;)y$/i.test(rows[0] ?? '')) rows.shift();
    points = rows.map((row, i) => {
      const values = row.includes(';') ? row.split(';').map(s => s.trim()) : row.split(/\s+/);
      if (values.length !== 2) throw new Error(`Строка ${i + 1}: нужны ровно два числа; разделитель — пробел или точка с запятой.`);
      return values;
    });
  }
  points = validatePoints(points);
  if (functionId) {
    const fn = FUNCTIONS.find(item => item.id === functionId);
    if (!fn || points.some(p => !Number.isFinite(fn.evaluate(p.x)) || Math.abs(p.y - fn.evaluate(p.x)) > 1e-12 * Math.max(1, Math.abs(p.y)))) {
      throw new Error('Метка functionId не соответствует значениям таблицы. Удалите её для произвольных данных.');
    }
  }
  return { points, targets, functionId };
}

export function formatTable(points, table, divided = false) {
  const headers = ['i', 'x', 'y', ...table.slice(1).map((_, i) => divided ? `f[${i + 1}]` : `Δ^${i + 1}y`)];
  const rows = points.map((p, i) => [String(i), f(p.x), ...table.map(column => column[i] === undefined ? '' : f(column[i]))]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(row => row[i].length)));
  return [headers, ...rows].map(row => row.map((v, i) => v.padEnd(widths[i])).join('  ').trimEnd()).join('\n');
}

export function formatSolution(solution) {
  const { points, x, h, divided, finite, models, preferred, spread, warnings, exact } = solution;
  const lines = ['Лабораторная работа №5. Интерполяция функции. Вариант 19.',
    `Точек: ${points.length}; x = ${f(x)}; шаг: ${h === null ? 'неравномерная сетка' : f(h)}.`,
    `Рекомендуемая формула Ньютона: ${preferred}.`, '', 'Таблица разделённых разностей:', formatTable(points, divided, true)];
  if (finite) lines.push('', 'Таблица конечных разностей:', formatTable(points, finite));
  lines.push('', 'Сравнение методов (все используют полный набор узлов):');
  for (const model of models) {
    lines.push(`${model.label}${model.extra ? ' [доп.]' : ''}: ${model.applicable ? f(model.value, 12) : `не применим — ${model.reason}`}`);
  }
  lines.push(`Максимальное расхождение применимых методов: ${f(spread)}.`);
  if (exact !== null) {
    lines.push(`Исходная функция: f(x) = ${f(exact, 12)}.`);
    for (const m of models.filter(m => m.applicable && !m.extra)) lines.push(`|${m.label} − f(x)| = ${f(Math.abs(m.value - exact), 12)}`);
  } else lines.push('Точная исходная функция неизвестна: расхождение методов не является погрешностью интерполяции.');
  if (h !== null && points.length % 2 === 1) {
    const t = (x - points[(points.length - 1) / 2].x) / h;
    lines.push(`Центральный аргумент t = ${f(t)}; Стирлинг рекомендуется при |t| ≤ 0.25.`);
  } else if (h !== null) {
    const t = (x - points[points.length / 2 - 1].x) / h;
    lines.push(`Аргумент Бесселя t = ${f(t)}; рекомендуемая область 0.25 ≤ t ≤ 0.75.`);
  }
  lines.push(...warnings.map(w => `Предупреждение: ${w}`));
  return lines.join('\n');
}
