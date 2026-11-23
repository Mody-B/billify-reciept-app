import { toMinorUnits } from "./numerals";

export function formatMoney(cents: number, symbol: string, fractionDigits = 2): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const digits = fractionDigits < 0 ? 0 : fractionDigits;
  if (digits === 0) return `${sign}${symbol}${abs}`;
  const scale = 10 ** digits;
  const major = Math.floor(abs / scale);
  const minor = abs % scale;
  return `${sign}${symbol}${major}.${String(minor).padStart(digits, "0")}`;
}

export function formatCentsForInput(cents: number, fractionDigits = 2): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const digits = fractionDigits < 0 ? 0 : fractionDigits;
  if (digits === 0) return `${sign}${abs}`;
  const scale = 10 ** digits;
  return `${sign}${Math.floor(abs / scale)}.${String(abs % scale).padStart(digits, "0")}`;
}

/** Line amount in cents. `priceCents` is the unit price and stays that way. */
export function lineTotalCents(quantity: number, unitPriceCents: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPriceCents)) return 0;
  const count = Math.trunc(quantity);
  const unit = Math.trunc(unitPriceCents);
  if (count <= 0) return 0;
  return count * unit;
}

/**
 * Cents to apply while a money field is being typed.
 * A leading minus or parentheses is rejected whole, so the sign is not stripped
 * off and the remaining digits are not saved as a positive amount.
 */
export function liveMoneyCents(raw: string, fractionDigits = 2): number | null {
  const trimmed = raw.trim().replace(/^[−‐‒–—]/, "-");
  if (!trimmed) return 0;
  if (trimmed.startsWith("-") || trimmed.endsWith("-") || /^\(.*\)$/.test(trimmed)) return null;
  const parsed = parseMoneyInput(trimmed, fractionDigits);
  if (parsed == null || parsed < 0) return null;
  return parsed;
}

export function parseMoneyInput(raw: string, fractionDigits = 2): number | null {
  return toMinorUnits(raw, fractionDigits);
}

export function shareLabel(weight: number, weightTotal: number): string | null {
  if (!Number.isFinite(weight) || !Number.isFinite(weightTotal) || weightTotal <= 0) return null;
  if (weight === weightTotal) return null;
  const scale = 1000;
  const left = Math.round(weight * scale);
  const right = Math.round(weightTotal * scale);
  const divisor = gcd(Math.abs(left), Math.abs(right));
  if (divisor === 0) return null;
  return `${left / divisor}/${right / divisor}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}
