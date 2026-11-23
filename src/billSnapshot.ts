import type { Extra, Item, Person, StepId } from "./types";

export type BillSnapshot = {
  step: StepId;
  currency: string;
  items: Item[];
  taxCents: number;
  tipCents: number;
  serviceCents: number;
  otherExtras: Extra[];
  detectedTotalCents: number | null;
  people: Person[];
  evenCount: number | null;
  splitMode: "even" | "items" | null;
  selectedItemId: string | null;
};

export function emptyBill(currency: string): BillSnapshot {
  return {
    step: "capture",
    currency,
    items: [],
    taxCents: 0,
    tipCents: 0,
    serviceCents: 0,
    otherExtras: [],
    detectedTotalCents: null,
    people: [],
    evenCount: null,
    splitMode: null,
    selectedItemId: null,
  };
}

export function billHasWork(bill: BillSnapshot): boolean {
  if (bill.people.length > 0 || bill.evenCount != null) return true;
  if (bill.taxCents !== 0 || bill.tipCents !== 0 || bill.serviceCents !== 0) return true;
  if (bill.otherExtras.some((extra) => extra.label.trim() || extra.amountCents !== 0)) return true;
  return bill.items.some((item) => item.name.trim() || item.priceCents !== 0 || item.quantity > 1);
}

export function serializeBill(bill: BillSnapshot): string {
  return JSON.stringify(bill);
}

export function shouldWarnOnLeave(current: string, saved: string, hasWork: boolean): boolean {
  return hasWork && current !== saved;
}
