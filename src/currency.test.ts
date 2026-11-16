import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";
import { currencyFromMark, currencySymbol, searchCurrencies } from "./currency";

describe("currencies", () => {
  it("labels the same cents in dollars, euros, and Syrian pounds", () => {
    expect(formatMoney(1250, currencySymbol("USD"))).toBe("$12.50");
    expect(formatMoney(1250, currencySymbol("EUR"))).toBe("€12.50");
    expect(formatMoney(1250, currencySymbol("SYP"))).toBe("LS12.50");
  });

  it("searches by name or code and does not invent a rate", () => {
    expect(searchCurrencies("syrian").map((currency) => currency.code)).toEqual(["SYP"]);
    expect(searchCurrencies("euro").map((currency) => currency.code)).toContain("EUR");
    expect(searchCurrencies("usd").map((currency) => currency.code)).toContain("USD");
    expect(currencyFromMark("€")).toBe("EUR");
    expect(currencyFromMark("$")).toBe("USD");
    expect(currencyFromMark("not-a-currency")).toBe("USD");
  });
});
