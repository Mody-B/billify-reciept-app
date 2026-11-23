export type OcrWord = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence?: number;
};

import { currencyFromMark, currencySymbol, detectCurrency, fractionDigits } from "../currency";
import { foldPersonName } from "../names";
import { normalizeDigits, toMinorUnits } from "../numerals";
import { keepPrintedNames } from "./printedNames";

export type ParsedItem = {
  name: string;
  quantity: number;
  /** Unit price in minor units. The line total is quantity × priceCents. */
  priceCents: number;
  /** Set when the printed line total does not equal quantity × unit price. */
  flagged?: boolean;
  /** The name is a literal reading the user should check. It was not replaced with another word. */
  nameUncertain?: boolean;
  lineTotalCents?: number;
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
  language?: "ar" | "en" | "mixed" | null;
};

type LineKind = "item" | "subtotal" | "tax" | "tip" | "service" | "total" | "other" | "skip";

export function parseMoneyToken(token: string, fractionDigits = 2): { cents: number; symbol: string | null } | null {
  const trimmed = token.trim();
  if (!trimmed || trimmed.endsWith("%") || trimmed.endsWith("٪")) return null;
  const symbol = trimmed.match(/[$€£¥]/)?.[0] ?? null;
  const cents = tokenMinor(trimmed, fractionDigits);
  if (cents == null) return null;
  return { cents, symbol };
}

function tokenMinor(token: string, fractionDigits: number): number | null {
  if (/%|٪/.test(token)) return null;
  const core = normalizeDigits(token.replace(/ل\s*\.\s*س|ر\s*\.\s*س|د\s*\.\s*إ|د\s*\.\s*ك|د\s*\.\s*أ|ج\s*\.\s*م|ل\s*\.\s*ل|د\s*\.\s*ع|ر\s*\.\s*ق|[$€£¥]/g, ""));
  const words = core.replace(/[\d\s.,٫٬،()\-−]/g, "");
  if (/[A-Za-z\u0600-\u06FF]/.test(words)) return null;
  if (!/\d/.test(core)) return null;
  const separated = /[.,٫٬،]/.test(core);
  const digits = normalizeDigits(core).replace(/\D/g, "");
  if (!separated && digits.length <= 2) return null;
  return toMinorUnits(token, fractionDigits);
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

function classifyArabicLabel(name: string): LineKind | null {
  if (!/[\u0600-\u06FF]/.test(name) && !/\bvat\b/i.test(name)) return null;
  const folded = foldPersonName(name);
  if (/^(الكميه|السعر|العدد)$/.test(folded)) return "skip";
  if (/المجموع الكلي|الاجمالي|الصافي|المطلوب/.test(folded)) return "total";
  if (/ضريب|القيمه المضافه|\bvat\b/.test(folded)) return "tax";
  if (/اكرامي/.test(folded)) return "tip";
  if (/توصيل/.test(folded)) return "other";
  if (/خدم/.test(folded)) return "service";
  if (/خصم/.test(folded)) return "other";
  if (/المجموع/.test(folded)) return "subtotal";
  return null;
}

export function classifyLine(name: string): LineKind {
  const arabic = classifyArabicLabel(name);
  if (arabic) return arabic;
  const label = normalizeLabel(name);
  if (!label) return /[\u0600-\u06FF]/.test(name) ? "item" : "skip";
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
  flagged?: boolean;
  nameUncertain?: boolean;
  lineCents?: number;
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
  let flagged = false;
  let lineCents: number | undefined;
  if (quantity > 1 && cents > 0) {
    const earlier = priced.length >= 2 ? priced[priced.length - 2].cents : null;
    if (earlier != null && earlier > 0 && earlier * quantity === cents) {
      cents = earlier;
    } else if (priced.length === 1 && cents % quantity === 0) {
      cents = cents / quantity;
    } else if (earlier != null && earlier > 0) {
      flagged = true;
      lineCents = chosen.cents;
      cents = earlier;
    } else {
      flagged = true;
      lineCents = cents;
    }
  }
  if (kind === "other" && cents > 0 && isDiscount(name)) cents = -cents;

  return { kind, name, quantity, cents, symbol: chosen.symbol, flagged, lineCents };
}

function isDiscount(name: string): boolean {
  return /discount|coupon|promo|خصم/i.test(foldPersonName(name));
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

  inferTax(parsed);
  return parsed;
}

function absorb(parsed: ParsedReceipt, prepared: PreparedLine) {
  if (prepared.symbol && !parsed.currencySymbol) parsed.currencySymbol = prepared.symbol;
  if (prepared.kind === "item") {
    parsed.items.push({
      name: prepared.name,
      quantity: prepared.quantity,
      priceCents: prepared.cents,
      ...(prepared.nameUncertain ? { nameUncertain: true as const } : {}),
      ...(prepared.flagged
        ? { flagged: true as const, ...(prepared.lineCents != null ? { lineTotalCents: prepared.lineCents } : {}) }
        : {}),
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

function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF٠-٩۰-۹]/.test(text);
}

function detectLanguage(text: string): "ar" | "en" | "mixed" {
  const arabic = /[\u0600-\u06FF]/.test(text);
  const latin = /[A-Za-z]/.test(text);
  if (arabic && latin) return "mixed";
  if (arabic) return "ar";
  return "en";
}

function quantityToken(token: string): number | null {
  const normalized = normalizeDigits(token).replace(/[×x]/gi, "");
  if (!/^\d{1,2}$/.test(normalized)) return null;
  const value = Number(normalized);
  if (value < 1 || value > 99) return null;
  return value;
}

function parseFlexibleLine(line: string, fractionDigits: number): PreparedLine | null {
  const amounts: number[] = [];
  const nameTokens: string[] = [];
  let quantity: number | null = null;
  for (const token of line.split(/\s+/).filter(Boolean)) {
    const amount = tokenMinor(token, fractionDigits);
    if (amount != null) {
      amounts.push(amount);
      continue;
    }
    const qty = quantityToken(token);
    if (qty != null && quantity == null) {
      quantity = qty;
      continue;
    }
    if (/^(ل\.س|ر\.س|د\.إ|د\.ك|د\.أ|ج\.م|ل\.ل|د\.ع|ر\.ق|[$€£¥])$/.test(token)) continue;
    nameTokens.push(token);
  }
  if (amounts.length === 0) return null;
  const name = cleanName(nameTokens.join(" "));
  const kind = classifyLine(name);
  if (kind === "skip") return null;
  if ((kind === "item" || kind === "other") && !name) return null;

  const count = kind === "item" ? (quantity ?? 1) : 1;
  let unit = amounts[0];
  let lineTotal = amounts[amounts.length - 1];
  let flagged = false;
  if (kind === "item" && amounts.length >= 2) {
    if (unit * count !== lineTotal && lineTotal * count === unit) {
      const swap = unit;
      unit = lineTotal;
      lineTotal = swap;
    } else if (unit * count !== lineTotal) {
      flagged = true;
    }
  } else if (kind === "item" && count > 1 && amounts.length === 1 && unit % count === 0) {
    lineTotal = unit;
    unit = unit / count;
  } else if (kind === "item" && count > 1 && amounts.length === 1) {
    flagged = true;
    lineTotal = unit;
  } else {
    unit = lineTotal;
  }

  let cents = kind === "item" ? unit : lineTotal;
  if (kind === "other" && cents > 0 && isDiscount(name)) cents = -cents;
  return {
    kind,
    name: name || (kind === "tax" ? "Tax" : kind),
    quantity: count,
    cents,
    symbol: null,
    flagged,
    lineCents: flagged ? lineTotal : undefined,
  };
}

function inferTax(parsed: ParsedReceipt) {
  if (parsed.taxCents == null && parsed.subtotalCents != null && parsed.totalCents != null) {
    const known =
      (parsed.tipCents ?? 0) +
      (parsed.serviceCents ?? 0) +
      parsed.otherExtras.reduce((sum, extra) => sum + extra.amountCents, 0);
    const inferred = parsed.totalCents - parsed.subtotalCents - known;
    if (inferred > 0) parsed.taxCents = inferred;
  }
}

function parseArabicReceipt(text: string): ParsedReceipt {
  const code = detectCurrency(text);
  const digits = fractionDigits(code ?? "USD");
  const parsed = emptyReceipt();
  parsed.currencySymbol = code ? currencySymbol(code) : null;
  parsed.language = detectLanguage(text);
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const prepared = parseFlexibleLine(trimmed, digits);
    if (prepared) absorb(parsed, prepared);
  }
  inferTax(parsed);
  return parsed;
}

export function parseReceiptText(text: string): ParsedReceipt {
  if (hasArabicScript(text)) return parseArabicReceipt(text);
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

function minorValue(value: unknown, fractionDigits: number): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) return Math.trunc(value);
    return toMinorUnits(String(value), fractionDigits);
  }
  if (typeof value === "string" && value.trim()) return toMinorUnits(value, fractionDigits);
  return null;
}

function asName(value: unknown): string {
  return typeof value === "string" ? cleanName(value) : "";
}

/** Turn a vision model's JSON into a receipt, pulling tax and fees out of the item list. */
export function receiptFromVision(value: unknown): ParsedReceipt | null {
  if (!value || typeof value !== "object") return null;
  const record = keepPrintedNames(value as Record<string, unknown>);
  const parsed = emptyReceipt();
  const codeField = typeof record.currency === "string" ? record.currency.trim().toUpperCase() : "";
  const symbolField = typeof record.currencySymbol === "string" ? record.currencySymbol.trim() : "";
  const code = codeField || (symbolField ? currencyFromMark(symbolField) : "");
  const digits = fractionDigits(code || "USD");
  if (code) parsed.currencySymbol = currencySymbol(code);
  else if (symbolField) parsed.currencySymbol = symbolField.slice(0, 12);
  if (record.language === "ar" || record.language === "en" || record.language === "mixed") parsed.language = record.language;

  const items = Array.isArray(record.items) ? record.items : [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const name = asName(item.name);
    if (!name) continue;
    const quantityRaw = minorValue(item.quantity, 0);
    const quantity = quantityRaw != null && quantityRaw >= 1 && quantityRaw <= 99 ? quantityRaw : 1;
    const unit = minorValue(item.unitPriceMinor ?? item.unitPriceCents ?? item.priceCents, digits);
    const lineTotal = minorValue(item.lineTotalMinor ?? item.lineTotalCents ?? item.lineTotal, digits);
    let cents = unit;
    const nameUncertain = item.nameUncertain === true;
    let flagged = item.flagged === true && !nameUncertain;
    if (cents == null && lineTotal != null) {
      if (quantity > 1 && lineTotal % quantity === 0) cents = lineTotal / quantity;
      else {
        cents = lineTotal;
        if (quantity > 1) flagged = true;
      }
    }
    if (cents == null) continue;
    if (lineTotal != null && quantity * cents !== lineTotal) flagged = true;
    absorb(parsed, {
      kind: classifyLine(name),
      name,
      quantity,
      cents,
      symbol: parsed.currencySymbol,
      flagged,
      nameUncertain,
      lineCents: lineTotal ?? undefined,
    });
  }

  const tax = minorValue(record.taxMinor ?? record.taxCents, digits);
  const tip = minorValue(record.tipMinor ?? record.tipCents, digits);
  const service = minorValue(record.serviceMinor ?? record.serviceCents, digits);
  const total = minorValue(record.totalMinor ?? record.totalCents, digits);
  const subtotal = minorValue(record.subtotalMinor ?? record.subtotalCents, digits);
  if (tax != null && tax !== 0) parsed.taxCents = (parsed.taxCents ?? 0) + tax;
  if (tip != null && tip !== 0) parsed.tipCents = (parsed.tipCents ?? 0) + tip;
  if (service != null && service !== 0) parsed.serviceCents = (parsed.serviceCents ?? 0) + service;
  if (total != null) parsed.totalCents = total;
  if (subtotal != null && parsed.subtotalCents == null) parsed.subtotalCents = subtotal;

  const discount = minorValue(record.discountMinor ?? record.discountCents, digits);
  if (discount != null && discount !== 0) {
    const amount = discount > 0 ? -discount : discount;
    absorb(parsed, { kind: "other", name: "Discount", quantity: 1, cents: amount, symbol: null });
  }

  const fees = Array.isArray(record.otherFees) ? record.otherFees : [];
  for (const entry of fees) {
    if (!entry || typeof entry !== "object") continue;
    const fee = entry as Record<string, unknown>;
    const label = asName(fee.label) || "Fee";
    const cents = minorValue(fee.amountMinor ?? fee.amountCents, digits);
    if (cents == null || cents === 0) continue;
    absorb(parsed, { kind: classifyLine(label), name: label, quantity: 1, cents, symbol: null });
  }

  if (parsed.items.length === 0 && parsed.totalCents == null && parsed.taxCents == null) return null;
  return parsed;
}
