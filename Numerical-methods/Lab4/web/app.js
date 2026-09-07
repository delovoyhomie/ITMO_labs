import {
  createVariant19Points,
  formatNumber,
  formatResultText,
  getDeterminationMessage,
  parsePointsInput,
  solveApproximations,
} from "/src/approximations.js";
import { createApproximationGraphBounds, createApproximationGraphSvg } from "/src/plotting-core.js";
import { escapeXml, parseLooseNumber } from "/src/utils.js";

const root = document.querySelector("#root");

const state = {
  points: createVariant19Points(),
  solution: null,
  selectedModelId: "linear",
  graphBounds: null,
  error: "",
};

let graphDrag = null;

function createEmptyPointRows(count = 8) {
  return Array.from({ length: count }, () => ({ x: "", y: "" }));
}

function inputValue(value) {
  if (typeof value === "number") {
    return formatNumber(value, 10);
  }
  return String(value ?? "");
}

function safeText(value) {
  return escapeXml(value ?? "");
}

function invalidateSolution() {
  state.solution = null;
  state.graphBounds = null;
  state.error = "";
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function solveCurrent() {
  try {
    const solution = solveApproximations(state.points);
    state.points = solution.points;
    state.solution = solution;
    state.selectedModelId = solution.models.some((model) => model.id === state.selectedModelId && model.applicable)
      ? state.selectedModelId
      : solution.best.id;
    state.graphBounds = null;
    state.error = "";
  } catch (error) {
    state.solution = null;
    state.graphBounds = null;
    state.error = error.message;
  }
}

function getSelectedModel() {
  return state.solution?.models.find((model) => model.id === state.selectedModelId && model.applicable) ?? state.solution?.best;
}

function cloneBounds(bounds) {
  return {
    xMin: bounds.xMin,
    xMax: bounds.xMax,
    yMin: bounds.yMin,
    yMax: bounds.yMax,
  };
}

function ensureGraphBounds(solution = state.solution) {
  if (!solution) {
    return null;
  }

  if (!state.graphBounds) {
    state.graphBounds = createApproximationGraphBounds(solution);
  }

  return state.graphBounds;
}

function resizeBounds(bounds, factor) {
  const centerX = (bounds.xMin + bounds.xMax) / 2;
  const centerY = (bounds.yMin + bounds.yMax) / 2;
  const width = Math.max((bounds.xMax - bounds.xMin) * factor, 1e-8);
  const height = Math.max((bounds.yMax - bounds.yMin) * factor, 1e-8);

  return {
    xMin: centerX - width / 2,
    xMax: centerX + width / 2,
    yMin: centerY - height / 2,
    yMax: centerY + height / 2,
  };
}

function translateBounds(bounds, deltaX, deltaY) {
  return {
    xMin: bounds.xMin + deltaX,
    xMax: bounds.xMax + deltaX,
    yMin: bounds.yMin + deltaY,
    yMax: bounds.yMax + deltaY,
  };
}

function renderRange(start, end, digits = 3) {
  return `[${formatNumber(start, digits)}, ${formatNumber(end, digits)}]`;
}

function renderGraphFrame(frame) {
  if (!state.solution || !state.graphBounds) {
    return;
  }

  frame.innerHTML = createApproximationGraphSvg(state.solution, {
    bounds: state.graphBounds,
  });
}

function renderCoordinateChip(label, value) {
  return `
    <div class="coordinate-chip">
      <span class="coordinate-chip-label">${safeText(label)}</span>
      <strong class="coordinate-chip-value">${safeText(value)}</strong>
    </div>
  `;
}

function renderHero() {
  const points = state.solution?.points ?? state.points;
  const numericX = points.map((point) => parseLooseNumber(point.x)).filter((value) => value !== null);
  const interval = numericX.length > 0
    ? `[${formatNumber(Math.min(...numericX), 2)}, ${formatNumber(Math.max(...numericX), 2)}]`
    : "-";
  const best = state.solution?.best;

  return `
    <section class="hero panel">
      <div class="hero-copy">
        <p class="eyebrow">Numerical Methods · Lab 4</p>
        <h1>Аппроксимация функции</h1>
        <p class="hero-text">
          Метод наименьших квадратов для табличной функции: линейная, квадратичная,
          кубическая, экспоненциальная, логарифмическая и степенная модели.
        </p>
        <div class="coordinate-strip">
          ${renderCoordinateChip("вариант", "19")}
          ${renderCoordinateChip("точек", String(points.length))}
          ${renderCoordinateChip("интервал", interval)}
          ${renderCoordinateChip("лучшая", best ? best.shortLabel : "-")}
        </div>
      </div>
      <aside class="hero-note">
        <p class="eyebrow">Исходная функция</p>
        <p>y = 5x / (x^4 + 19), x in [0; 2], h = 0.2</p>
      </aside>
    </section>
  `;
}

function renderPointRows() {
  return state.points
    .map((point, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <input type="text" inputmode="decimal" data-point-index="${index}" data-point-field="x" value="${safeText(inputValue(point.x))}" placeholder="x" aria-label="x ${index + 1}" />
        </td>
        <td>
          <input type="text" inputmode="decimal" data-point-index="${index}" data-point-field="y" value="${safeText(inputValue(point.y))}" placeholder="y" aria-label="y ${index + 1}" />
        </td>
        <td>
          <button type="button" class="point-delete-button" data-action="remove-point-row" data-point-index="${index}" ${state.points.length <= 8 ? "disabled" : ""} aria-label="Удалить точку ${index + 1}">×</button>
        </td>
      </tr>
    `)
    .join("");
}

function renderControls() {
  return `
    <section class="panel control-panel">
      <div class="panel-topline">
        <div>
          <p class="eyebrow">Параметры</p>
          <h2>Ручной ввод точек</h2>
        </div>
      </div>

      <div class="upload-row">
        <div class="action-row">
          <button type="button" class="ghost-button" data-action="load-variant">Вариант 19</button>
          <button type="button" class="ghost-button" data-action="clear-points">Пустые поля</button>
          <label class="ghost-button file-button">
            Загрузить файл
            <input type="file" accept=".json,.txt,.cfg,application/json,text/plain" class="file-input" data-action="file-input" />
          </label>
        </div>
        <span class="field-hint">JSON или текстовая таблица: две координаты в строке.</span>
      </div>

      <form class="input-stack" data-role="solver-form">
        <div class="points-editor-header">
          <span class="field-label">Точки: ${state.points.length} из 12</span>
          <span class="field-hint">Минимум 8 строк</span>
        </div>
        <div class="points-editor">
          <table class="points-table">
            <thead>
              <tr>
                <th>i</th>
                <th>x_i</th>
                <th>y_i</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${renderPointRows()}</tbody>
          </table>
        </div>

        <div class="table-actions">
          <button type="button" class="ghost-button" data-action="add-point" ${state.points.length >= 12 ? "disabled" : ""}>Добавить строку</button>
          <button type="button" class="ghost-button" data-action="remove-point" ${state.points.length <= 8 ? "disabled" : ""}>Удалить последнюю</button>
          <button type="submit" class="solve-button">Рассчитать</button>
        </div>
      </form>

      <section class="hint-box">
        <div class="hint-copy">
          <p class="eyebrow">Области определения</p>
          <h3>Логарифмические преобразования требуют положительных данных</h3>
          <p>Если модель неприменима, она остается в итоговой таблице с причиной ошибки.</p>
        </div>
      </section>

      ${state.error ? `<div class="error-box"><strong>Ошибка</strong><span>${safeText(state.error)}</span></div>` : ""}
    </section>
  `;
}

function renderMetric(label, value) {
  return `
    <article class="metric-card">
      <span class="metric-label">${safeText(label)}</span>
      <strong class="metric-value">${safeText(value)}</strong>
    </article>
  `;
}

function renderModelCards(solution) {
  return `
    <section class="panel table-panel">
      <div class="panel-topline">
        <div>
          <p class="eyebrow">Модели</p>
          <h2>Сводка МНК</h2>
        </div>
      </div>
      <div class="model-grid">
        ${solution.models.map((model) => {
          const statusClass = !model.applicable ? "invalid" : model.id === solution.best.id ? "best" : "";
          const statusText = !model.applicable ? "не применима" : model.id === solution.best.id ? "лучшая" : "рассчитана";
          const cardClass = model.id === solution.best.id ? "model-card best" : "model-card";
          return `
            <article class="${cardClass}">
              <div class="model-card-top">
                <span class="model-name">
                  <span class="model-dot" style="background:${model.color}"></span>
                  ${safeText(model.label)}
                </span>
                <span class="status-pill ${statusClass}">${safeText(statusText)}</span>
              </div>
              <p class="model-formula">${safeText(model.applicable ? model.equation : model.error)}</p>
              ${model.applicable
                ? `
                  <div class="model-stat-grid">
                    <div class="stat-pair"><span>S</span><strong>${safeText(formatNumber(model.s, 8))}</strong></div>
                    <div class="stat-pair"><span>σ</span><strong>${safeText(formatNumber(model.sigma, 8))}</strong></div>
                    <div class="stat-pair"><span>R²</span><strong>${safeText(formatNumber(model.r2, 8))}</strong></div>
                  </div>
                `
                : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderValuesTable(solution) {
  const applicableModels = solution.models.filter((model) => model.applicable);
  const selected = getSelectedModel();

  return `
    <section class="panel table-panel">
      <div class="panel-topline">
        <div>
          <p class="eyebrow">Отклонения</p>
          <h2>Массивы φ(x_i) и ε_i</h2>
        </div>
        <label class="field">
          <span class="field-label">Модель</span>
          <select data-role="model-select">
            ${applicableModels.map((model) => `
              <option value="${model.id}" ${model.id === selected.id ? "selected" : ""}>${safeText(model.shortLabel)}</option>
            `).join("")}
          </select>
        </label>
      </div>
      <div class="table-shell">
        <table class="values-table">
          <thead>
            <tr>
              <th>i</th>
              <th>x_i</th>
              <th>y_i</th>
              <th>φ(x_i)</th>
              <th>ε_i</th>
            </tr>
          </thead>
          <tbody>
            ${selected.values.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${safeText(formatNumber(row.x, 6))}</td>
                <td>${safeText(formatNumber(row.y, 8))}</td>
                <td>${safeText(formatNumber(row.approximation, 8))}</td>
                <td>${safeText(formatNumber(row.residual, 8))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderResults() {
  const solution = state.solution;
  if (!solution) {
    return `
      <section class="panel panel-empty">
        <p class="eyebrow">Результаты</p>
        <h2>Форма готова к расчету</h2>
        <p>Задай от 8 до 12 точек и запусти вычисление.</p>
      </section>
    `;
  }

  const best = solution.best;
  const graphBounds = ensureGraphBounds(solution);
  const graphSvg = createApproximationGraphSvg(solution, { bounds: graphBounds });

  return `
    <section class="results-stack">
      <section class="panel metrics-panel">
        <div class="panel-topline">
          <div>
            <p class="eyebrow">Результаты</p>
            <h2>${safeText(best.label)}</h2>
          </div>
          <div class="action-row">
            <button type="button" class="ghost-button" data-action="download-result">Скачать txt</button>
          </div>
        </div>
        <div class="metrics-grid">
          ${renderMetric("S", formatNumber(best.s, 8))}
          ${renderMetric("σ", formatNumber(best.sigma, 8))}
          ${renderMetric("R²", formatNumber(best.r2, 8))}
          ${renderMetric("Pearson r", formatNumber(solution.pearson, 8))}
          ${renderMetric("Оценка R²", getDeterminationMessage(best.r2))}
        </div>
      </section>

      <section class="panel graph-panel">
        <div class="panel-topline">
          <div>
            <p class="eyebrow">График</p>
            <h2>Аппроксимирующие функции</h2>
          </div>
          <div class="graph-controls">
            <button type="button" class="ghost-button graph-step-button" data-action="graph-zoom-out" aria-label="Уменьшить график">−</button>
            <button type="button" class="ghost-button graph-step-button" data-action="graph-zoom-in" aria-label="Увеличить график">+</button>
            <button type="button" class="ghost-button graph-reset-button" data-action="graph-reset">Сброс</button>
          </div>
        </div>
        <div class="coordinate-strip graph-strip">
          ${renderCoordinateChip("x", renderRange(graphBounds.xMin, graphBounds.xMax, 3))}
          ${renderCoordinateChip("y", renderRange(graphBounds.yMin, graphBounds.yMax, 3))}
        </div>
        <div class="graph-frame interactive-graph-frame" data-role="graph-frame">${graphSvg}</div>
      </section>

      ${renderModelCards(solution)}
      ${renderValuesTable(solution)}

      <section class="panel output-panel">
        <div class="panel-topline">
          <div>
            <p class="eyebrow">Вывод</p>
            <h2>Текстовый результат</h2>
          </div>
        </div>
        <pre class="result-text">${safeText(formatResultText(solution))}</pre>
      </section>
    </section>
  `;
}

function render() {
  root.innerHTML = `
    <div class="page-shell">
      ${renderHero()}
      <section class="workspace-grid">
        ${renderControls()}
        ${renderResults()}
      </section>
    </div>
  `;
}

function updatePointFromInput(target) {
  const index = Number(target.dataset.pointIndex);
  const field = target.dataset.pointField;
  if (!Number.isInteger(index) || !field || !state.points[index]) {
    return;
  }
  state.points[index] = {
    ...state.points[index],
    [field]: target.value,
  };
  invalidateSolution();
}

root.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-point-field]")) {
    updatePointFromInput(target);
  }
});

root.addEventListener("change", async (event) => {
  const target = event.target;
  if (target.matches("[data-role='model-select']")) {
    state.selectedModelId = target.value;
    render();
    return;
  }

  if (target.matches("[data-action='file-input']")) {
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    try {
      state.points = parsePointsInput(await file.text());
      solveCurrent();
    } catch (error) {
      state.error = `Не удалось загрузить файл "${file.name}": ${error.message}`;
    } finally {
      target.value = "";
      render();
    }
  }
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  if (action === "load-variant") {
    state.points = createVariant19Points();
    solveCurrent();
    render();
    return;
  }

  if (action === "clear-points") {
    state.points = createEmptyPointRows();
    invalidateSolution();
    render();
    return;
  }

  if (action === "add-point") {
    state.points.push({ x: "", y: "" });
    invalidateSolution();
    render();
    return;
  }

  if (action === "remove-point") {
    if (state.points.length > 8) {
      state.points.pop();
      invalidateSolution();
      render();
    }
    return;
  }

  if (action === "remove-point-row") {
    const index = Number(button.dataset.pointIndex);
    if (state.points.length > 8 && Number.isInteger(index)) {
      state.points.splice(index, 1);
      invalidateSolution();
      render();
    }
    return;
  }

  if (action === "download-result" && state.solution) {
    downloadText("lab4-result.txt", formatResultText(state.solution));
    return;
  }

  if (action === "graph-zoom-in" && state.solution) {
    state.graphBounds = resizeBounds(ensureGraphBounds(), 0.78);
    render();
    return;
  }

  if (action === "graph-zoom-out" && state.solution) {
    state.graphBounds = resizeBounds(ensureGraphBounds(), 1.28);
    render();
    return;
  }

  if (action === "graph-reset" && state.solution) {
    state.graphBounds = createApproximationGraphBounds(state.solution);
    render();
  }
});

root.addEventListener("pointerdown", (event) => {
  const frame = event.target.closest("[data-role='graph-frame']");
  if (!frame || !state.solution) {
    return;
  }

  frame.setPointerCapture?.(event.pointerId);
  frame.classList.add("dragging");
  graphDrag = {
    pointerId: event.pointerId,
    frame,
    startX: event.clientX,
    startY: event.clientY,
    bounds: cloneBounds(ensureGraphBounds()),
  };
});

root.addEventListener("pointermove", (event) => {
  if (!graphDrag || graphDrag.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const rect = graphDrag.frame.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  const spanX = graphDrag.bounds.xMax - graphDrag.bounds.xMin;
  const spanY = graphDrag.bounds.yMax - graphDrag.bounds.yMin;
  const deltaX = -((event.clientX - graphDrag.startX) / width) * spanX;
  const deltaY = ((event.clientY - graphDrag.startY) / height) * spanY;

  state.graphBounds = translateBounds(graphDrag.bounds, deltaX, deltaY);
  renderGraphFrame(graphDrag.frame);
});

function finishGraphDrag(event) {
  if (!graphDrag || graphDrag.pointerId !== event.pointerId) {
    return;
  }

  graphDrag.frame.releasePointerCapture?.(event.pointerId);
  graphDrag.frame.classList.remove("dragging");
  graphDrag = null;
  render();
}

root.addEventListener("pointerup", finishGraphDrag);
root.addEventListener("pointercancel", finishGraphDrag);

root.addEventListener("wheel", (event) => {
  const frame = event.target.closest("[data-role='graph-frame']");
  if (!frame || !state.solution) {
    return;
  }

  event.preventDefault();
  state.graphBounds = resizeBounds(ensureGraphBounds(), event.deltaY < 0 ? 0.88 : 1.14);
  render();
}, { passive: false });

root.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-role='solver-form']")) {
    return;
  }

  event.preventDefault();
  solveCurrent();
  render();
});

solveCurrent();
render();
