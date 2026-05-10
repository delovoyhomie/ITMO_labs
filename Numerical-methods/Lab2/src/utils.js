export function formatNumber(value, digits = 6) {
  if (!Number.isFinite(value)) {
    return "NaN";
  }
  return value.toFixed(digits);
}

export function formatSigned(value, digits = 6) {
  const formatted = formatNumber(value, digits);
  return value >= 0 ? `+${formatted}` : formatted;
}

export function toMarkdownNumber(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "NaN";
}

export function maxAbs(values) {
  return Math.max(...values.map((value) => Math.abs(value)));
}

export function parseNumber(raw, fieldName) {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      throw new Error(`Поле "${fieldName}" должно быть числом.`);
    }
    return raw;
  }

  const normalizedRaw = String(raw).trim().replace(/\s+/g, "");
  if (!normalizedRaw) {
    throw new Error(`Поле "${fieldName}" не должно быть пустым.`);
  }
  if (normalizedRaw.includes(",") && normalizedRaw.includes(".")) {
    throw new Error(
      `Поле "${fieldName}" должно содержать число с одним типом разделителя: либо "." либо ",".`,
    );
  }

  const value = Number(normalizedRaw.replace(",", "."));
  if (!Number.isFinite(value)) {
    throw new Error(`Поле "${fieldName}" должно быть числом. Допустимы разделители "." и ",".`);
  }
  return value;
}

export function normalizeBounds(bounds) {
  const { xMin, xMax, yMin, yMax } = bounds;
  if (!(xMin < xMax && yMin < yMax)) {
    throw new Error("Границы графика заданы некорректно.");
  }
  return { xMin, xMax, yMin, yMax };
}

export function resultHeader(title) {
  return `${title}\n${"-".repeat(title.length)}`;
}
