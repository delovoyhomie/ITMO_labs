import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import htm from "https://esm.sh/htm@3.1.1";

import {
  properFunctions,
  improperFunctions,
  integrationMethods,
  getFunctionDefinition,
} from "/src/data/functions.js";
import { solveProperIntegral, solveImproperIntegral } from "/src/solver.js";
import { createIntegralGraphSvg } from "/src/plotting-core.js";
import { formatNumber, formatPercent } from "/src/utils.js";

const html = htm.bind(React.createElement);

function parseLooseNumber(value) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, "");
  if (!normalized || (normalized.includes(",") && normalized.includes("."))) {
    return null;
  }
  const numeric = Number(normalized.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatInput(value) {
  if (!Number.isFinite(value)) {
    return "";
  }
  const rounded = Number(value.toFixed(6));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function functionsForTask(taskType) {
  return taskType === "improper" ? improperFunctions : properFunctions;
}

function createFormDefaults(taskType, functionId, currentForm) {
  const list = functionsForTask(taskType);
  const definition = list.find((item) => item.id === functionId) ?? list[0];
  const [a, b] = definition.defaultInterval;
  const [viewMin, viewMax] = definition.view ?? [a, b];
  return {
    ...currentForm,
    functionId: definition.id,
    a: formatInput(a),
    b: formatInput(b),
    viewMin: formatInput(viewMin),
    viewMax: formatInput(viewMax),
  };
}

function formatScalar(value, digits = 4) {
  const numeric = parseLooseNumber(value);
  return numeric === null ? String(value ?? "—") : formatNumber(numeric, digits);
}

function formatRange(start, end, digits = 3) {
  const left = parseLooseNumber(start);
  const right = parseLooseNumber(end);
  if (left === null || right === null) {
    return "—";
  }
  return `[${formatNumber(left, digits)}, ${formatNumber(right, digits)}]`;
}

function formatHistoryCell(key, value) {
  if (value === null || value === undefined) {
    return "—";
  }
  switch (key) {
    case "step":
    case "n":
      return String(value);
    case "h":
      return formatNumber(value, 8);
    case "value":
      return formatNumber(value, 8);
    case "runge":
    case "delta":
    case "sigma":
      return Number(value).toExponential(3);
    default:
      return typeof value === "number" ? formatNumber(value, 6) : String(value);
  }
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

function createInteractiveGraph(source, bounds) {
  return createIntegralGraphSvg(source.evaluator, {
    a: source.a,
    b: source.b,
    bounds,
    viewRange: source.viewRange,
    yClip: source.yClip,
    overlay: source.overlay,
  });
}

function cloneBounds(bounds) {
  return { xMin: bounds.xMin, xMax: bounds.xMax, yMin: bounds.yMin, yMax: bounds.yMax };
}

function resizeBounds(bounds, factor) {
  const centerX = (bounds.xMin + bounds.xMax) / 2;
  const centerY = (bounds.yMin + bounds.yMax) / 2;
  const nextWidth = Math.max((bounds.xMax - bounds.xMin) * factor, 1e-6);
  const nextHeight = Math.max((bounds.yMax - bounds.yMin) * factor, 1e-6);
  return {
    xMin: centerX - nextWidth / 2,
    xMax: centerX + nextWidth / 2,
    yMin: centerY - nextHeight / 2,
    yMax: centerY + nextHeight / 2,
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

function Field({ label, children, hint }) {
  return html`
    <label className="field">
      <span className="field-label">${label}</span>
      ${children}
      ${hint ? html`<span className="field-hint">${hint}</span>` : null}
    </label>
  `;
}

function MetricCard({ label, value }) {
  return html`
    <article className="metric-card">
      <span className="metric-label">${label}</span>
      <strong className="metric-value">${value}</strong>
    </article>
  `;
}

function CoordinateChip({ label, value }) {
  return html`
    <div className="coordinate-chip">
      <span className="coordinate-chip-label">${label}</span>
      <strong className="coordinate-chip-value">${value}</strong>
    </div>
  `;
}

function EmptyState() {
  return html`
    <section className="panel panel-empty">
      <p className="eyebrow">Результаты</p>
      <h2>Форма готова к расчёту</h2>
      <p>
        Выберите функцию, задайте пределы интегрирования, метод и точность ε, затем запустите расчёт.
        График с заливкой площади, метрики и таблица итераций правила Рунге появятся здесь.
      </p>
    </section>
  `;
}

function InteractiveGraphPanel({ source, title }) {
  const initialBounds = source.graph.bounds;
  const resetKey = [
    source.taskType,
    source.evaluator.id,
    source.a,
    source.b,
    initialBounds.xMin,
    initialBounds.xMax,
    initialBounds.yMin,
    initialBounds.yMax,
  ].join(":");
  const frameRef = useRef(null);
  const dragState = useRef(null);
  const [viewBounds, setViewBounds] = useState(() => cloneBounds(initialBounds));
  const [zoomLevel, setZoomLevel] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setViewBounds(cloneBounds(initialBounds));
    setZoomLevel(0);
    setIsDragging(false);
    dragState.current = null;
  }, [resetKey]);

  const graph = useMemo(() => {
    try {
      return createInteractiveGraph(source, viewBounds);
    } catch {
      return source.graph;
    }
  }, [source, viewBounds]);

  const graphSummary = [
    ["x", formatRange(graph.bounds.xMin, graph.bounds.xMax, 3)],
    ["y", formatRange(graph.bounds.yMin, graph.bounds.yMax, 3)],
    ["a, b", `${formatNumber(source.a, 3)}, ${formatNumber(source.b, 3)}`],
  ];

  function applyZoom(nextZoomLevel) {
    const normalizedZoom = Math.max(-8, Math.min(8, Number(nextZoomLevel)));
    const factor = Math.pow(1.22, zoomLevel - normalizedZoom);
    setViewBounds((current) => resizeBounds(current, factor));
    setZoomLevel(normalizedZoom);
  }

  function resetGraphView() {
    setViewBounds(cloneBounds(initialBounds));
    setZoomLevel(0);
  }

  function handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      bounds: cloneBounds(viewBounds),
    };
    setIsDragging(true);
  }

  function handlePointerMove(event) {
    const drag = dragState.current;
    const frame = frameRef.current;
    if (!drag || !frame || drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    const spanX = drag.bounds.xMax - drag.bounds.xMin;
    const spanY = drag.bounds.yMax - drag.bounds.yMin;
    const deltaX = -((event.clientX - drag.startX) / width) * spanX;
    const deltaY = ((event.clientY - drag.startY) / height) * spanY;
    setViewBounds(translateBounds(drag.bounds, deltaX, deltaY));
  }

  function handlePointerEnd(event) {
    if (dragState.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      dragState.current = null;
      setIsDragging(false);
    }
  }

  return html`
    <section className="panel graph-panel">
      <div className="panel-topline">
        <div>
          <p className="eyebrow">График</p>
          <h2>${title}</h2>
        </div>
        <div className="graph-controls">
          <button type="button" className="ghost-button graph-step-button" onClick=${() => applyZoom(zoomLevel - 1)}>−</button>
          <input
            className="zoom-slider"
            type="range"
            min="-8"
            max="8"
            step="1"
            value=${zoomLevel}
            aria-label="Масштаб графика"
            onChange=${(event) => applyZoom(event.target.value)}
          />
          <button type="button" className="ghost-button graph-step-button" onClick=${() => applyZoom(zoomLevel + 1)}>+</button>
          <button type="button" className="ghost-button graph-reset-button" onClick=${resetGraphView}>Сброс</button>
        </div>
      </div>
      <div className="coordinate-strip graph-strip">
        ${graphSummary.map(([label, value]) => html`<${CoordinateChip} key=${label} label=${label} value=${value} />`)}
      </div>
      <div
        ref=${frameRef}
        className=${isDragging ? "graph-frame interactive-graph-frame dragging" : "graph-frame interactive-graph-frame"}
        onPointerDown=${handlePointerDown}
        onPointerMove=${handlePointerMove}
        onPointerUp=${handlePointerEnd}
        onPointerCancel=${handlePointerEnd}
        dangerouslySetInnerHTML=${{ __html: graph.svg }}
      />
    </section>
  `;
}

function GraphPreviewPanel({ preview, message }) {
  return html`
    <section className="results-stack">
      <${InteractiveGraphPanel} source=${preview} title=${preview.evaluator.name} />
      <section className="panel output-panel">
        <div className="panel-topline">
          <div>
            <p className="eyebrow">Комментарий</p>
            <h2>График построен без расчёта</h2>
          </div>
        </div>
        <pre className="result-text">${message}</pre>
      </section>
    </section>
  `;
}

function buildMetrics(result) {
  if (result.taskType === "proper") {
    const metrics = [
      ["Интеграл", formatNumber(result.value, 8)],
      ["Разбиений n", String(result.n)],
      ["Шаг h", formatNumber((result.b - result.a) / result.n, 8)],
      ["Оценка Рунге R", Number(result.runge).toExponential(3)],
    ];
    if (result.reference.value !== null) {
      metrics.push([
        result.reference.kind === "exact" ? "Точное значение" : "Эталон (числ.)",
        formatNumber(result.reference.value, 8),
      ]);
      if (result.errors.absolute !== null) {
        metrics.push(["Абс. погрешность", Number(result.errors.absolute).toExponential(3)]);
      }
      if (result.errors.relative !== null) {
        metrics.push(["Отн. погрешность", formatPercent(result.errors.relative, 5)]);
      }
    }
    return metrics;
  }

  const metrics = [];
  if (result.converges) {
    metrics.push(["Интеграл", formatNumber(result.value, 8)]);
    if (result.reference.value !== null) {
      metrics.push(["Точное значение", formatNumber(result.reference.value, 8)]);
      if (result.errors.absolute !== null) {
        metrics.push(["Абс. погрешность", Number(result.errors.absolute).toExponential(3)]);
      }
    }
  }
  metrics.push(["Особые точки", result.singularPoints.map((x) => formatNumber(x, 3)).join(", ")]);
  return metrics;
}

function ResultPanel({ result }) {
  const metrics = buildMetrics(result);
  const isImproper = result.taskType === "improper";
  const verdict = isImproper
    ? result.converges
      ? html`<span className="verdict converge">Интеграл сходится</span>`
      : html`<span className="verdict diverge">Интеграл не существует</span>`
    : null;

  return html`
    <section className="results-stack">
      <section className="panel metrics-panel">
        <div className="panel-topline">
          <div>
            <p className="eyebrow">${isImproper ? "Несобственный интеграл" : "Определённый интеграл"}</p>
            <h2>${result.evaluator.name}</h2>
          </div>
          <div className="action-row">
            ${verdict}
            <button type="button" className="ghost-button" onClick=${() => downloadText("result.txt", result.text)}>
              Скачать txt
            </button>
          </div>
        </div>
        <div className="metrics-grid">
          ${metrics.map(([label, value]) => html`<${MetricCard} key=${label} label=${label} value=${value} />`)}
        </div>
      </section>

      <${InteractiveGraphPanel} source=${result} title="График функции и площадь интеграла" />

      <section className="panel output-panel">
        <div className="panel-topline">
          <div>
            <p className="eyebrow">Результат</p>
            <h2>Текстовый вывод</h2>
          </div>
        </div>
        <pre className="result-text">${result.text}</pre>
      </section>

      <section className="panel table-panel">
        <div className="panel-topline">
          <div>
            <p className="eyebrow">${isImproper ? "Предел при σ → 0" : "Уточнение по Рунге"}</p>
            <h2>${isImproper ? "Усечённые приближения J(σ)" : "Последовательность разбиений"}</h2>
          </div>
        </div>
        <div className="table-shell">
          <table className="history-table">
            <thead>
              <tr>
                ${result.historyColumns.map((column) => html`<th key=${column.key}>${column.label}</th>`)}
              </tr>
            </thead>
            <tbody>
              ${result.history.map(
                (row, index) => html`
                  <tr key=${index}>
                    ${result.historyColumns.map(
                      (column) => html`<td key=${column.key}>${formatHistoryCell(column.key, row[column.key])}</td>`,
                    )}
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `;
}

function readInitialTab() {
  try {
    return new URLSearchParams(window.location.search).get("tab") === "improper" ? "improper" : "proper";
  } catch {
    return "proper";
  }
}

function App() {
  const [taskType, setTaskType] = useState(readInitialTab);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [properForm, setProperForm] = useState({
    functionId: "variant19_poly",
    method: "simpson",
    a: "2",
    b: "4",
    epsilon: "0.0001",
    viewMin: "1",
    viewMax: "5",
  });
  const [improperForm, setImproperForm] = useState({
    functionId: "inv_sqrt_x",
    method: "simpson",
    a: "0",
    b: "1",
    epsilon: "0.001",
    viewMin: "0",
    viewMax: "1.2",
  });

  const deferredResult = useDeferredValue(result);
  const deferredPreview = useDeferredValue(preview);

  const form = taskType === "improper" ? improperForm : properForm;
  const setForm = taskType === "improper" ? setImproperForm : setProperForm;
  const definition = getFunctionDefinition(form.functionId);

  const activeSummary = [
    ["функция", definition?.name ?? "—"],
    ["x", formatRange(form.a, form.b, 3)],
    ["ε", formatScalar(form.epsilon, 6)],
  ];

  function solveFromForms(nextTaskType, nextForm) {
    try {
      const config = {
        taskType: nextTaskType,
        functionId: nextForm.functionId,
        method: nextForm.method,
        a: nextForm.a,
        b: nextForm.b,
        epsilon: nextForm.epsilon,
        graph: { xMin: nextForm.viewMin, xMax: nextForm.viewMax },
      };
      const nextResult =
        nextTaskType === "improper" ? solveImproperIntegral(config) : solveProperIntegral(config);
      setError("");
      setPreview(null);
      startTransition(() => {
        setResult(nextResult);
      });
    } catch (nextError) {
      setResult(null);
      setPreview(nextError.preview ?? null);
      setError(nextError.message);
    }
  }

  function handleSolve(event) {
    event.preventDefault();
    solveFromForms(taskType, form);
  }

  useEffect(() => {
    const initialTab = readInitialTab();
    solveFromForms(initialTab, initialTab === "improper" ? improperForm : properForm);
  }, []);

  function switchTask(nextTaskType) {
    setTaskType(nextTaskType);
    setResult(null);
    setPreview(null);
    setError("");
  }

  const functionList = functionsForTask(taskType);

  return html`
    <main className="page-shell">
      <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">Численные методы · Лабораторная №3 · Вариант 19</p>
          <h1>Численное интегрирование</h1>
          <p className="hero-text">
            Приближённое вычисление определённого интеграла различными квадратурными методами
            с автоматическим выбором числа разбиений по правилу Рунге, а также исследование
            сходимости несобственных интегралов 2 рода.
          </p>
          <div className="coordinate-strip">
            ${activeSummary.map(([label, value]) => html`<${CoordinateChip} key=${label} label=${label} value=${value} />`)}
          </div>
        </div>
        <aside className="hero-note">
          <h3>Вариант 19</h3>
          <p>
            Вычислительная часть: <code>∫₂⁴ (x³ − 3x² + 6x − 19) dx = 2</code>.
            Методы: прямоугольники (левые, правые, средние), трапеции, Симпсон.
            Начальное число разбиений <code>n = 4</code>.
          </p>
        </aside>
      </section>

      <section className="workspace-grid">
        <section className="panel control-panel">
          <div className="panel-topline">
            <div>
              <p className="eyebrow">Параметры</p>
              <h2>Настройка задачи</h2>
            </div>
            <div className="switcher" role="tablist" aria-label="Тип интеграла">
              <button
                type="button"
                className=${taskType === "proper" ? "switcher-button active" : "switcher-button"}
                onClick=${() => switchTask("proper")}
              >
                Определённый
              </button>
              <button
                type="button"
                className=${taskType === "improper" ? "switcher-button active" : "switcher-button"}
                onClick=${() => switchTask("improper")}
              >
                Несобственный
              </button>
            </div>
          </div>

          <form className="solver-form" onSubmit=${handleSolve}>
            <div className="form-grid">
              <${Field} label="Функция f(x)">
                <select
                  className="field-wide"
                  value=${form.functionId}
                  onChange=${(event) => {
                    const next = createFormDefaults(taskType, event.target.value, form);
                    setForm(next);
                    solveFromForms(taskType, next);
                  }}
                >
                  ${functionList.map(
                    (item) => html`<option key=${item.id} value=${item.id}>${item.name}</option>`,
                  )}
                </select>
              </${Field}>

              <${Field} label="Метод">
                <select
                  value=${form.method}
                  onChange=${(event) => {
                    const next = { ...form, method: event.target.value };
                    setForm(next);
                    solveFromForms(taskType, next);
                  }}
                >
                  ${integrationMethods.map(
                    (method) => html`<option key=${method.id} value=${method.id}>${method.label}</option>`,
                  )}
                </select>
              </${Field}>

              <${Field} label="Точность ε">
                <input
                  type="text"
                  inputMode="decimal"
                  value=${form.epsilon}
                  onChange=${(event) => setForm((current) => ({ ...current, epsilon: event.target.value }))}
                />
              </${Field}>

              <${Field} label="Нижний предел a">
                <input
                  type="text"
                  inputMode="decimal"
                  value=${form.a}
                  onChange=${(event) => setForm((current) => ({ ...current, a: event.target.value }))}
                />
              </${Field}>

              <${Field} label="Верхний предел b">
                <input
                  type="text"
                  inputMode="decimal"
                  value=${form.b}
                  onChange=${(event) => setForm((current) => ({ ...current, b: event.target.value }))}
                />
              </${Field}>
            </div>

            <section className="hint-box">
              <div className="hint-copy">
                <p className="eyebrow">${taskType === "improper" ? "О сходимости" : "О функции"}</p>
                <h3>${definition?.name ?? ""}</h3>
                <p>${definition?.description ?? ""}</p>
              </div>
              <div className="hint-range">
                <${Field} label="Ось x: от">
                  <input
                    type="text"
                    inputMode="decimal"
                    value=${form.viewMin}
                    onChange=${(event) => setForm((current) => ({ ...current, viewMin: event.target.value }))}
                  />
                </${Field}>
                <${Field} label="Ось x: до">
                  <input
                    type="text"
                    inputMode="decimal"
                    value=${form.viewMax}
                    onChange=${(event) => setForm((current) => ({ ...current, viewMax: event.target.value }))}
                  />
                </${Field}>
              </div>
            </section>

            <button className="solve-button" type="submit">Вычислить интеграл</button>
          </form>

          ${error
            ? html`
                <div className="error-box">
                  <strong>Сообщение</strong>
                  <span>${error}</span>
                </div>
              `
            : null}
        </section>

        <section className="result-column">
          ${result
            ? html`<${ResultPanel} result=${deferredResult ?? result} />`
            : preview
              ? html`<${GraphPreviewPanel} preview=${deferredPreview ?? preview} message=${error} />`
              : html`<${EmptyState} />`}
        </section>
      </section>
    </main>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
