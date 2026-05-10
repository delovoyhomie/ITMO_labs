import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import htm from "https://esm.sh/htm@3.1.1";

import { findRootIntervals } from "/src/analysis.js";
import { equations, variant19EquationMethods } from "/src/data/equations.js";
import { systems, variant19SystemMethods } from "/src/data/systems.js";
import { createEquationGraphSvg, createSystemGraphSvg } from "/src/plotting-core.js";
import { solveEquationTask, solveSystemTask } from "/src/solver.js";
import { formatNumber } from "/src/utils.js";

const html = htm.bind(React.createElement);

const equationDefaultGraphRanges = {
  variant19_poly: [-3, 3],
  cos_minus_x: [-1, 2],
  exp_minus_3x: [-1, 2],
  log_plus_x_minus_2: [-2.8, 3],
  sin_x: [-2 * Math.PI, 2 * Math.PI],
  cos_x: [-2 * Math.PI, 2 * Math.PI],
  sin_minus_half_x: [-4, 4],
};

const systemDefaultGraphBounds = {
  variant19_system: { xMin: 0.3, xMax: 0.9, yMin: 1.5, yMax: 2 },
  variant20_system: { xMin: -1.2, xMax: 1.2, yMin: -1.2, yMax: 1.2 },
  variant24_system: { xMin: -3, xMax: 3, yMin: -2.2, yMax: 2.2 },
};

function formatCellValue(value) {
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return formatNumber(value, 6);
  }

  return value ?? "—";
}

function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function parseLooseNumber(value) {
  const normalizedRaw = String(value ?? "").trim().replace(/\s+/g, "");
  if (!normalizedRaw) {
    return null;
  }
  if (normalizedRaw.includes(",") && normalizedRaw.includes(".")) {
    return null;
  }

  const numericValue = Number(normalizedRaw.replace(",", "."));
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toInputString(value, fallback = "") {
  return value === undefined || value === null ? fallback : String(value);
}

function stripWrappingQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function pickAllowedId(value, items, fallback) {
  return items.some((item) => item.id === value) ? value : fallback;
}

function formatInputNumber(value, digits = 6) {
  if (!Number.isFinite(value)) {
    return "";
  }
  const rounded = Number(value.toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function getEquationByFormId(id) {
  return equations.find((equation) => equation.id === id) ?? equations[0];
}

function getSystemByFormId(id) {
  return systems.find((system) => system.id === id) ?? systems[0];
}

function getDefaultEquationGraphRange(equation) {
  return equationDefaultGraphRanges[equation.id] ?? [-3, 3];
}

function getDefaultSystemGraphBounds(system) {
  return systemDefaultGraphBounds[system.id] ?? { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
}

function choosePreferredRootInterval(intervals) {
  return [...intervals].sort((leftInterval, rightInterval) => {
    const leftCenter = (leftInterval[0] + leftInterval[1]) / 2;
    const rightCenter = (rightInterval[0] + rightInterval[1]) / 2;
    return Math.abs(leftCenter) - Math.abs(rightCenter) || rightCenter - leftCenter;
  })[0];
}

function createEquationFormDefaults(equationId, currentForm) {
  const equation = getEquationByFormId(equationId);
  const [xMin, xMax] = getDefaultEquationGraphRange(equation);
  const intervals = findRootIntervals(equation, xMin, xMax);
  const interval = choosePreferredRootInterval(intervals);

  return {
    ...currentForm,
    equationId: equation.id,
    hintFrom: formatInputNumber(xMin),
    hintTo: formatInputNumber(xMax),
    ...(interval
      ? {
          a: formatInputNumber(interval[0]),
          b: formatInputNumber(interval[1]),
        }
      : {
          a: formatInputNumber(xMin),
          b: formatInputNumber(xMax),
        }),
  };
}

function normalizeEquationGraphRange(equationForm) {
  const xMin = parseLooseNumber(equationForm.hintFrom);
  const xMax = parseLooseNumber(equationForm.hintTo);
  if (xMin !== null && xMax !== null && xMin < xMax) {
    return equationForm;
  }

  const [defaultXMin, defaultXMax] = getDefaultEquationGraphRange(getEquationByFormId(equationForm.equationId));
  return {
    ...equationForm,
    hintFrom: formatInputNumber(defaultXMin),
    hintTo: formatInputNumber(defaultXMax),
  };
}

function createSystemFormDefaults(systemId, currentForm) {
  const system = getSystemByFormId(systemId);
  const bounds = getDefaultSystemGraphBounds(system);
  return {
    ...currentForm,
    systemId: system.id,
    xMin: formatInputNumber(bounds.xMin),
    xMax: formatInputNumber(bounds.xMax),
    yMin: formatInputNumber(bounds.yMin),
    yMax: formatInputNumber(bounds.yMax),
  };
}

function normalizeSystemGraphBounds(systemForm) {
  const xMin = parseLooseNumber(systemForm.xMin);
  const xMax = parseLooseNumber(systemForm.xMax);
  const yMin = parseLooseNumber(systemForm.yMin);
  const yMax = parseLooseNumber(systemForm.yMax);

  if (xMin !== null && xMax !== null && yMin !== null && yMax !== null && xMin < xMax && yMin < yMax) {
    return systemForm;
  }

  return createSystemFormDefaults(systemForm.systemId, systemForm);
}

function normalizeImportedTaskType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["equation", "function", "уравнение", "функция"].includes(normalized)) {
    return "equation";
  }
  if (["system", "система"].includes(normalized)) {
    return "system";
  }
  return "";
}

function normalizeImportedConfig(rawConfig) {
  const taskType = normalizeImportedTaskType(rawConfig.taskType ?? rawConfig.type);
  if (!taskType) {
    throw new Error('Поле "taskType" должно быть "equation" или "system".');
  }

  if (taskType === "equation") {
    return {
      ...rawConfig,
      taskType,
      equationId: rawConfig.equationId ?? rawConfig.functionId ?? rawConfig.function ?? rawConfig.equation,
      interval: {
        a: rawConfig.interval?.a ?? rawConfig.a,
        b: rawConfig.interval?.b ?? rawConfig.b,
      },
      graph: {
        xMin: rawConfig.graph?.xMin ?? rawConfig.graphBounds?.xMin ?? rawConfig.xMin,
        xMax: rawConfig.graph?.xMax ?? rawConfig.graphBounds?.xMax ?? rawConfig.xMax,
      },
    };
  }

  return {
    ...rawConfig,
    taskType,
    systemId: rawConfig.systemId ?? rawConfig.system,
    initial: {
      x: rawConfig.initial?.x ?? rawConfig.x ?? rawConfig.x0,
      y: rawConfig.initial?.y ?? rawConfig.y ?? rawConfig.y0,
    },
    bounds: {
      xMin: rawConfig.bounds?.xMin ?? rawConfig.xMin,
      xMax: rawConfig.bounds?.xMax ?? rawConfig.xMax,
      yMin: rawConfig.bounds?.yMin ?? rawConfig.yMin,
      yMax: rawConfig.bounds?.yMax ?? rawConfig.yMax,
    },
  };
}

function parseKeyValueConfig(content) {
  const rawConfig = {};
  const lines = String(content).split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      continue;
    }

    const separatorIndex = line.search(/[:=]/);
    if (separatorIndex === -1) {
      throw new Error(`Строка "${line}" должна быть в формате key=value.`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1));
    if (!key) {
      throw new Error("Имя параметра в файле не должно быть пустым.");
    }
    rawConfig[key] = value;
  }

  if (Object.keys(rawConfig).length === 0) {
    throw new Error("Файл пустой или содержит только комментарии.");
  }

  return normalizeImportedConfig(rawConfig);
}

function parseConfigFile(content) {
  const trimmed = String(content).trim();
  if (!trimmed) {
    throw new Error("Файл пустой.");
  }

  try {
    return normalizeImportedConfig(JSON.parse(trimmed));
  } catch (jsonError) {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      throw new Error(`Некорректный JSON: ${jsonError.message}`);
    }
    return parseKeyValueConfig(trimmed);
  }
}

function formatScalar(value, digits = 3) {
  const numericValue = parseLooseNumber(value);
  return numericValue === null ? String(value ?? "—") : formatNumber(numericValue, digits);
}

function formatRange(start, end, digits = 3) {
  const left = parseLooseNumber(start);
  const right = parseLooseNumber(end);

  if (left === null || right === null) {
    return "—";
  }

  return `[${formatNumber(left, digits)}, ${formatNumber(right, digits)}]`;
}

function cloneBounds(bounds) {
  return {
    xMin: bounds.xMin,
    xMax: bounds.xMax,
    yMin: bounds.yMin,
    yMax: bounds.yMax,
  };
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

function getGraphMarker(source) {
  if (source.taskType === "equation" && source.result?.root !== undefined) {
    return {
      x: source.result.root,
      y: source.result.fx,
      label: `(${formatNumber(source.result.root, 4)}, ${formatNumber(source.result.fx, 4)})`,
    };
  }

  if (source.taskType === "system" && source.result?.solution) {
    return {
      x: source.result.solution.x,
      y: source.result.solution.y,
      label: `(${formatNumber(source.result.solution.x, 4)}, ${formatNumber(source.result.solution.y, 4)})`,
    };
  }

  return null;
}

function createInteractiveGraph(source, bounds) {
  if (source.taskType === "equation") {
    return createEquationGraphSvg(source.equation, {
      a: bounds.xMin,
      b: bounds.xMax,
      bounds,
      marker: getGraphMarker(source),
    });
  }

  return createSystemGraphSvg(source.system, {
    bounds,
    marker: getGraphMarker(source),
  });
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
        Выбери уравнение или систему, задай параметры и запусти вычисление. График, таблица итераций
        и текстовый вывод появятся здесь.
      </p>
    </section>
  `;
}

function InteractiveGraphPanel({ source, title }) {
  const initialBounds = source.graph.bounds;
  const resetKey = [
    source.taskType,
    source.equation?.id ?? source.system?.id,
    initialBounds.xMin,
    initialBounds.xMax,
    initialBounds.yMin,
    initialBounds.yMax,
    getGraphMarker(source)?.label ?? "",
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

  const marker = getGraphMarker(source);
  const graphSummary = [
    ["x", formatRange(graph.bounds.xMin, graph.bounds.xMax, 3)],
    ["y", formatRange(graph.bounds.yMin, graph.bounds.yMax, 3)],
    ...(marker ? [["точка", marker.label]] : []),
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
          <button type="button" className="ghost-button graph-step-button" onClick=${() => applyZoom(zoomLevel - 1)}>
            −
          </button>
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
          <button type="button" className="ghost-button graph-step-button" onClick=${() => applyZoom(zoomLevel + 1)}>
            +
          </button>
          <button type="button" className="ghost-button graph-reset-button" onClick=${resetGraphView}>
            Сброс
          </button>
        </div>
      </div>
      <div className="coordinate-strip graph-strip">
        ${graphSummary.map(
          ([label, value]) => html`<${CoordinateChip} key=${label} label=${label} value=${value} />`,
        )}
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
      <${InteractiveGraphPanel}
        source=${preview}
        title=${preview.taskType === "equation" ? preview.equation.name : preview.system.name}
      />
      <section className="panel output-panel">
        <div className="panel-topline">
          <div>
            <p className="eyebrow">Комментарий</p>
            <h2>График построен без решения</h2>
          </div>
        </div>
        <pre className="result-text">${message}</pre>
      </section>
    </section>
  `;
}

function ResultPanel({ result }) {
  const metrics =
    result.taskType === "equation"
      ? [
          ["Корень", formatNumber(result.result.root, 10)],
          ["f(x)", formatNumber(result.result.fx, 10)],
          ["Итерации", String(result.result.iterations)],
          ...(result.result.metadata?.q !== undefined
            ? [["q", formatNumber(result.result.metadata.q, 6)]]
            : []),
        ]
      : [
          ["x", formatNumber(result.result.solution.x, 10)],
          ["y", formatNumber(result.result.solution.y, 10)],
          ["F1", formatNumber(result.result.residuals[0], 10)],
          ["F2", formatNumber(result.result.residuals[1], 10)],
          ["Итерации", String(result.result.iterations)],
        ];

  return html`
    <section className="results-stack">
      <section className="panel metrics-panel">
        <div className="panel-topline">
          <div>
            <p className="eyebrow">Результаты</p>
            <h2>${result.taskType === "equation" ? result.equation.name : result.system.name}</h2>
          </div>
          <div className="action-row">
            <button
              type="button"
              className="ghost-button"
              onClick=${() => downloadText("result.txt", result.text)}
            >
              Скачать txt
            </button>
          </div>
        </div>
        <div className="metrics-grid">
          ${metrics.map(
            ([label, value]) => html`<${MetricCard} key=${label} label=${label} value=${value} />`,
          )}
        </div>
      </section>

      <${InteractiveGraphPanel} source=${result} title="Визуализация функции и процесса решения" />

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
            <p className="eyebrow">История итераций</p>
            <h2>Подробная таблица шагов метода</h2>
          </div>
        </div>
        <div className="table-shell">
          <table className="history-table">
            <thead>
              <tr>
                ${result.historyColumns.map(
                  (column) => html`<th key=${column.key}>${column.label}</th>`,
                )}
              </tr>
            </thead>
            <tbody>
              ${result.result.history.map(
                (row, index) => html`
                  <tr key=${`${row.iteration ?? index}`}>
                    ${result.historyColumns.map(
                      (column) => html`
                        <td key=${column.key}>${formatCellValue(row[column.key])}</td>
                      `,
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

function App() {
  const [taskType, setTaskType] = useState("equation");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [equationForm, setEquationForm] = useState({
    equationId: "variant19_poly",
    method: "newton",
    a: "0",
    b: "1",
    epsilon: "0.001",
    hintFrom: "-3",
    hintTo: "3",
  });
  const [systemForm, setSystemForm] = useState({
    systemId: "variant19_system",
    method: "newtonSystem",
    x: "0.5",
    y: "1.75",
    epsilon: "0.001",
    xMin: "0.3",
    xMax: "0.9",
    yMin: "1.5",
    yMax: "2",
  });

  const deferredResult = useDeferredValue(result);
  const deferredPreview = useDeferredValue(preview);
  const selectedEquation = getEquationByFormId(equationForm.equationId);
  let intervalHints = [];
  const activeSummary =
    taskType === "equation"
      ? [
          ["x", formatRange(equationForm.a, equationForm.b, 3)],
          ["график", formatRange(equationForm.hintFrom, equationForm.hintTo, 2)],
          ["ε", formatScalar(equationForm.epsilon, 4)],
        ]
      : [
          ["x", formatRange(systemForm.xMin, systemForm.xMax, 3)],
          ["y", formatRange(systemForm.yMin, systemForm.yMax, 3)],
          ["ε", formatScalar(systemForm.epsilon, 4)],
        ];

  try {
    const hintFrom = parseLooseNumber(equationForm.hintFrom);
    const hintTo = parseLooseNumber(equationForm.hintTo);
    if (hintFrom !== null && hintTo !== null && hintFrom < hintTo) {
      intervalHints = findRootIntervals(selectedEquation, hintFrom, hintTo);
    }
  } catch {
    intervalHints = [];
  }

  function solveFromForms(nextTaskType, nextEquationForm = equationForm, nextSystemForm = systemForm) {
    try {
      const preparedEquationForm =
        nextTaskType === "equation" ? normalizeEquationGraphRange(nextEquationForm) : nextEquationForm;
      if (preparedEquationForm !== nextEquationForm) {
        setEquationForm(preparedEquationForm);
      }
      const preparedSystemForm =
        nextTaskType === "system" ? normalizeSystemGraphBounds(nextSystemForm) : nextSystemForm;
      if (preparedSystemForm !== nextSystemForm) {
        setSystemForm(preparedSystemForm);
      }

      const nextResult =
        nextTaskType === "equation"
          ? solveEquationTask({
              taskType: "equation",
              equationId: preparedEquationForm.equationId,
              method: preparedEquationForm.method,
              interval: {
                a: preparedEquationForm.a,
                b: preparedEquationForm.b,
              },
              epsilon: preparedEquationForm.epsilon,
              graph: {
                xMin: preparedEquationForm.hintFrom,
                xMax: preparedEquationForm.hintTo,
              },
            })
          : solveSystemTask({
              taskType: "system",
              systemId: preparedSystemForm.systemId,
              method: preparedSystemForm.method,
              initial: {
                x: preparedSystemForm.x,
                y: preparedSystemForm.y,
              },
              epsilon: preparedSystemForm.epsilon,
              bounds: {
                xMin: preparedSystemForm.xMin,
                xMax: preparedSystemForm.xMax,
                yMin: preparedSystemForm.yMin,
                yMax: preparedSystemForm.yMax,
              },
            });

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
    solveFromForms(taskType);
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = parseConfigFile(await file.text());

      if (parsed.taskType === "equation") {
        const equationId = pickAllowedId(parsed.equationId, equations, equationForm.equationId);
        const defaultEquationForm = createEquationFormDefaults(equationId, equationForm);
        const nextEquationForm = {
          ...defaultEquationForm,
          method: pickAllowedId(parsed.method, variant19EquationMethods, equationForm.method),
          a: toInputString(parsed.interval?.a, defaultEquationForm.a),
          b: toInputString(parsed.interval?.b, defaultEquationForm.b),
          epsilon: toInputString(parsed.epsilon, equationForm.epsilon),
          hintFrom: toInputString(
            parsed.graph?.xMin ?? parsed.graphBounds?.xMin,
            defaultEquationForm.hintFrom,
          ),
          hintTo: toInputString(
            parsed.graph?.xMax ?? parsed.graphBounds?.xMax,
            defaultEquationForm.hintTo,
          ),
        };

        setTaskType("equation");
        setEquationForm(nextEquationForm);
        solveFromForms("equation", nextEquationForm, systemForm);
        return;
      }

      if (parsed.taskType === "system") {
        const systemId = pickAllowedId(parsed.systemId, systems, systemForm.systemId);
        const defaultSystemForm = createSystemFormDefaults(systemId, systemForm);
        const nextSystemForm = {
          ...defaultSystemForm,
          method: pickAllowedId(parsed.method, variant19SystemMethods, systemForm.method),
          x: toInputString(parsed.initial?.x, systemForm.x),
          y: toInputString(parsed.initial?.y, systemForm.y),
          epsilon: toInputString(parsed.epsilon, systemForm.epsilon),
          xMin: toInputString(parsed.bounds?.xMin, defaultSystemForm.xMin),
          xMax: toInputString(parsed.bounds?.xMax, defaultSystemForm.xMax),
          yMin: toInputString(parsed.bounds?.yMin, defaultSystemForm.yMin),
          yMax: toInputString(parsed.bounds?.yMax, defaultSystemForm.yMax),
        };

        setTaskType("system");
        setSystemForm(nextSystemForm);
        solveFromForms("system", equationForm, nextSystemForm);
        return;
      }

      throw new Error('Поле "taskType" должно быть "equation" или "system".');
    } catch (nextError) {
      setResult(null);
      setPreview(null);
      setError(`Не удалось загрузить файл "${file.name}": ${nextError.message}`);
    } finally {
      event.target.value = "";
    }
  }

  return html`
    <main className="page-shell">
      <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">Numerical Methods · Lab 2</p>
          <h1>Интерфейс для лабораторной №2</h1>
          <p className="hero-text">
            Здесь можно задать параметры, построить график и посмотреть историю итераций.
          </p>
          <div className="coordinate-strip">
            ${activeSummary.map(
              ([label, value]) => html`<${CoordinateChip} key=${label} label=${label} value=${value} />`,
            )}
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <section className="panel control-panel">
          <div className="panel-topline">
            <div>
              <p className="eyebrow">Параметры</p>
              <h2>Настройка задачи</h2>
            </div>
            <div className="switcher" role="tablist" aria-label="Тип задачи">
              <button
                type="button"
                className=${taskType === "equation" ? "switcher-button active" : "switcher-button"}
                onClick=${() => setTaskType("equation")}
              >
                Уравнение
              </button>
              <button
                type="button"
                className=${taskType === "system" ? "switcher-button active" : "switcher-button"}
                onClick=${() => setTaskType("system")}
              >
                Система
              </button>
            </div>
          </div>

          <div className="upload-row">
            <label className="ghost-button file-button">
              Загрузить из файла
              <input
                type="file"
                accept=".json,.txt,.cfg,application/json,text/plain"
                className="file-input"
                onChange=${handleFileUpload}
              />
            </label>
            <span className="field-hint">Поддерживаются JSON и текстовые файлы key=value.</span>
          </div>

          <form className="solver-form" onSubmit=${handleSolve}>
            ${taskType === "equation"
              ? html`
                  <div className="form-grid">
                    <${Field} label="Функция">
                      <select
                        value=${equationForm.equationId}
                        onChange=${(event) =>
                          setEquationForm((current) =>
                            createEquationFormDefaults(event.target.value, current),
                          )}
                      >
                        ${equations.map(
                          (equation) => html`
                            <option key=${equation.id} value=${equation.id}>
                              ${equation.name}
                            </option>
                          `,
                        )}
                      </select>
                    </${Field}>

                    <${Field} label="Метод">
                      <select
                        value=${equationForm.method}
                        onChange=${(event) =>
                          setEquationForm((current) => ({
                            ...current,
                            method: event.target.value,
                          }))}
                      >
                        ${variant19EquationMethods.map(
                          (method) => html`
                            <option key=${method.id} value=${method.id}>
                              ${method.label}
                            </option>
                          `,
                        )}
                      </select>
                    </${Field}>

                    <${Field} label="Левая граница a">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${equationForm.a}
                        onChange=${(event) =>
                          setEquationForm((current) => ({
                            ...current,
                            a: event.target.value,
                          }))}
                      />
                    </${Field}>

                    <${Field} label="Правая граница b">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${equationForm.b}
                        onChange=${(event) =>
                          setEquationForm((current) => ({
                            ...current,
                            b: event.target.value,
                          }))}
                      />
                    </${Field}>

                    <${Field} label="Точность epsilon">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${equationForm.epsilon}
                        onChange=${(event) =>
                          setEquationForm((current) => ({
                            ...current,
                            epsilon: event.target.value,
                          }))}
                      />
                    </${Field}>
                  </div>

                  <section className="hint-box">
                    <div className="hint-copy">
                      <p className="eyebrow">Подсказка по изоляции</p>
                      <h3>${selectedEquation.description}</h3>
                      <p>
                        По диапазону графика автоматически ищутся интервалы смены знака, которые можно
                        одним кликом подставить в форму.
                      </p>
                    </div>

                    <div className="hint-range">
                      <${Field} label="xMin">
                        <input
                          type="text"
                          inputMode="decimal"
                          value=${equationForm.hintFrom}
                          onChange=${(event) =>
                            setEquationForm((current) => ({
                              ...current,
                              hintFrom: event.target.value,
                            }))}
                        />
                      </${Field}>
                      <${Field} label="xMax">
                        <input
                          type="text"
                          inputMode="decimal"
                          value=${equationForm.hintTo}
                          onChange=${(event) =>
                            setEquationForm((current) => ({
                              ...current,
                              hintTo: event.target.value,
                            }))}
                        />
                      </${Field}>
                    </div>

                    <div className="interval-list">
                      ${intervalHints.length > 0
                        ? intervalHints.map(
                            ([left, right], index) => html`
                              <button
                                key=${`${left}-${right}-${index}`}
                                type="button"
                                className="interval-chip"
                                onClick=${() =>
                                  setEquationForm((current) => ({
                                    ...current,
                                    a: left.toFixed(6),
                                    b: right.toFixed(6),
                                  }))}
                              >
                                [${formatNumber(left, 3)}; ${formatNumber(right, 3)}]
                              </button>
                            `,
                          )
                        : html`<span className="interval-empty">Интервалы пока не найдены.</span>`}
                    </div>
                  </section>
                `
              : html`
                  <div className="form-grid">
                    <${Field} label="Система">
                      <select
                        value=${systemForm.systemId}
                        onChange=${(event) =>
                          setSystemForm((current) =>
                            createSystemFormDefaults(event.target.value, current),
                          )}
                      >
                        ${systems.map(
                          (system) => html`
                            <option key=${system.id} value=${system.id}>
                              ${system.name}
                            </option>
                          `,
                        )}
                      </select>
                    </${Field}>

                    <${Field} label="Метод">
                      <select
                        value=${systemForm.method}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            method: event.target.value,
                          }))}
                      >
                        ${variant19SystemMethods.map(
                          (method) => html`
                            <option key=${method.id} value=${method.id}>
                              ${method.label}
                            </option>
                          `,
                        )}
                      </select>
                    </${Field}>

                    <${Field} label="Начальное x0">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${systemForm.x}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            x: event.target.value,
                          }))}
                      />
                    </${Field}>

                    <${Field} label="Начальное y0">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${systemForm.y}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            y: event.target.value,
                          }))}
                      />
                    </${Field}>

                    <${Field} label="Точность epsilon">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${systemForm.epsilon}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            epsilon: event.target.value,
                          }))}
                      />
                    </${Field}>
                  </div>

                  <section className="bounds-grid">
                    <${Field} label="xMin">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${systemForm.xMin}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            xMin: event.target.value,
                          }))}
                      />
                    </${Field}>
                    <${Field} label="xMax">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${systemForm.xMax}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            xMax: event.target.value,
                          }))}
                      />
                    </${Field}>
                    <${Field} label="yMin">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${systemForm.yMin}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            yMin: event.target.value,
                          }))}
                      />
                    </${Field}>
                    <${Field} label="yMax">
                      <input
                        type="text"
                        inputMode="decimal"
                        value=${systemForm.yMax}
                        onChange=${(event) =>
                          setSystemForm((current) => ({
                            ...current,
                            yMax: event.target.value,
                          }))}
                      />
                    </${Field}>
                  </section>
                `}

            <button className="solve-button" type="submit">Решить задачу</button>
          </form>

          ${error
            ? html`
                <div className="error-box">
                  <strong>Ошибка расчёта</strong>
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
