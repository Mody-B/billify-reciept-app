const EASTERN = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(value) {
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const eastern = EASTERN.indexOf(char);
    if (eastern >= 0) return String(eastern);
    const persian = PERSIAN.indexOf(char);
    return persian >= 0 ? String(persian) : char;
  });
}

function amountMinor(token) {
  const raw = token.trim();
  if (!raw || /%|٪/.test(raw)) return null;
  let body = normalizeDigits(raw).replace(/[$€£¥]/g, "");
  if (/[A-Za-z\u0600-\u06FF]/.test(body.replace(/[\d\s.,٫٬،()\-−]/g, ""))) return null;
  const negative = /^\(.*\)$/.test(body) || body.includes("-");
  body = body.replace(/[()]/g, "").replace(/-/g, "").replace(/\s/g, "");
  body = body.replace(/٬/g, "").replace(/٫/g, ".").replace(/،/g, ".");
  if (/^\d{1,3}(,\d{3})+$/.test(body)) body = body.replace(/,/g, "");
  else if (body.includes(",") && !body.includes(".")) {
    const parts = body.split(",");
    if (parts[parts.length - 1].length === 3) body = parts.join("");
    else body = `${parts.slice(0, -1).join("")}.${parts[parts.length - 1]}`;
  } else body = body.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(body)) return null;
  const [whole, fraction = ""] = body.split(".");
  const places = fraction.length === 3 ? 3 : fraction.length === 0 ? 0 : 2;
  let minor = Number(whole) * 10 ** places;
  if (places > 0) minor += Number((fraction + "0".repeat(places)).slice(0, places));
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

function isTotalLabel(name) {
  const folded = name.trim().toLowerCase();
  if (/^(sub ?total|total|tax|vat|gst|cash|item|grand total|amount due|balance due|tip|gratuity|service|thank)/.test(folded)) {
    return true;
  }
  return /مجموع|اجمالي|إجمالي|صافي|مطلوب|ضريب|خدم|اكرامي|إكرامي|توصيل|خصم/.test(name);
}

export function printedItems(source) {
  const found = [];
  for (const line of String(source).split(/\r?\n/)) {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    const amounts = [];
    const nameTokens = [];
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

function sourceOf(body) {
  if (typeof body.transcript === "string" && body.transcript.trim()) return body.transcript;
  if (Array.isArray(body.lines)) return body.lines.filter((line) => typeof line === "string").join("\n");
  return "";
}

function itemMinor(item) {
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
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
export function keepPrintedNames(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.items)) return body;
  const source = sourceOf(body);
  const printed = source ? printedItems(source) : [];
  const used = new Set();
  const items = [];
  for (const item of body.items) {
    if (!item || typeof item !== "object") continue;
    const current = typeof item.name === "string" ? item.name.trim() : "";
    const explicit = typeof item.printed === "string" ? item.printed.trim() : "";
    const price = itemMinor(item);
    let match = null;
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
