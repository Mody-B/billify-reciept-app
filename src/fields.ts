import { normalizeIntegerTyping } from "./numerals";

/**
 * Keep what the person typed. A minus or a decimal stays in the text.
 * Characters are never stripped out, so "3.5" cannot collapse to "35"
 * and "1-3" cannot collapse to "13".
 */

export function reviseIntegerDraft(previous: string, incoming: string, maxDigits: number): string {
  if (incoming === "") return "";
  const normalized = normalizeIntegerTyping(incoming);
  const pattern = new RegExp(`^-?\\d{0,${maxDigits}}(?:\\.\\d*)?$`);
  if (pattern.test(normalized)) return normalized;
  return previous;
}

/** A whole number in range. Decimals and negatives are not coerced into one. */
export function integerDraftValue(text: string, min: number, max: number): number | null {
  const normalized = normalizeIntegerTyping(text);
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}
