import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyInput, shareLabel } from "./money";

describe("money", () => {
  it("formats signed cents with the chosen symbol", () => {
    expect(formatMoney(1299, "$")).toBe("$12.99");
    expect(formatMoney(-50, "€")).toBe("-€0.50");
  });

  it("parses decimals, comma decimals, and parentheses", () => {
    expect(parseMoneyInput("12.5")).toBe(1250);
    expect(parseMoneyInput("1.234,50")).toBe(123450);
    expect(parseMoneyInput("(2.00)")).toBe(-200);
    expect(parseMoneyInput("")).toBe(0);
  });

  it("reduces share weights to a fraction", () => {
    expect(shareLabel(2, 4)).toBe("1/2");
    expect(shareLabel(1, 1)).toBeNull();
  });
});
