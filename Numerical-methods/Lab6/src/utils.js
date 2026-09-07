export function parseNumber(value, label = "Число") {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) {
    throw new Error(`${label}: требуется конечное число.`);
  }
  const result = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(result)) throw new Error(`${label}: требуется конечное число.`);
  return result;
}

export function formatNumber(value, digits = 10) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  if (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e7) return value.toExponential(4);
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

export function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
