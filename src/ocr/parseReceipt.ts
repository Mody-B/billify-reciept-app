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

const MONEY =
  /^(\()?(-)?([$€£¥])?(\d{1,6})[.,](\d{2})(\))?$/;

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
    .replace(/[@|•·]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.:\-–—]+|[\s.:\-–—]+$/g, "")
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
  if (/^(sub ?total|subtotal)\b/.test(label)) return "subtotal";
  if (/^(tip|gratuity|gratuities)\b/.test(label)) return "tip";
  if (/^(service charge|service fee|svc charge|svc fee|svc|service)\b/.test(label)) return "service";
  if (/^(sales tax|vat|gst|hst|tax|iva)\b/.test(label)) return "tax";
  if (/^(grand total|amount due|balance due|total due|amt due|total)\b/.test(label)) return "total";
  if (/^balance$/.test(label)) return "total";
  if (
    /^(discount|coupon|promo|bag fee|delivery fee|credit card fee)\b/.test(label) ||
    /\bfee$/.test(label)
  ) {
    return "other";
  }
  if (
    /^(thank you|thanks|welcome|visa|mastercard|amex|discover|debit|credit|cash|change|payment|server|cashier|table|guest)$/.test(
      label,
    )
  ) {
    return "skip";
  }
  return "item";
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

type PreparedLine = {
  kind: LineKind;
  name: string;
  quantity: number;
  cents: number;
  symbol: string | null;
};

function leadingQuantity(words: readonly OcrWord[]): { quantity: number; rest: OcrWord[] } {
  if (words.length < 2) return { quantity: 1, rest: [...words] };
  const first = words[0].text.trim().toLowerCase().replace("×", "x");
  const explicit = first.match(/^(\d{1,2})x$/) ?? first.match(/^x(\d{1,2})$/);
  if (explicit) {
    const quantity = Number(explicit[1]);
    if (quantity >= 1) return { quantity, rest: words.slice(1) };
  }

  if (/^\d{1,2}$/.test(words[0].text.trim()) && /^[A-Za-z]/.test(words[1].text.trim())) {
    const quantity = Number(words[0].text.trim());
    if (quantity >= 1) return { quantity, rest: words.slice(1) };
  }

  return { quantity: 1, rest: [...words] };
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
  const kept = words.filter((word) => !consumed.has(word) && !/^[$€£¥]$/.test(word.text.trim()));

  let quantity = 1;
  let nameWords = kept;
  const atIndex = kept.findIndex((word) => word.text.trim() === "@");
  if (atIndex > 0 && /^\d{1,2}$/.test(kept[atIndex - 1].text.trim())) {
    quantity = Number(kept[atIndex - 1].text.trim());
    nameWords = kept.filter((_, index) => index !== atIndex && index !== atIndex - 1);
  } else {
    const extracted = leadingQuantity(kept);
    quantity = extracted.quantity;
    nameWords = extracted.rest;
  }

  const name = cleanName(nameWords.map((word) => word.text).join(" "));
  const kind = classifyLine(name);
  if ((kind === "item" || kind === "other") && !name) return null;
  if (kind === "skip") return null;

  let cents = chosen.cents;
  if (kind === "other" && cents > 0 && /discount|coupon|promo/i.test(name)) cents = -cents;

  return { kind, name, quantity, cents, symbol: chosen.symbol };
}

export function parseReceipt(words: readonly OcrWord[]): ParsedReceipt {
  const parsed: ParsedReceipt = {
    items: [],
    taxCents: null,
    tipCents: null,
    serviceCents: null,
    otherExtras: [],
    subtotalCents: null,
    totalCents: null,
    currencySymbol: null,
  };

  for (const line of groupLines(words)) {
    const prepared = parseLine(line);
    if (!prepared) continue;
    if (prepared.symbol && !parsed.currencySymbol) parsed.currencySymbol = prepared.symbol;

    if (prepared.kind === "item") {
      parsed.items.push({
        name: prepared.name,
        quantity: prepared.quantity,
        priceCents: prepared.cents,
      });
      continue;
    }
    if (prepared.kind === "subtotal") {
      parsed.subtotalCents = prepared.cents;
      continue;
    }
    if (prepared.kind === "tax") {
      parsed.taxCents = (parsed.taxCents ?? 0) + prepared.cents;
      continue;
    }
    if (prepared.kind === "tip") {
      parsed.tipCents = (parsed.tipCents ?? 0) + prepared.cents;
      continue;
    }
    if (prepared.kind === "service") {
      parsed.serviceCents = (parsed.serviceCents ?? 0) + prepared.cents;
      continue;
    }
    if (prepared.kind === "total") {
      parsed.totalCents = prepared.cents;
      continue;
    }
    parsed.otherExtras.push({ label: prepared.name, amountCents: prepared.cents });
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
