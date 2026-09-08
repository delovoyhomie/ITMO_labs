import { VARIANT19, FUNCTIONS, generatePoints, solve } from '/src/interpolation.js';
import { parseDataset, formatSolution } from '/src/io.js';
import { formatNumber as f, escapeXml as e } from '/src/utils.js';
import { createGraphSvg, graphBounds } from '/src/plotting-core.js';

let points = structuredClone(VARIANT19.points), functionId = null, solution, bounds;
const root = document.querySelector('#root');
root.innerHTML = `<div class="page-shell">
  <header class="hero panel"><div class="hero-copy"><span class="eyebrow">Вычислительная математика · ЛР №5</span>
    <h1>Интерполяция функции</h1><p class="hero-text">Задайте узлы и найдите значение функции между ними. Сравните многочлен Лагранжа и обе формулы Ньютона.</p>
    <div class="coordinate-strip"><div class="coordinate-chip"><span class="coordinate-chip-label">Вариант</span><span class="coordinate-chip-value">19 · таблица 1.4</span></div><div class="coordinate-chip"><span class="coordinate-chip-label">Аргументы</span><span class="coordinate-chip-value">1.573 / 1.375</span></div></div></div>
    <aside class="hero-note"><span class="eyebrow">Условие интерполяции</span><p class="model-formula">P(xᵢ) = yᵢ</p><p>Все методы используют один набор узлов. Совпадение результатов проверяет вычисления, но не определяет погрешность относительно исходной функции.</p></aside></header>
  <div class="workspace-grid"><section class="panel control-panel" aria-labelledby="input-title">
    <div class="panel-topline"><h2 id="input-title">Исходные данные</h2><span class="status-pill" id="source-label">Таблица</span></div>
    <label class="field"><span class="field-label">Готовый набор</span><select id="preset"><option value="variant19">Вариант 19</option><option value="uneven-quadratic">Неравномерная сетка</option><option value="cubic-even">Кубический полином · 6 узлов</option></select></label>
    <div class="upload-row"><label class="ghost-button file-button">Загрузить файл<input class="file-input" id="file" type="file" accept=".json,.txt,.csv"/></label><span class="field-hint">JSON или пары x y; десятичная запятая поддерживается.</span></div>
    <details class="hint-box"><summary>Получить точки из функции</summary><div class="input-stack">
      <label class="field"><span class="field-label">Функция</span><select id="function">${FUNCTIONS.map(fn => `<option value="${fn.id}">${fn.label}</option>`).join('')}</select></label>
      <div class="interval-fields"><label class="field"><span class="field-label">От a</span><input id="a" value="0" inputmode="decimal"/></label><label class="field"><span class="field-label">До b</span><input id="b" value="3.141592653589793" inputmode="decimal"/></label><label class="field"><span class="field-label">Число точек</span><input id="count" value="7" inputmode="numeric"/></label></div>
      <button class="ghost-button" id="generate">Сформировать таблицу</button></div></details>
    <div class="points-editor-header"><span class="field-label">Узлы интерполяции</span><button class="ghost-button" id="add">+ Точка</button></div>
    <div class="points-editor"><table class="points-table"><thead><tr><th>№</th><th>x</th><th>y</th><th></th></tr></thead><tbody id="points"></tbody></table></div>
    <label class="field"><span class="field-label">Аргумент интерполяции x*</span><input id="target" value="1.573" inputmode="decimal"/></label>
    <div class="action-row"><button class="ghost-button" id="x1">X₁ = 1.573</button><button class="ghost-button" id="x2">X₂ = 1.375</button></div>
    <button class="solve-button" id="solve">Вычислить</button><div id="error" role="alert" hidden></div>
  </section><div id="results" class="results-stack" aria-live="polite"></div></div></div>`;

const $ = selector => document.querySelector(selector);
function rows() {
  $('#points').innerHTML = points.map((p, i) => `<tr><td>${i + 1}</td><td><input data-index="${i}" data-key="x" aria-label="x ${i + 1}" value="${e(p.x)}" inputmode="decimal"/></td><td><input data-index="${i}" data-key="y" aria-label="y ${i + 1}" value="${e(p.y)}" inputmode="decimal"/></td><td><button class="point-delete-button" data-delete="${i}" aria-label="Удалить точку ${i + 1}" ${points.length <= 2 ? 'disabled' : ''}>×</button></td></tr>`).join('');
  $('#add').disabled = points.length >= 50;
  $('#source-label').textContent = functionId ? FUNCTIONS.find(f => f.id === functionId).label : 'Таблица';
}
function error(message) { $('#error').hidden = false; $('#error').className = 'error-box'; $('#error').textContent = message; }
function stale() {
  solution = null;
  $('#results').innerHTML = '<section class="panel panel-empty"><h2>Данные изменены</h2><p>Нажмите «Вычислить», чтобы обновить результаты и график.</p></section>';
  $('#error').hidden = true;
}
function table(title, data, divided) {
  return `<section class="panel table-panel"><h2>${title}</h2><div class="table-shell scroll-table" tabindex="0" aria-label="${title}"><table class="values-table difference-table"><thead><tr><th>i</th><th>xᵢ</th>${data.map((_, k) => `<th>${k === 0 ? 'yᵢ' : divided ? `f[xᵢ,…,xᵢ₊${k}]` : `Δ${k}yᵢ`}</th>`).join('')}</tr></thead><tbody>${solution.points.map((p, i) => `<tr><td>${i}</td><td>${f(p.x, 5)}</td>${data.map(col => `<td>${col[i] === undefined ? '' : f(col[i], 6)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function modelRows(models) {
  const reference = solution.models.find(m => m.id === 'lagrange' && m.applicable)?.value;
  return models.map(m => `<tr><td>${e(m.label)}</td><td>${m.applicable ? f(m.value, 12) : `<span class="model-error">${e(m.reason)}</span>`}</td><td>${m.applicable && reference !== undefined ? f(Math.abs(m.value - reference)) : '—'}</td>${solution.exact !== null ? `<td>${m.applicable ? f(Math.abs(m.value - solution.exact), 12) : '—'}</td>` : ''}</tr>`).join('');
}
function resultsTable(models) {
  return `<div class="table-shell scroll-table"><table class="values-table result-table"><thead><tr><th>Метод</th><th>P(x*)</th><th>|P − L|</th>${solution.exact !== null ? '<th>|P − f|</th>' : ''}</tr></thead><tbody>${modelRows(models)}</tbody></table></div>`;
}
function calculate() {
  try {
    solution = solve(points, $('#target').value, functionId);
    bounds = graphBounds(solution);
    $('#error').hidden = true;
    $('#results').innerHTML = `<section class="panel metrics-panel"><div class="panel-topline"><h2>Результаты в точке ${f(solution.x)}</h2><span class="status-pill">${solution.points.length} узлов</span></div>
      <div class="metrics-grid"><div class="metric-card"><span class="metric-label">Шаг сетки</span><strong class="metric-value">${solution.h === null ? 'Неравномерный' : f(solution.h)}</strong></div><div class="metric-card"><span class="metric-label">Ньютон: выбор формулы</span><strong class="metric-value">${solution.preferred}</strong></div><div class="metric-card"><span class="metric-label">Расхождение методов</span><strong class="metric-value">${f(solution.spread)}</strong></div></div>
      ${solution.warnings.map(w => `<p class="warning-note">${e(w)}</p>`).join('')}
      ${resultsTable(solution.models.filter(m => !m.extra))}
      ${solution.exact !== null ? `<p class="field-hint">Исходная функция: f(x*) = ${f(solution.exact, 12)}. Последний столбец показывает абсолютную погрешность.</p>` : '<p class="field-hint">Исходная функция задана только узлами. Её точное значение между узлами неизвестно.</p>'}
      <details><summary>Гаусс, Стирлинг и Бессель</summary><p class="field-hint">Полные центральные схемы: Гаусс и Стирлинг — нечётное число узлов, Бессель — чётное. Все требуют равномерной сетки. Для Стирлинга рекомендуется |t| ≤ 0.25, для Бесселя — 0.25 ≤ t ≤ 0.75 относительно центра таблицы.</p>${resultsTable(solution.models.filter(m => m.extra))}</details></section>
      <section class="panel graph-panel"><div class="panel-topline"><h2>График интерполяции</h2><div class="graph-controls"><button class="ghost-button graph-step-button" id="zoom-in" aria-label="Увеличить">+</button><button class="ghost-button graph-step-button" id="zoom-out" aria-label="Уменьшить">−</button><button class="ghost-button graph-reset-button" id="reset">Сбросить</button></div></div><div class="graph-frame interactive-graph-frame" id="graph"></div><p class="field-hint">Масштаб — колесом мыши, перемещение — перетаскиванием. ${functionId ? 'Исходная функция показана оранжевым пунктиром.' : 'Узлы отмечены кружками; исходная аналитическая функция не задана.'}</p><button class="ghost-button" id="save-graph">Скачать SVG</button></section>
      ${solution.finite ? table('Таблица конечных разностей', solution.finite, false) : ''}
      ${table('Таблица разделённых разностей', solution.divided, true)}
      <section class="panel output-panel"><div class="panel-topline"><h2>Текстовый отчёт</h2><button class="ghost-button" id="save-text">Скачать TXT</button></div><details><summary>Показать полный вывод</summary><pre class="result-text">${e(formatSolution(solution))}</pre></details></section>`;
    draw(); graphEvents();
    $('#save-text').onclick = () => download(formatSolution(solution), 'lab5-result.txt', 'text/plain');
    $('#save-graph').onclick = () => download(createGraphSvg(solution, bounds), 'lab5-interpolation.svg', 'image/svg+xml');
  } catch (err) { stale(); error(err.message); }
}
function draw() { $('#graph').innerHTML = createGraphSvg(solution, bounds); }
function zoom(factor) {
  const cx = (bounds.xMin + bounds.xMax) / 2, cy = (bounds.yMin + bounds.yMax) / 2;
  const dx = (bounds.xMax - bounds.xMin) * factor / 2, dy = (bounds.yMax - bounds.yMin) * factor / 2;
  if (![cx, cy, dx, dy].every(Number.isFinite) || dx < 1e-12 || dy < 1e-12 || dx > 1e8 || dy > 1e12) return;
  bounds = { xMin: cx - dx, xMax: cx + dx, yMin: cy - dy, yMax: cy + dy }; draw();
}
function graphEvents() {
  $('#zoom-in').onclick = () => zoom(0.8); $('#zoom-out').onclick = () => zoom(1.25);
  $('#reset').onclick = () => { bounds = graphBounds(solution); draw(); };
  const graph = $('#graph'); let drag;
  graph.addEventListener('wheel', event => { event.preventDefault(); zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  graph.onpointerdown = event => { drag = { x: event.clientX, y: event.clientY, bounds: { ...bounds } }; graph.setPointerCapture(event.pointerId); graph.classList.add('dragging'); };
  graph.onpointermove = event => {
    if (!drag) return;
    const rect = graph.getBoundingClientRect(), b = drag.bounds;
    const dx = (event.clientX - drag.x) / (rect.width * 850 / 960) * (b.xMax - b.xMin);
    const dy = (event.clientY - drag.y) / (rect.height * 400 / 520) * (b.yMax - b.yMin);
    bounds = { xMin: b.xMin - dx, xMax: b.xMax - dx, yMin: b.yMin + dy, yMax: b.yMax + dy }; draw();
  };
  graph.onpointerup = graph.onpointercancel = () => { drag = null; graph.classList.remove('dragging'); };
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#points').oninput = event => {
  const { index, key } = event.target.dataset; if (index === undefined) return;
  points[Number(index)][key] = event.target.value; functionId = null; $('#source-label').textContent = 'Таблица'; stale();
};
$('#points').onclick = event => {
  const index = event.target.dataset.delete;
  if (index === undefined) return;
  points.splice(Number(index), 1); functionId = null; rows(); stale();
};
$('#add').onclick = () => { if (points.length < 50) { points.push({ x: '', y: '' }); functionId = null; rows(); stale(); } };
$('#target').oninput = stale;
$('#solve').onclick = calculate;
$('#x1').onclick = () => { $('#target').value = '1.573'; calculate(); };
$('#x2').onclick = () => { $('#target').value = '1.375'; calculate(); };
$('#generate').onclick = () => {
  try {
    const id = $('#function').value;
    const generated = generatePoints(id, $('#a').value, $('#b').value, $('#count').value);
    points = generated; functionId = id; rows(); calculate();
  } catch (err) { error(err.message); }
};
$('#preset').onchange = async () => {
  try {
    const response = await fetch(`/examples/${$('#preset').value}.json`);
    if (!response.ok) throw new Error('Не удалось загрузить набор.');
    const dataset = parseDataset(await response.text());
    points = dataset.points; functionId = dataset.functionId; $('#target').value = dataset.targets[0] ?? '0'; rows(); calculate();
  } catch (err) { error(err.message); }
};
$('#file').onchange = async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 1_000_000) throw new Error('Файл слишком большой: максимум 1 МБ.');
    const dataset = parseDataset(await file.text());
    points = dataset.points; functionId = dataset.functionId;
    if (dataset.targets.length) $('#target').value = dataset.targets[0];
    rows(); calculate();
  } catch (err) { error(err.message); }
  event.target.value = '';
};
rows(); calculate();
