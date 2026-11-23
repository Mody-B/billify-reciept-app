import { describe, expect, it } from "vitest";
import { integerDraftValue, reviseIntegerDraft } from "./fields";
import { lineTotalCents, liveMoneyCents } from "./money";

describe("quantity totals", () => {
  it("adds 2 pizzas at $18 and a $12.50 salad to $48.50", () => {
    const pizza = lineTotalCents(2, 1800);
    const salad = lineTotalCents(1, 1250);
    expect(pizza).toBe(3600);
    expect(pizza + salad).toBe(4850);
  });
});

describe("number drafts", () => {
  it("keeps 3.5 instead of folding it into 35", () => {
    expect(reviseIntegerDraft("", "3.5", 2)).toBe("3.5");
    expect(integerDraftValue("3.5", 1, 99)).toBeNull();
  });

  it("keeps -1 instead of turning it into 1", () => {
    expect(reviseIntegerDraft("2", "-1", 2)).toBe("-1");
    expect(integerDraftValue("-1", 1, 99)).toBeNull();
  });

  it("does not turn a custom weight of -3 into 13", () => {
    expect(reviseIntegerDraft("1", "-3", 3)).toBe("-3");
    expect(reviseIntegerDraft("1", "1-3", 3)).toBe("1");
    expect(integerDraftValue("-3", 1, 99)).toBeNull();
    expect(integerDraftValue("1-3", 1, 99)).toBeNull();
  });

  it("accepts a whole head count", () => {
    expect(integerDraftValue("4", 1, 99)).toBe(4);
  });
});

describe("live money", () => {
  it("reads a tip while it is being typed and rejects a minus without using its digits", () => {
    expect(liveMoneyCents("4.5")).toBe(450);
    expect(liveMoneyCents("4.")).toBe(400);
    expect(liveMoneyCents("-2")).toBeNull();
    expect(liveMoneyCents("(2.00)")).toBeNull();
  });
});
