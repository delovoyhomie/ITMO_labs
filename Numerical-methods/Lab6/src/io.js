import { EQUATIONS, validateProblem } from "./ode.js";
import { formatNumber as f } from "./utils.js";

const FIELDS = ["equation", "x0", "y0", "xn", "h", "epsilon"];

export function parseProblem(text) {
  text = String(text).replace(/^\uFEFF/, "").trim();
  if (!text) throw new Error("Файл пуст.");
  let data;
  if (/^[[{]/.test(text)) {
    try { data = JSON.parse(text); } catch { throw new Error("Некорректный JSON."); }
    if (Array.isArray(data)) throw new Error("Ожидается объект с полями equation, x0, y0, xn, h, epsilon.");
  } else {
    data = {};
    for (const [index, row] of text.split(/\r?\n/).entries()) {
      const line = row.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.search(/[=:]/);
      if (separator < 0) throw new Error(`Строка ${index + 1}: ожидается «имя = значение».`);
      const key = line.slice(0, separator).trim().toLowerCase();
      if (!FIELDS.includes(key)) throw new Error(`Строка ${index + 1}: неизвестное поле «${key}».`);
      data[key] = line.slice(separator + 1).trim();
    }
  }
  const present = key => data[key] !== undefined || (key === "equation" && data.equationId !== undefined);
  const missing = FIELDS.slice(0, 5).filter(key => !present(key));
  if (missing.length) throw new Error(`Не заданы поля: ${missing.join(", ")}.`);
  return validateProblem(data);
}

export function formatProblem(problem) {
  const { equation, x0, y0, xn, h, requestedH, epsilon } = problem;
  const adjusted = Number.isFinite(requestedH)
    && Math.abs(requestedH - h) > 1e-12 * Math.max(1, Math.abs(requestedH));
  const step = adjusted ? `${f(h)} (задано ${f(requestedH)})` : f(h);
  return [`Уравнение: ${equation.label}`, `Точное решение: ${equation.solutionLabel}`,
    `Начальное условие: y(${f(x0)}) = ${f(y0)}`, `Интервал: [${f(x0)}; ${f(xn)}], шаг h = ${step}`,
    `Точность ε = ${epsilon.toExponential(2)}`].join("\n");
}

function pad(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map(row => row[i].length)));
  return rows.map(row => row.map((value, i) => value.padStart(widths[i])).join("  ")).join("\n");
}

export function formatSolutionTable(solution) {
  const { nodes, exactValues, results, singular } = solution;
  const applicable = results.filter(r => r.applicable);
  const header = ["i", "x_i", ...applicable.map(r => r.short), "y точн"];
  const rows = nodes.map((x, i) => [String(i), f(x, 6),
    ...applicable.map(r => f(r.commonValues[i], 8)), singular && !Number.isFinite(exactValues[i]) ? "—" : f(exactValues[i], 8)]);
  return pad([header, ...rows]);
}

export function formatErrorTable(solution) {
  const rows = [["Метод", "p", "Способ оценки", "Оценка", "при h", "в узле"]];
  for (const result of solution.results) {
    if (!result.applicable) { rows.push([result.label, "—", "не применим", "—", "—", "—"]); continue; }
    if (result.kind === "one-step") {
      const last = result.runge.steps.at(-1);
      rows.push([result.label, String(result.order), "правило Рунге",
        last ? f(last.error, 10) : "—", last ? f(last.h, 8) : "—", last ? f(last.at, 6) : "—"]);
    } else {
      rows.push([result.label, String(result.order), "max|y точн − y|",
        f(result.error.value, 10), f(result.h, 8), f(result.error.at, 6)]);
    }
  }
  return pad(rows.map(row => row.map(String)));
}

export function formatSolution(solution) {
  const lines = ["Лабораторная работа №6. Численное решение ОДУ. Вариант 19 (методы 1, 3, 4).", "",
    formatProblem(solution.problem), "", `Общих узлов исходной сетки: ${solution.nodes.length}.`, "",
    "Итоговые решения в общих узлах исходной сетки:", formatSolutionTable(solution), "",
    "Погрешность каждого метода в узлах сетки (max|y точн − y_i|):"];
  for (const result of solution.results) {
    lines.push(result.applicable
      ? `  ${result.label}: ${f(result.error.value, 10)} при x = ${f(result.error.at, 6)}`
      : `  ${result.label}: не применим — ${result.reason}`);
  }
  lines.push("", "Оценка точности:", formatErrorTable(solution));
  for (const result of solution.results.filter(r => r.applicable && r.kind === "one-step")) {
    lines.push("", `Правило Рунге, ${result.label} (p = ${result.order}):`);
    lines.push(pad([["h", "узлов", "R = |y_h − y_h/2|/(2^p − 1)", "x", "R ≤ ε"],
      ...result.runge.steps.map(step => [f(step.h, 8), String(step.nodes), f(step.error, 10), f(step.at, 6), step.ok ? "да" : "нет"])]));
    lines.push(result.runge.converged
      ? `  Точность достигнута при h = ${f(result.runge.h, 8)}.`
      : `  ${result.runge.reason}`);
  }
  const adams = solution.results.find(r => r.id === "adams");
  if (adams?.applicable) {
    const iterations = adams.corrections.slice(4);
    lines.push("", "Контроль точности, метод Адамса:");
    lines.push(pad([["h", "узлов", "max|y точн − y|", "x", "≤ ε"],
      ...adams.exactRefinement.steps.map(step => [f(step.h, 8), String(step.nodes ?? "—"),
        Number.isFinite(step.error) ? f(step.error, 10) : "∞", step.at === undefined ? "—" : f(step.at, 6), step.ok ? "да" : "нет"])]));
    lines.push(adams.exactRefinement.converged
      ? `  Точность достигнута при h = ${f(adams.h, 8)}.`
      : `  ${adams.exactRefinement.reason}`);
    if (iterations.length) {
      const limits = iterations.reduce(({ min, max }, value) => ({ min: Math.min(min, value), max: Math.max(max, value) }),
        { min: Infinity, max: -Infinity });
      lines.push(`  Разгон методом Рунге-Кутта (y₁, y₂, y₃); итераций корректора на шаг — от ${limits.min} до ${limits.max}.`);
    }
  }
  lines.push(...solution.warnings.map(w => `Предупреждение: ${w}`));
  return lines.join("\n");
}

export function equationChoices() {
  return EQUATIONS.map((equation, i) => `${i + 1}. ${equation.label}   (${equation.solutionLabel})`).join("\n");
}
