import { describe, expect, it, vi } from "vitest";
import { emptyBill, serializeBill, shouldWarnOnLeave } from "./billSnapshot";
import { clearDraft, loadDraft, parseDraft, saveDraft } from "./draft";
import { lineTotalCents } from "./money";
import { DEFAULT_CURRENCY } from "./currency";

describe("draft regression", () => {
  it("restores a bill whose line totals use quantity", () => {
    const bill = emptyBill(DEFAULT_CURRENCY);
    bill.step = "review";
    bill.items = [
      { id: "pizza", name: "Pizza", quantity: 2, priceCents: 1800, assignments: [], shareMode: "even" },
      { id: "salad", name: "Salad", quantity: 1, priceCents: 1250, assignments: [], shareMode: "even" },
    ];
    const restored = parseDraft(serializeBill(bill));
    expect(restored?.items).toEqual(bill.items);
    const total = (restored?.items ?? []).reduce((sum, item) => sum + lineTotalCents(item.quantity, item.priceCents), 0);
    expect(total).toBe(4850);
  });

  it("saves in the browser and warns only while the live bill differs", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const bill = emptyBill(DEFAULT_CURRENCY);
    bill.items = [{ id: "pizza", name: "Pizza", quantity: 2, priceCents: 1800, assignments: [], shareMode: "even" }];
    saveDraft(bill);
    expect(loadDraft()?.items[0].quantity).toBe(2);
    const saved = serializeBill(bill);
    const dirty = serializeBill({ ...bill, tipCents: 125 });
    expect(shouldWarnOnLeave(saved, saved, true)).toBe(false);
    expect(shouldWarnOnLeave(dirty, saved, true)).toBe(true);
    clearDraft();
    expect(loadDraft()).toBeNull();
    vi.unstubAllGlobals();
  });
});
