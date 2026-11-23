import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";
import { currencyFromMark, currencySymbol, detectCurrency, fractionDigits, searchCurrencies } from "./currency";

describe("currencies", () => {
  it("labels dollars and euros in cents, and Syrian pounds as whole pounds", () => {
    expect(formatMoney(1250, currencySymbol("USD"))).toBe("$12.50");
    expect(formatMoney(1250, currencySymbol("EUR"))).toBe("€12.50");
    expect(formatMoney(125000, currencySymbol("SYP"), fractionDigits("SYP"))).toBe("ل.س125000");
    expect(formatMoney(1250, currencySymbol("JOD"), fractionDigits("JOD"))).toBe("د.أ1.250");
  });

  it("searches by name or code and does not invent a rate", () => {
    expect(searchCurrencies("syrian").map((currency) => currency.code)).toEqual(["SYP"]);
    expect(searchCurrencies("euro").map((currency) => currency.code)).toContain("EUR");
    expect(searchCurrencies("usd").map((currency) => currency.code)).toContain("USD");
    expect(currencyFromMark("€")).toBe("EUR");
    expect(currencyFromMark("$")).toBe("USD");
    expect(currencyFromMark("ل.س")).toBe("SYP");
    expect(currencyFromMark("ر.س")).toBe("SAR");
    expect(currencyFromMark("د.ك")).toBe("KWD");
    expect(currencyFromMark("not-a-currency")).toBe("USD");
    expect(detectCurrency("الإجمالي ٣١٬٠٠٠ ل.س")).toBe("SYP");
    expect(detectCurrency("VAT 5% 2.00 د.إ")).toBe("AED");
    expect(detectCurrency("دينار")).toBe("JOD");
    expect(fractionDigits("LBP")).toBe(0);
    expect(fractionDigits("KWD")).toBe(3);
    expect(fractionDigits("SAR")).toBe(2);
  });
});
