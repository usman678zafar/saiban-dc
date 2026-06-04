export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function toIsoString(value: unknown) {
  return isValidDate(value) ? value.toISOString() : '';
}

export function toDateInputValue(value: unknown) {
  return toIsoString(value).slice(0, 10);
}
