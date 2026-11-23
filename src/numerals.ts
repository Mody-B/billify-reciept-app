const EASTERN = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** Map Eastern Arabic and Persian digits to 0-9. Other characters stay. */
export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const eastern = EASTERN.indexOf(char);
    if (eastern >= 0) return String(eastern);
    return String(PERSIAN.indexOf(char));
  });
}

/**
 * Digits and separators for a whole-number field.
 * A decimal mark stays a decimal, so "٣٫٥" becomes "3.5" and cannot collapse to "35".
 */
export function normalizeIntegerTyping(incoming: string): string {
  let text = normalizeDigits(incoming).replace(/٬/g, "").replace(/٫/g, ".");
  text = text.replace(/،(\d{3})(?!\d)/g, "$1");
  text = text.replace(/،/g, ".");
  return text;
}

const CURRENCY_MARK =
  /ل\s*\.\s*س|ر\s*\.\s*س|د\s*\.\s*إ|د\s*\.\s*ك|د\s*\.\s*أ|ج\s*\.\s*م|ل\s*\.\s*ل|د\s*\.\s*ع|ر\s*\.\s*ق|[$€£¥]/g;

function stripMarks(value: string): string {
  return value.replace(CURRENCY_MARK, "");
}

/**
 * The amount as a plain decimal string, or null when it is not an amount.
 * "١٢٫٥٠" is "12.50", never "1250".
 */
export function canonicalAmount(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "0";
  let body = trimmed.replace(/^\((.*)\)$/, "$1");
  body = body.replace(/[−‐‒–—]/g, "-").replace(/-/g, "");
  body = normalizeDigits(stripMarks(body));
  const words = body.replace(/[\d\s.,٫٬،]/g, "");
  if (/[A-Za-z\u0600-\u06FF]/.test(words)) return null;
  body = body.replace(/\s/g, "");
  const arabicDecimal = body.includes("٫");
  body = body.replace(/٬/g, "").replace(/٫/g, ".").replace(/،/g, ",");
  if (!/^[\d.,]+$/.test(body)) return null;
  return resolveSeparators(body, arabicDecimal);
}

function resolveSeparators(body: string, arabicDecimal: boolean): string | null {
  const dotCount = body.split(".").length - 1;
  const commaCount = body.split(",").length - 1;
  if (arabicDecimal) {
    const stripped = body.replace(/,/g, "");
    return stripped.endsWith(".") ? stripped.slice(0, -1) || "0" : stripped;
  }
  if (dotCount > 0 && commaCount > 0) {
    const lastDot = body.lastIndexOf(".");
    const lastComma = body.lastIndexOf(",");
    const decimal = lastComma > lastDot ? body.replace(/\./g, "").replace(",", ".") : body.replace(/,/g, "");
    return decimal.endsWith(".") ? decimal.slice(0, -1) || "0" : decimal;
  }
  const resolved = commaCount > 0 ? groupOrDecimal(body.split(","), ",") : dotCount > 0 ? groupOrDecimal(body.split("."), ".") : body;
  if (resolved == null) return null;
  if (resolved.endsWith(".")) return resolved.slice(0, -1) || "0";
  return resolved;
}

function groupOrDecimal(parts: string[], separator: string): string | null {
  if (parts.some((part, index) => part === "" && index !== parts.length - 1)) return null;
  const last = parts[parts.length - 1];
  if (parts.length > 2) {
    if (parts.slice(1).every((part) => part.length === 3)) return parts.join("");
    return null;
  }
  if (separator === "," && last.length === 3) return parts.join("");
  if (separator === "." && last.length === 3 && parts[0].length > 3) return parts.join("");
  if (parts.length === 2) return `${parts[0] || "0"}.${last}`;
  return parts.join("");
}

/** Integer minor units. `fractionDigits` is 2 for cents, 3 for fils, 0 for a whole pound. */
export function toMinorUnits(raw: string, fractionDigits = 2): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const negative = /^\(.*\)$/.test(trimmed) || /^[−‐‒–—-]/.test(trimmed) || /[−‐‒–—-]$/.test(trimmed);
  const canonical = canonicalAmount(trimmed);
  if (canonical == null) return null;
  if (!/^\d+(\.\d+)?$/.test(canonical)) return null;
  const [whole, fraction = ""] = canonical.split(".");
  if (whole.length > 15) return null;
  const scale = 10n ** BigInt(fractionDigits);
  let minor = BigInt(whole) * scale;
  if (fractionDigits > 0) {
    const padded = (fraction + "0".repeat(fractionDigits)).slice(0, fractionDigits);
    if (padded) minor += BigInt(padded);
    const round = fraction.length > fractionDigits ? fraction[fractionDigits] : "0";
    if (round >= "5") minor += 1n;
  } else if (fraction[0] >= "5") {
    minor += 1n;
  }
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const value = Number(minor);
  return negative ? -value : value;
}
