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

export function toMarkdownNumber(value, digits = 5) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export function formatPercent(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(digits)}%`;
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

export function resultHeader(title) {
  return `${title}\n${"-".repeat(title.length)}`;
}
