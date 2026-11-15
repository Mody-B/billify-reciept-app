import { newId } from "./id";
import type { Extra, Item } from "./types";

export type SampleBill = {
  items: Item[];
  taxCents: number;
  tipCents: number;
  serviceCents: number;
  otherExtras: Extra[];
  detectedTotalCents: number;
  currencySymbol: string;
};

export function createSampleBill(): SampleBill {
  return {
    currencySymbol: "$",
    taxCents: 204,
    tipCents: 500,
    serviceCents: 300,
    otherExtras: [],
    detectedTotalCents: 3479,
    items: [
      { id: newId(), name: "Burger", quantity: 1, priceCents: 1450, assignments: [], shareMode: "even" },
      { id: newId(), name: "Fries", quantity: 2, priceCents: 700, assignments: [], shareMode: "even" },
      { id: newId(), name: "Lemonade", quantity: 1, priceCents: 325, assignments: [], shareMode: "even" },
    ],
  };
}
