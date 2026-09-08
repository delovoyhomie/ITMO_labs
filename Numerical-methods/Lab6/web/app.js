import { EQUATIONS, solve } from '/src/ode.js';
import { parseProblem, formatSolution } from '/src/io.js';
import { formatNumber as f, escapeXml as e } from '/src/utils.js';
import { createGraphSvg, createErrorSvg, graphBounds, METHOD_COLORS, EXACT_COLOR } from '/src/plotting-core.js';

const PRESETS = [
  ['variant19', 'Пример варианта: y′ = y + (1+x)y²'],
  ['exponential', 'y′ = y на [0; 1]'],
  ['linear-sum', 'y′ = x + y на [0; 2]'],
  ['gaussian', 'y′ = −2xy на [0; 2]'],
  ['stiff-euler-diverges', 'Жёсткая задача: уточнение шага'],
];

// Значения по умолчанию — пример 1 из лекции, он же демонстрационная задача варианта.
const DEFAULT = { equation: 'bernoulli', x0: '1', y0: '-1', xn: '1.5', h: '0.1', epsilon: '1e-6' };

let solution = null, bounds = null;
const root = document.querySelector('#root');
root.innerHTML = `<div class="page-shell">
  <header class="hero panel"><div class="hero-copy"><span class="eyebrow">Вычислительная математика · ЛР №6</span>
    <h1>Численное решение ОДУ</h1><p class="hero-text">Задача Коши y′ = f(x, y), y(x₀) = y₀ решается одношаговыми и многошаговым методами. Точное решение известно, поэтому погрешность видна в каждом узле.</p>
    <div class="coordinate-strip"><div class="coordinate-chip"><span class="coordinate-chip-label">Вариант</span><span class="coordinate-chip-value">19 · методы 1, 3, 4</span></div><div class="coordinate-chip"><span class="coordinate-chip-label">Методы</span><span class="coordinate-chip-value">Эйлер · Рунге-Кутта 4 · Адамс</span></div></div></div>
    <aside class="hero-note"><span class="eyebrow">Оценка точности</span><p class="model-formula">R = (y<sub>h</sub> − y<sub>h/2</sub>)/(2<sup>p</sup> − 1)</p><p>Одношаговые методы проверяются правилом Рунге, метод Адамса — по точному решению: ε = max|y<sub>точн</sub> − y<sub>i</sub>|.</p></aside></header>
  <div class="workspace-grid"><section class="panel control-panel" aria-labelledby="input-title">
    <div class="panel-topline"><h2 id="input-title">Задача Коши</h2><span class="status-pill" id="source-label">Клавиатура</span></div>
    <label class="field"><span class="field-label">Уравнение y′ = f(x, y)</span><select id="equation">${EQUATIONS.map(item => `<option value="${item.id}"${item.id === DEFAULT.equation ? ' selected' : ''}>${e(item.label)}</option>`).join('')}</select></label>
    <p class="field-hint" id="exact-label"></p>
    <div class="interval-fields">
      <label class="field"><span class="field-label">x₀</span><input id="x0" value="${DEFAULT.x0}" inputmode="decimal"/></label>
      <label class="field"><span class="field-label">y₀ = y(x₀)</span><input id="y0" value="${DEFAULT.y0}" inputmode="decimal"/></label>
      <label class="field"><span class="field-label">xₙ</span><input id="xn" value="${DEFAULT.xn}" inputmode="decimal"/></label>
    </div>
    <div class="interval-fields">
      <label class="field"><span class="field-label">Шаг h</span><input id="h" value="${DEFAULT.h}" inputmode="decimal"/></label>
      <label class="field"><span class="field-label">Точность ε</span><input id="epsilon" value="${DEFAULT.epsilon}" inputmode="decimal"/></label>
    </div>
    <label class="field"><span class="field-label">Готовый набор</span><select id="preset">${PRESETS.map(([id, label]) => `<option value="${id}">${e(label)}</option>`).join('')}</select></label>
    <div class="upload-row"><label class="ghost-button file-button">Загрузить файл<input class="file-input" id="file" type="file" accept=".json,.txt"/></label><span class="field-hint">JSON или строки «имя = значение»; десятичная запятая поддерживается.</span></div>
    <div class="action-row"><button class="ghost-button" id="halve">Шаг h/2</button><button class="ghost-button" id="double">Шаг 2h</button></div>
    <button class="solve-button" id="solve">Решить</button><div id="error" role="alert" hidden></div>
  </section><div id="results" class="results-stack" aria-live="polite"></div></div></div>`;

const $ = selector => document.querySelector(selector);
const fields = () => ({
  equation: $('#equation').value, x0: $('#x0').value, y0: $('#y0').value,
  xn: $('#xn').value, h: $('#h').value, epsilon: $('#epsilon').value,
});

function error(message) { $('#error').hidden = false; $('#error').className = 'error-box'; $('#error').textContent = message; }
function stale() {
  solution = null;
  $('#results').innerHTML = '<section class="panel panel-empty"><h2>Данные изменены</h2><p>Нажмите «Решить», чтобы обновить таблицу и графики.</p></section>';
  $('#error').hidden = true;
}
function describe() {
  const equation = EQUATIONS.find(item => item.id === $('#equation').value);
  $('#exact-label').textContent = `Точное решение: ${equation.solutionLabel}${equation.note ? ` — ${equation.note}` : ''}`;
}

function valuesTable() {
  const applicable = solution.results.filter(r => r.applicable);
  const head = `<tr><th>i</th><th>xᵢ</th>${applicable.map(r => `<th><span class="model-dot" style="background:${METHOD_COLORS[r.id]}"></span> ${e(r.short)}</th>`).join('')}<th>y точн</th>${applicable.map(r => `<th>|Δ| ${e(r.short)}</th>`).join('')}</tr>`;
  const rows = solution.nodes.map((x, i) => {
    const exact = solution.exactValues[i];
    return `<tr><td>${i}</td><td>${f(x, 6)}</td>${applicable.map(r => `<td>${f(r.commonValues[i], 9)}</td>`).join('')}<td>${f(exact, 9)}</td>${applicable.map(r => `<td>${Number.isFinite(exact) ? f(Math.abs(exact - r.commonValues[i]), 9) : '—'}</td>`).join('')}</tr>`;
  }).join('');
  return `<section class="panel table-panel"><h2>Таблица приближённых значений</h2><div class="table-shell scroll-table" tabindex="0" aria-label="Таблица приближённых значений"><table class="values-table difference-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div></section>`;
}

function accuracyPanel() {
  const rows = solution.results.map(result => {
    if (!result.applicable) return `<tr><td>${e(result.label)}</td><td>—</td><td colspan="4"><span class="model-error">${e(result.reason)}</span></td></tr>`;
    const method = result.kind === 'one-step' ? 'правило Рунге' : 'max|y точн − y|';
    const last = result.runge?.steps.at(-1);
    const value = result.kind === 'one-step' ? (last ? f(last.error, 10) : '—') : f(result.error.value, 10);
    const step = result.kind === 'one-step' ? (last ? f(last.h, 8) : '—') : f(result.h, 8);
    return `<tr><td>${e(result.label)}</td><td>${result.order}</td><td>${method}</td><td>${value}</td><td>${step}</td><td>${result.accuracyMet ? 'да' : 'нет'}</td></tr>`;
  }).join('');
  const runge = solution.results.filter(r => r.applicable && r.kind === 'one-step').map(result => `
    <details><summary>Правило Рунге: ${e(result.label)} (p = ${result.order})</summary>
      <div class="table-shell scroll-table"><table class="values-table result-table"><thead><tr><th>h</th><th>узлов</th><th>R</th><th>x</th><th>R ≤ ε</th></tr></thead><tbody>
      ${result.runge.steps.map(step => `<tr><td>${f(step.h, 8)}</td><td>${step.nodes}</td><td>${f(step.error, 10)}</td><td>${f(step.at, 6)}</td><td>${step.ok ? 'да' : 'нет'}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="field-hint">${result.runge.converged ? `Точность достигнута при h = ${f(result.runge.h, 8)}.` : e(result.runge.reason)}</p></details>`).join('');
  const adams = solution.results.find(r => r.id === 'adams' && r.applicable);
  const adamsDetails = adams ? `<details><summary>Контроль точности: ${e(adams.label)}</summary>
    <div class="table-shell scroll-table"><table class="values-table result-table"><thead><tr><th>h</th><th>узлов</th><th>max|y точн − y|</th><th>x</th><th>≤ ε</th></tr></thead><tbody>
    ${adams.exactRefinement.steps.map(step => `<tr><td>${f(step.h, 8)}</td><td>${step.nodes ?? '—'}</td><td>${Number.isFinite(step.error) ? f(step.error, 10) : '∞'}</td><td>${step.at === undefined ? '—' : f(step.at, 6)}</td><td>${step.ok ? 'да' : 'нет'}</td></tr>`).join('')}
    </tbody></table></div><p class="field-hint">${adams.exactRefinement.converged ? `Точность достигнута при h = ${f(adams.h, 8)}.` : e(adams.exactRefinement.reason)}</p></details>` : '';
  return `<section class="panel table-panel"><h2>Оценка точности</h2>
    <div class="table-shell scroll-table"><table class="values-table result-table"><thead><tr><th>Метод</th><th>p</th><th>Способ оценки</th><th>Оценка</th><th>при h</th><th>≤ ε</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="field-hint">Правило Рунге применяется к одношаговым методам, точное решение — к методу Адамса, как требует задание.</p>${runge}${adamsDetails}</section>`;
}

function calculate() {
  try {
    solution = solve(fields());
    bounds = graphBounds(solution);
    $('#error').hidden = true;
    const applicable = solution.results.filter(r => r.applicable);
    const adams = solution.results.find(r => r.id === 'adams');
    const correctionLimits = adams?.corrections.slice(4).reduce(({ min, max }, value) =>
      ({ min: Math.min(min, value), max: Math.max(max, value) }), { min: Infinity, max: -Infinity });
    $('#results').innerHTML = `<section class="panel metrics-panel"><div class="panel-topline"><h2>${e(solution.equation.label)}</h2><span class="status-pill">${solution.nodes.length} общих узлов</span></div>
      <div class="metrics-grid">
        <div class="metric-card"><span class="metric-label">Шаг сетки</span><strong class="metric-value">${f(solution.problem.h, 8)}</strong></div>
        <div class="metric-card"><span class="metric-label">Точность ε</span><strong class="metric-value">${solution.problem.epsilon.toExponential(2)}</strong></div>
        <div class="metric-card"><span class="metric-label">Расхождение методов</span><strong class="metric-value">${f(solution.spread, 8)}</strong></div>
      </div>
      ${solution.warnings.map(w => `<p class="warning-note">${e(w)}</p>`).join('')}
      <div class="model-grid">${applicable.map(r => `<article class="model-card"><div class="model-card-top"><span class="model-dot" style="background:${METHOD_COLORS[r.id]}"></span><span class="model-name">${e(r.label)}</span></div>
        <div class="model-stat-grid"><div class="stat-pair"><span class="metric-label">y(xₙ)</span><strong>${f(r.values.at(-1), 9)}</strong></div>
        <div class="stat-pair"><span class="metric-label">max|y точн − y|</span><strong>${f(r.error.value, 9)}</strong></div>
        <div class="stat-pair"><span class="metric-label">Порядок p</span><strong>${r.order}</strong></div></div></article>`).join('')}
      ${solution.results.filter(r => !r.applicable).map(r => `<article class="model-card"><div class="model-card-top"><span class="model-name">${e(r.label)}</span></div><p class="model-error">${e(r.reason)}</p></article>`).join('')}</div>
      ${adams?.applicable && adams.corrections.length > 4 ? `<p class="field-hint">Метод Адамса разгоняется методом Рунге-Кутта (y₁, y₂, y₃); корректор выполняет от ${correctionLimits.min} до ${correctionLimits.max} итераций на шаг до выполнения |y⁽ᵏ⁺¹⁾ − y⁽ᵏ⁾| ≤ ε.</p>` : ''}</section>
      <section class="panel graph-panel"><div class="panel-topline"><h2>Точное и приближённые решения</h2><div class="graph-controls"><button class="ghost-button graph-step-button" id="zoom-in" aria-label="Увеличить">+</button><button class="ghost-button graph-step-button" id="zoom-out" aria-label="Уменьшить">−</button><button class="ghost-button graph-reset-button" id="reset">Сбросить</button></div></div>
        <div class="graph-frame interactive-graph-frame" id="graph"></div>
        <p class="field-hint">Точное решение показано сплошной линией цвета <span style="color:${EXACT_COLOR}">■</span>, приближённые — пунктиром с отметками узлов. Масштаб — колесом мыши, перемещение — перетаскиванием.</p>
        <button class="ghost-button" id="save-graph">Скачать SVG</button></section>
      <section class="panel graph-panel"><h2>Погрешность в узлах</h2><div class="graph-frame" id="error-graph"></div>
        <p class="field-hint">Логарифмическая шкала |y точн − y_i|: наклон линии показывает накопление погрешности вдоль интервала.</p>
        <button class="ghost-button" id="save-error-graph">Скачать SVG</button></section>
      ${valuesTable()}
      ${accuracyPanel()}
      <section class="panel output-panel"><div class="panel-topline"><h2>Текстовый отчёт</h2><button class="ghost-button" id="save-text">Скачать TXT</button></div><details><summary>Показать полный вывод</summary><pre class="result-text">${e(formatSolution(solution))}</pre></details></section>`;
    draw(); graphEvents();
    $('#error-graph').innerHTML = createErrorSvg(solution);
    $('#save-text').onclick = () => download(formatSolution(solution), 'lab6-result.txt', 'text/plain');
    $('#save-graph').onclick = () => download(createGraphSvg(solution, bounds), 'lab6-solution.svg', 'image/svg+xml');
    $('#save-error-graph').onclick = () => download(createErrorSvg(solution), 'lab6-error.svg', 'image/svg+xml');
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
    const dy = (event.clientY - drag.y) / (rect.height * 400 / 545) * (b.yMax - b.yMin);
    bounds = { xMin: b.xMin - dx, xMax: b.xMax - dx, yMin: b.yMin + dy, yMax: b.yMax + dy }; draw();
  };
  graph.onpointerup = graph.onpointercancel = () => { drag = null; graph.classList.remove('dragging'); };
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function apply(problem, label) {
  $('#equation').value = problem.equation.id;
  $('#x0').value = problem.x0; $('#y0').value = problem.y0; $('#xn').value = problem.xn;
  $('#h').value = problem.h; $('#epsilon').value = problem.epsilon;
  $('#source-label').textContent = label;
  describe(); calculate();
}
function scaleStep(factor) {
  const value = Number(String($('#h').value).replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) { error('Шаг h: требуется конечное число.'); return; }
  $('#h').value = String(value * factor); calculate();
}

for (const id of ['#x0', '#y0', '#xn', '#h', '#epsilon']) $(id).oninput = () => { $('#source-label').textContent = 'Клавиатура'; stale(); };
$('#equation').onchange = () => { $('#source-label').textContent = 'Клавиатура'; describe(); stale(); };
$('#solve').onclick = calculate;
$('#halve').onclick = () => scaleStep(0.5);
$('#double').onclick = () => scaleStep(2);
$('#preset').onchange = async () => {
  try {
    const response = await fetch(`/examples/${$('#preset').value}.json`);
    if (!response.ok) throw new Error('Не удалось загрузить набор.');
    apply(parseProblem(await response.text()), 'Готовый набор');
  } catch (err) { error(err.message); }
};
$('#file').onchange = async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 100_000) throw new Error('Файл слишком большой: максимум 100 КБ.');
    apply(parseProblem(await file.text()), 'Файл');
  } catch (err) { error(err.message); }
  event.target.value = '';
};
describe(); calculate();
