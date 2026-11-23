import { describe, expect, it } from "vitest";
import { canonicalAmount, normalizeDigits, normalizeIntegerTyping, toMinorUnits } from "./numerals";
import { foldPersonName } from "./names";

describe("Arabic numerals", () => {
  it("keeps ١٢٫٥٠ as 12.50 and does not concatenate it into 1250", () => {
    expect(normalizeDigits("١٢٫٥٠")).toBe("12٫50");
    expect(canonicalAmount("١٢٫٥٠")).toBe("12.50");
    expect(canonicalAmount("١٢٫٥٠")).not.toBe("1250");
    expect(toMinorUnits("١٢٫٥٠", 2)).toBe(1250);
    expect(toMinorUnits("1250", 2)).toBe(125000);
  });

  it("reads Eastern and Persian digits, the Arabic decimal, and thousands separators", () => {
    expect(canonicalAmount("۱۲٫۵۰")).toBe("12.50");
    expect(toMinorUnits("١٢٥٬٠٠٠", 0)).toBe(125000);
    expect(toMinorUnits("125,000", 0)).toBe(125000);
    expect(toMinorUnits("١٢٥،٠٠٠", 0)).toBe(125000);
    expect(toMinorUnits("١٢،٥٠", 2)).toBe(1250);
    expect(toMinorUnits("1.250", 3)).toBe(1250);
    expect(toMinorUnits("0.820", 3)).toBe(820);
    expect(toMinorUnits("125,000 ل.س", 0)).toBe(125000);
  });

  it("does not overflow a safe integer", () => {
    expect(toMinorUnits("9007199254740993", 0)).toBeNull();
  });

  it("normalizes a typed integer without eating a decimal or a minus", () => {
    expect(normalizeIntegerTyping("٣٫٥")).toBe("3.5");
    expect(normalizeIntegerTyping("-١")).toBe("-1");
    expect(normalizeIntegerTyping("١-٣")).toBe("1-3");
  });
});

describe("Arabic names", () => {
  it("folds hamza, ta marbuta, alef maqsura, and tashkeel", () => {
    expect(foldPersonName("أَحْمَد")).toBe(foldPersonName("احمد"));
    expect(foldPersonName("إيمان")).toBe(foldPersonName("ايمان"));
    expect(foldPersonName("آمنة")).toBe(foldPersonName("امنه"));
    expect(foldPersonName("فاطمة")).toBe(foldPersonName("فاطمه"));
    expect(foldPersonName("منى")).toBe(foldPersonName("مني"));
    expect(foldPersonName("Sam")).toBe(foldPersonName("sam"));
  });
});
