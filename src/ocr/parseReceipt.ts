export type OcrWord = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence?: number;
};

export type ParsedItem = {
  name: string;
  quantity: number;
  priceCents: number;
};

export type ParsedExtra = {
  label: string;
  amountCents: number;
};

export type ParsedReceipt = {
  items: ParsedItem[];
  taxCents: number | null;
  tipCents: number | null;
  serviceCents: number | null;
  otherExtras: ParsedExtra[];
  subtotalCents: number | null;
  totalCents: number | null;
  currencySymbol: string | null;
};

type LineKind = "item" | "subtotal" | "tax" | "tip" | "service" | "total" | "other" | "skip";

const MONEY = /^(\()?(-)?([$€£¥])?(\d{1,6})[.,](\d{2})(\))?$/;

export function parseMoneyToken(token: string): { cents: number; symbol: string | null } | null {
  const trimmed = token.trim();
  if (!trimmed || trimmed.endsWith("%")) return null;
  const match = trimmed.match(MONEY);
  if (!match) return null;
  const open = Boolean(match[1]);
  const close = Boolean(match[6]);
  if (open !== close) return null;
  const dollars = Number(match[4]);
  const centsPart = Number(match[5]);
  if (!Number.isFinite(dollars) || !Number.isFinite(centsPart)) return null;
  let cents = dollars * 100 + centsPart;
  if (open || match[2]) cents = -cents;
  return { cents, symbol: match[3] ?? null };
}

function cleanName(value: string): string {
  return value
    .replace(/[@|•·*]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.:\-–—#]+|[\s.:\-–—#]+$/g, "")
    .trim();
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/\|/g, "l")
    .replace(/[^a-z% ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyLine(name: string): LineKind {
  const label = normalizeLabel(name);
  if (!label) return "skip";
  if (/^(sub ?total|subtotal|food total|item total)\b/.test(label)) return "subtotal";
  if (/^(tip|gratuity|gratuities)\b/.test(label)) return "tip";
  if (/^(service charge|service fee|svc charge|svc fee|svc|service)\b/.test(label)) return "service";
  if (
    /^([a-z]{1,12} )?(sales tax|state tax|city tax|local tax|food tax|alcohol tax|vat|gst|hst|iva|tax)\b/.test(
      label,
    ) &&
    label.length < 42 &&
    !/\b(pretax|pre tax|taxable|tax id)\b/.test(label)
  ) {
    return "tax";
  }
  if (/^(grand total|amount due|balance due|total due|amt due|total)\b/.test(label) || /^balance$/.test(label)) {
    return "total";
  }
  if (
    /^(discount|coupon|promo|bag fee|delivery fee|credit card fee)\b/.test(label) ||
    (/\b(fee|surcharge)\b/.test(label) && label.length < 42)
  ) {
    return "other";
  }
  if (isSlipMeta(label)) return "skip";
  return "item";
}

function isSlipMeta(label: string): boolean {
  if (!label) return true;
  if (
    /^(thank you|thanks|welcome|server|cashier|table|guest|order|phone|tel|date|time)$/.test(label) ||
    /^(thank you|thanks|welcome)\b/.test(label)
  ) {
    return true;
  }
  if (
    /\b(visa|mastercard|amex|american express|discover|debit card|credit card|auth|approval|approved|aid|tid|mid|chip|contactless|cardholder|signature|change due|cash tender|trace|reference)\b/.test(
      label,
    )
  ) {
    return true;
  }
  if (/\b(street|avenue|ave|road|blvd|boulevard|suite|floor|phone|www|http)\b/.test(label)) return true;
  if (/\b(diner|cafe|restaurant|bistro|eatery|taqueria|cantina)\b/.test(label) && label.split(" ").length <= 5) {
    return true;
  }
  return false;
}

function isModifier(text: string): boolean {
  return /^(no|add|extra|sub|without|with|hold|easy|side|w\/o|\*+|-+)\b/i.test(text.trim());
}

function groupLines(words: readonly OcrWord[]): OcrWord[][] {
  const sorted = [...words]
    .filter((word) => word.text.trim() && (word.confidence == null || word.confidence >= 0))
    .sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2 || a.x0 - b.x0);

  const lines: { words: OcrWord[]; cy: number; height: number }[] = [];
  for (const word of sorted) {
    const cy = (word.y0 + word.y1) / 2;
    const height = Math.max(8, word.y1 - word.y0);
    const last = lines[lines.length - 1];
    if (last && Math.abs(cy - last.cy) <= Math.max(last.height, height) * 0.6) {
      last.words.push(word);
      const count = last.words.length;
      last.cy = (last.cy * (count - 1) + cy) / count;
      last.height = Math.max(last.height, height);
    } else {
      lines.push({ words: [word], cy, height });
    }
  }

  return lines.map((line) => line.words.sort((a, b) => a.x0 - b.x0));
}

function lineText(words: readonly OcrWord[]): string {
  return words
    .map((word) => word.text.trim())
    .filter(Boolean)
    .join(" ");
}

function hasMoney(words: readonly OcrWord[]): boolean {
  return words.some((word) => parseMoneyToken(word.text.trim()) != null);
}

type PreparedLine = {
  kind: LineKind;
  name: string;
  quantity: number;
  cents: number;
  symbol: string | null;
};

function takeQuantity(tokens: string[]): { quantity: number; rest: string[] } {
  if (tokens.length === 0) return { quantity: 1, rest: tokens };
  const qtyLine = tokens.join(" ").match(/^(?:qty|quantity)\s*(\d{1,2})\b\s*(.*)$/i);
  if (qtyLine) {
    const quantity = Number(qtyLine[1]);
    const rest = qtyLine[2].split(/\s+/).filter(Boolean);
    if (quantity >= 1 && rest.length > 0) return { quantity, rest };
  }

  const first = tokens[0].toLowerCase().replace("×", "x");
  const explicit = first.match(/^(\d{1,2})x$/) ?? first.match(/^x(\d{1,2})$/);
  if (explicit && tokens.length > 1) {
    const quantity = Number(explicit[1]);
    if (quantity >= 1) return { quantity, rest: tokens.slice(1) };
  }
  if (/^\d{1,2}$/.test(tokens[0]) && tokens.length > 1 && /^[A-Za-z]/.test(tokens[1])) {
    const quantity = Number(tokens[0]);
    if (quantity >= 1) return { quantity, rest: tokens.slice(1) };
  }
  return { quantity: 1, rest: tokens };
}

function parseLine(words: readonly OcrWord[]): PreparedLine | null {
  const priced: { word: OcrWord; cents: number; symbol: string | null }[] = [];
  let stickySymbol: string | null = null;

  for (const word of words) {
    const text = word.text.trim();
    if (/^[$€£¥]$/.test(text)) {
      stickySymbol = text;
      continue;
    }
    const money = parseMoneyToken(text);
    if (!money) continue;
    const symbol = money.symbol ?? stickySymbol;
    if (money.symbol) stickySymbol = money.symbol;
    priced.push({ word, cents: money.cents, symbol });
  }

  if (priced.length === 0) return null;
  const chosen = priced[priced.length - 1];
  const consumed = new Set(priced.map((price) => price.word));
  const kept = words.filter((word) => {
    const text = word.text.trim();
    if (consumed.has(word)) return false;
    if (/^[$€£¥]$/.test(text)) return false;
    if (/%$/.test(text)) return false;
    return true;
  });

  let quantity = 1;
  let nameTokens = kept.map((word) => word.text.trim()).filter(Boolean);
  const atIndex = nameTokens.indexOf("@");
  if (atIndex > 0 && /^\d{1,2}$/.test(nameTokens[atIndex - 1] ?? "")) {
    quantity = Number(nameTokens[atIndex - 1]);
    nameTokens = nameTokens.filter((_, index) => index !== atIndex && index !== atIndex - 1);
  } else {
    const extracted = takeQuantity(nameTokens);
    quantity = extracted.quantity;
    nameTokens = extracted.rest;
  }

  const name = cleanName(nameTokens.join(" "));
  const kind = classifyLine(name);
  if ((kind === "item" || kind === "other") && !name) return null;
  if (kind === "skip") return null;

  let cents = chosen.cents;
  if (quantity > 1 && cents > 0) {
    const earlier = priced.length >= 2 ? priced[priced.length - 2].cents : null;
    if (earlier != null && earlier > 0 && earlier * quantity === cents) {
      cents = earlier;
    } else if (priced.length === 1 && cents % quantity === 0) {
      cents = cents / quantity;
    } else if (priced.length >= 2) {
      quantity = 1;
    }
  }
  if (kind === "other" && cents > 0 && /discount|coupon|promo/i.test(name)) cents = -cents;

  return { kind, name, quantity, cents, symbol: chosen.symbol };
}

function emptyReceipt(): ParsedReceipt {
  return {
    items: [],
    taxCents: null,
    tipCents: null,
    serviceCents: null,
    otherExtras: [],
    subtotalCents: null,
    totalCents: null,
    currencySymbol: null,
  };
}

export function parseReceipt(words: readonly OcrWord[]): ParsedReceipt {
  const parsed = emptyReceipt();
  const pending: OcrWord[] = [];

  const flushName = (extra: readonly OcrWord[]) => {
    const prepared = parseLine([...pending, ...extra]);
    pending.length = 0;
    if (!prepared) return;
    absorb(parsed, prepared);
  };

  for (const line of groupLines(words)) {
    if (!hasMoney(line)) {
      const text = lineText(line);
      const digits = text.replace(/\D/g, "").length;
      const letters = text.replace(/[^A-Za-z]/g, "").length;
      const phoneLike = digits >= 7 && letters < 3;
      if (!text || phoneLike || isSlipMeta(normalizeLabel(text)) || classifyLine(text) !== "item") {
        pending.length = 0;
        continue;
      }
      if (isModifier(text) && parsed.items.length > 0) {
        const last = parsed.items[parsed.items.length - 1];
        last.name = cleanName(`${last.name} ${text}`);
        continue;
      }
      pending.push(...line);
      continue;
    }
    flushName(line);
  }

  if (parsed.taxCents == null && parsed.subtotalCents != null && parsed.totalCents != null) {
    const known =
      (parsed.tipCents ?? 0) +
      (parsed.serviceCents ?? 0) +
      parsed.otherExtras.reduce((sum, extra) => sum + extra.amountCents, 0);
    const inferred = parsed.totalCents - parsed.subtotalCents - known;
    if (inferred > 0) parsed.taxCents = inferred;
  }

  return parsed;
}

function absorb(parsed: ParsedReceipt, prepared: PreparedLine) {
  if (prepared.symbol && !parsed.currencySymbol) parsed.currencySymbol = prepared.symbol;
  if (prepared.kind === "item") {
    parsed.items.push({
      name: prepared.name,
      quantity: prepared.quantity,
      priceCents: prepared.cents,
    });
    return;
  }
  if (prepared.kind === "subtotal") {
    parsed.subtotalCents = prepared.cents;
    return;
  }
  if (prepared.kind === "tax") {
    parsed.taxCents = (parsed.taxCents ?? 0) + prepared.cents;
    return;
  }
  if (prepared.kind === "tip") {
    parsed.tipCents = (parsed.tipCents ?? 0) + prepared.cents;
    return;
  }
  if (prepared.kind === "service") {
    parsed.serviceCents = (parsed.serviceCents ?? 0) + prepared.cents;
    return;
  }
  if (prepared.kind === "total") {
    parsed.totalCents = prepared.cents;
    return;
  }
  parsed.otherExtras.push({ label: prepared.name, amountCents: prepared.cents });
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const words: OcrWord[] = [];
  lines.forEach((line, row) => {
    const tokens = line.split(/\s+/);
    tokens.forEach((token, index) => {
      const money = parseMoneyToken(token);
      const x0 = money ? 720 : 20 + index * 36;
      words.push({
        text: token,
        x0,
        y0: row * 32,
        x1: x0 + Math.max(28, token.length * 8),
        y1: row * 32 + 18,
      });
    });
  });

  return parseReceipt(words);
}

function asCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function asName(value: unknown): string {
  return typeof value === "string" ? cleanName(value) : "";
}

/** Turn a vision model's JSON into a receipt, pulling tax and fees out of the item list. */
export function receiptFromVision(value: unknown): ParsedReceipt | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const parsed = emptyReceipt();
  if (typeof record.currencySymbol === "string" && record.currencySymbol.trim()) {
    parsed.currencySymbol = record.currencySymbol.trim().slice(0, 3);
  }

  const items = Array.isArray(record.items) ? record.items : [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const name = asName(item.name);
    const cents = asCents(item.priceCents);
    if (!name || cents == null) continue;
    const quantityRaw = asCents(item.quantity);
    const quantity = quantityRaw != null && quantityRaw >= 1 && quantityRaw <= 99 ? quantityRaw : 1;
    absorb(parsed, {
      kind: classifyLine(name),
      name,
      quantity,
      cents,
      symbol: parsed.currencySymbol,
    });
  }

  const tax = asCents(record.taxCents);
  const tip = asCents(record.tipCents);
  const service = asCents(record.serviceCents);
  const total = asCents(record.totalCents);
  if (tax != null && tax !== 0) parsed.taxCents = (parsed.taxCents ?? 0) + tax;
  if (tip != null && tip !== 0) parsed.tipCents = (parsed.tipCents ?? 0) + tip;
  if (service != null && service !== 0) parsed.serviceCents = (parsed.serviceCents ?? 0) + service;
  if (total != null) parsed.totalCents = total;

  const fees = Array.isArray(record.otherFees) ? record.otherFees : [];
  for (const entry of fees) {
    if (!entry || typeof entry !== "object") continue;
    const fee = entry as Record<string, unknown>;
    const label = asName(fee.label) || "Fee";
    const cents = asCents(fee.amountCents);
    if (cents == null || cents === 0) continue;
    absorb(parsed, { kind: classifyLine(label), name: label, quantity: 1, cents, symbol: null });
  }

  if (parsed.items.length === 0 && parsed.totalCents == null && parsed.taxCents == null) return null;
  return parsed;
}
