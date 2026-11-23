import { normalizeDigits, toMinorUnits } from "../numerals";

function amountMinor(token: string): number | null {
  const raw = token.trim();
  if (!raw || /%|٪/.test(raw)) return null;
  const body = normalizeDigits(raw).replace(/[$€£¥]/g, "");
  if (/[A-Za-z\u0600-\u06FF]/.test(body.replace(/[\d\s.,٫٬،()\-−]/g, ""))) return null;
  const separated = /[.,٫٬،]/.test(body);
  const digits = body.replace(/\D/g, "");
  if (!separated && digits.length <= 2) return null;
  const fraction = body.replace(/٬/g, "").replace(/،/g, ".").replace(/٫/g, ".").match(/\.(\d+)/);
  const places = fraction?.[1].length === 3 ? 3 : fraction ? 2 : 0;
  return toMinorUnits(raw, places);
}

function isTotalLabel(name: string): boolean {
  const folded = name.trim().toLowerCase();
  if (/^(sub ?total|total|tax|vat|gst|cash|item|grand total|amount due|balance due|tip|gratuity|service|thank)/.test(folded)) {
    return true;
  }
  return /مجموع|اجمالي|إجمالي|صافي|مطلوب|ضريب|خدم|اكرامي|إكرامي|توصيل|خصم/.test(name);
}

export function printedItems(source: string): { name: string; minor: number }[] {
  const found: { name: string; minor: number }[] = [];
  for (const line of source.split(/\r?\n/)) {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    const amounts: number[] = [];
    const nameTokens: string[] = [];
    for (const token of tokens) {
      const amount = amountMinor(token);
      if (amount != null) amounts.push(amount);
      else if (!/^\d{1,2}$/.test(normalizeDigits(token).replace(/[×x]/gi, ""))) nameTokens.push(token);
    }
    if (amounts.length === 0) continue;
    const name = nameTokens.join(" ").replace(/\s+/g, " ").trim();
    if (!name || isTotalLabel(name)) continue;
    found.push({ name, minor: amounts[amounts.length - 1] });
  }
  return found;
}

function sourceOf(body: Record<string, unknown>): string {
  if (typeof body.transcript === "string" && body.transcript.trim()) return body.transcript;
  if (Array.isArray(body.lines)) return body.lines.filter((line) => typeof line === "string").join("\n");
  return "";
}

function itemMinor(item: Record<string, unknown>): number | null {
  const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
  const line = [item.lineTotalMinor, item.lineTotalCents, item.lineTotal, item.priceCents].find(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  if (typeof line === "number") return Math.trunc(line);
  const unit = [item.unitPriceMinor, item.unitPriceCents].find((value) => typeof value === "number" && Number.isFinite(value));
  if (typeof unit === "number") return Math.trunc(unit) * quantity;
  return null;
}

/**
 * The printed line wins. A name that is not on that line is a guess and is dropped.
 * An unclear glyph stays flagged instead of being replaced with a different word.
 */
export function keepPrintedNames<T extends Record<string, unknown>>(body: T): T {
  if (!Array.isArray(body.items)) return body;
  const source = sourceOf(body);
  const printed = source ? printedItems(source) : [];
  const used = new Set<number>();
  const items = [];
  for (const entry of body.items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const current = typeof item.name === "string" ? item.name.trim() : "";
    const explicit = typeof item.printed === "string" ? item.printed.trim() : "";
    const price = itemMinor(item);
    let match: { name: string; minor: number } | null = null;
    if (price != null) {
      const index = printed.findIndex((line, lineIndex) => !used.has(lineIndex) && line.minor === price);
      if (index >= 0) {
        used.add(index);
        match = printed[index];
      }
    }
    if (match && match.name !== current) {
      items.push({ ...item, name: match.name, flagged: false });
      continue;
    }
    if (explicit && explicit !== current) {
      items.push({ ...item, name: explicit, flagged: item.flagged === true });
      continue;
    }
    if (source && current && !source.includes(current) && !match) continue;
    if (current) items.push(item);
  }
  return { ...body, items };
}
