import { describe, expect, it } from "vitest";
import { emptyBill, shouldWarnOnLeave } from "./billSnapshot";
import { parseDraft } from "./draft";
import { decodeShare, encodeShare, whoPaysWhatText } from "./share";
import { DEFAULT_CURRENCY } from "./currency";

describe("share", () => {
  it("round-trips a bill so another browser can rebuild the same shares", () => {
    const bill = emptyBill(DEFAULT_CURRENCY);
    bill.step = "summary";
    bill.splitMode = "even";
    bill.evenCount = 2;
    bill.items = [
      { id: "pizza", name: "Pizza", quantity: 2, priceCents: 1800, assignments: [], shareMode: "even" },
      { id: "salad", name: "Salad", quantity: 1, priceCents: 1250, assignments: [], shareMode: "even" },
    ];
    const restored = decodeShare(encodeShare(bill));
    expect(restored?.items).toEqual(bill.items);
    expect(restored?.evenCount).toBe(2);
  });

  it("rejects a broken share token", () => {
    expect(decodeShare("not-json")).toBeNull();
    expect(parseDraft("{")).toBeNull();
  });

  it("writes who pays what", () => {
    const text = whoPaysWhatText({
      dateLabel: "23 NOV 2026",
      symbol: "$",
      lines: [
        { label: "1", cents: 2425 },
        { label: "2", cents: 2425 },
      ],
      totalCents: 4850,
    });
    expect(text).toContain("1  $24.25");
    expect(text).toContain("2  $24.25");
    expect(text).toContain("Total  $48.50");
  });
});

describe("leave warning", () => {
  it("asks only when the open bill is not the saved draft", () => {
    expect(shouldWarnOnLeave("{\"a\":1}", "{\"a\":1}", true)).toBe(false);
    expect(shouldWarnOnLeave("{\"a\":2}", "{\"a\":1}", true)).toBe(true);
    expect(shouldWarnOnLeave("{\"a\":2}", "{\"a\":1}", false)).toBe(false);
  });
});
