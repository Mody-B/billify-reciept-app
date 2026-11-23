export function formatMoney(cents: number, symbol: string): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${symbol}${dollars}.${String(remainder).padStart(2, "0")}`;
}

export function formatCentsForInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
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
export function liveMoneyCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  if (trimmed.startsWith("-") || /^\(.*\)$/.test(trimmed)) return null;
  const parsed = parseMoneyInput(trimmed);
  if (parsed == null || parsed < 0) return null;
  return parsed;
}

export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  let body = trimmed.replace(/[()]/g, "").replace(/-/g, "");
  body = body.replace(/[^\d.,]/g, "");
  if (!body) return null;

  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");
  let normalized = body;
  if (lastComma > lastDot) normalized = body.replace(/\./g, "").replace(",", ".");
  else normalized = body.replace(/,/g, "");

  if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return negative ? -cents : cents;
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
