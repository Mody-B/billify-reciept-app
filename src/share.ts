import { parseDraft } from "./draft";
import { formatMoney, lineTotalCents } from "./money";
import type { BillSnapshot } from "./billSnapshot";

export function encodeShare(bill: BillSnapshot): string {
  const bytes = new TextEncoder().encode(JSON.stringify(bill));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeShare(token: string): BillSnapshot | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return parseDraft(json);
  } catch {
    return null;
  }
}

export function shareTokenFromHash(hash: string): string | null {
  const match = hash.match(/^#s=(.+)$/);
  return match ? match[1] : null;
}

export function whoPaysWhatText(input: {
  dateLabel: string;
  symbol: string;
  lines: { label: string; cents: number }[];
  totalCents: number;
}): string {
  const rows = input.lines.map((line) => `${line.label}  ${formatMoney(line.cents, input.symbol)}`);
  rows.push(`Total  ${formatMoney(input.totalCents, input.symbol)}`);
  return [`Splitit`, input.dateLabel, "", ...rows, ""].join("\n");
}

export function itemLineLabel(name: string, quantity: number, unitCents: number, symbol: string): string {
  const label = name.trim() || "Item";
  if (quantity > 1) return `${quantity}× ${label} (${formatMoney(unitCents, symbol)} each)`;
  return label;
}

export function itemLineCents(quantity: number, unitCents: number): number {
  return lineTotalCents(quantity, unitCents);
}
