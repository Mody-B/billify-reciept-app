/**
 * Keep what the person typed. A minus or a decimal stays in the text.
 * Characters are never stripped out, so "3.5" cannot collapse to "35"
 * and "1-3" cannot collapse to "13".
 */
export function reviseIntegerDraft(previous: string, incoming: string, maxDigits: number): string {
  if (incoming === "") return "";
  const pattern = new RegExp(`^-?\\d{0,${maxDigits}}(?:\\.\\d*)?$`);
  if (pattern.test(incoming)) return incoming;
  return previous;
}

/** A whole number in range. Decimals and negatives are not coerced into one. */
export function integerDraftValue(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}
