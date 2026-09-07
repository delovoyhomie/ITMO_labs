export const EPSILON = 1e-12;

export function parseLooseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value ?? "").trim().replace(/\s+/g, "");
  if (!normalized) {
    return null;
  }

  if (normalized.includes(",") && normalized.includes(".")) {
    return null;
  }

  const numericValue = Number(normalized.replace(",", "."));
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatNumber(value, digits = 6) {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  const normalized = Object.is(value, -0) ? 0 : value;
  if (Math.abs(normalized) >= 100000 || (Math.abs(normalized) > 0 && Math.abs(normalized) < 0.0001)) {
    return normalized.toExponential(Math.min(digits, 8));
  }

  return normalized.toFixed(digits).replace(/\.?0+$/, "");
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values) {
  if (values.length === 0) {
    return 0;
  }
  return sum(values) / values.length;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
