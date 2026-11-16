import { describe, expect, it } from "vitest";
import { allocateCents, splitBill, splitEvenly, type SplitInput } from "./splitBill";

const alex = { id: "alex", name: "Alex" };
const sam = { id: "sam", name: "Sam" };
const rae = { id: "rae", name: "Rae" };

function bill(overrides: Partial<SplitInput> & Pick<SplitInput, "items">): SplitInput {
  return {
    people: overrides.people ?? [alex, sam, rae],
    items: overrides.items,
    extras: overrides.extras ?? [],
  };
}

describe("allocateCents", () => {
  it("gives leftover cents to the earliest tied remainder", () => {
    expect(allocateCents(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("follows custom weights exactly when they divide", () => {
    expect(allocateCents(100, [1, 3])).toEqual([25, 75]);
  });

  it("keeps a negative total summing to the original", () => {
    expect(allocateCents(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
  });

  it("ignores non-positive weights", () => {
    expect(allocateCents(80, [0, 1, -2])).toEqual([0, 80, 0]);
  });
});

describe("splitEvenly", () => {
  it("divides the whole bill, including tax and extras, into exact cent shares", () => {
    const billCents = 1000 + 50 + 1;
    const shares = splitEvenly(billCents, 3);
    expect(shares).toEqual([351, 350, 350]);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(billCents);
  });

  it("gives an even bill identical shares", () => {
    expect(splitEvenly(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it("returns nothing for an empty count", () => {
    expect(splitEvenly(500, 0)).toEqual([]);
  });
});

describe("splitBill", () => {
  it("splits a shared item evenly and divides tax and extras by pre-tax share", () => {
    const result = splitBill(
      bill({
        people: [alex, sam],
        items: [
          {
            id: "pizza",
            name: "Pizza",
            priceCents: 1000,
            assignments: [
              { personId: "alex", weight: 1 },
              { personId: "sam", weight: 1 },
            ],
          },
          {
            id: "salad",
            name: "Salad",
            priceCents: 500,
            assignments: [{ personId: "alex", weight: 1 }],
          },
        ],
        extras: [
          { id: "tax", label: "Tax", amountCents: 100 },
          { id: "tip", label: "Tip", amountCents: 200 },
        ],
      }),
    );

    const alexRow = result.people[0];
    const samRow = result.people[1];
    expect(alexRow.preTaxCents).toBe(1000);
    expect(samRow.preTaxCents).toBe(500);
    expect(alexRow.items.map((item) => item.amountCents)).toEqual([500, 500]);
    expect(samRow.items.map((item) => item.amountCents)).toEqual([500]);

    // 1000/1500 and 500/1500 of each extra, largest remainder.
    expect(alexRow.extras).toEqual([
      { extraId: "tax", label: "Tax", amountCents: 67 },
      { extraId: "tip", label: "Tip", amountCents: 133 },
    ]);
    expect(samRow.extras).toEqual([
      { extraId: "tax", label: "Tax", amountCents: 33 },
      { extraId: "tip", label: "Tip", amountCents: 67 },
    ]);
    expect(alexRow.totalCents).toBe(1200);
    expect(samRow.totalCents).toBe(600);
    expect(result.peopleTotalCents).toBe(result.billTotalCents);
    expect(result.billTotalCents).toBe(1800);
  });

  it("uses custom shares and still lands on the exact bill total", () => {
    const result = splitBill(
      bill({
        people: [alex, sam],
        items: [
          {
            id: "steak",
            name: "Steak",
            priceCents: 300,
            assignments: [
              { personId: "alex", weight: 2 },
              { personId: "sam", weight: 1 },
            ],
          },
        ],
        extras: [{ id: "tax", label: "Tax", amountCents: 100 }],
      }),
    );

    expect(result.people[0].items[0].amountCents).toBe(200);
    expect(result.people[1].items[0].amountCents).toBe(100);
    expect(result.people[0].extras[0].amountCents).toBe(67);
    expect(result.people[1].extras[0].amountCents).toBe(33);
    expect(result.people[0].totalCents + result.people[1].totalCents).toBe(400);
    expect(result.billTotalCents).toBe(400);
  });

  it("rounds an awkward three-way bill so person totals equal the receipt", () => {
    const result = splitBill(
      bill({
        items: [
          {
            id: "mains",
            name: "Mains",
            priceCents: 1000,
            assignments: [
              { personId: "alex", weight: 1 },
              { personId: "sam", weight: 1 },
              { personId: "rae", weight: 1 },
            ],
          },
          {
            id: "dessert",
            name: "Dessert",
            priceCents: 200,
            assignments: [
              { personId: "alex", weight: 1 },
              { personId: "sam", weight: 1 },
            ],
          },
        ],
        extras: [
          { id: "tax", label: "Tax", amountCents: 100 },
          { id: "tip", label: "Tip", amountCents: 250 },
        ],
      }),
    );

    expect(result.people.map((person) => person.preTaxCents)).toEqual([434, 433, 333]);
    expect(result.people.map((person) => person.extras.map((extra) => extra.amountCents))).toEqual([
      [36, 91],
      [36, 90],
      [28, 69],
    ]);
    expect(result.people.map((person) => person.totalCents)).toEqual([561, 559, 430]);
    expect(result.peopleTotalCents).toBe(1550);
    expect(result.billTotalCents).toBe(1550);
  });

  it("keeps unassigned items out of the split and still reconciles to the bill", () => {
    const result = splitBill(
      bill({
        people: [alex, sam],
        items: [
          {
            id: "soup",
            name: "Soup",
            priceCents: 500,
            assignments: [{ personId: "alex", weight: 1 }],
          },
          { id: "cake", name: "Cake", priceCents: 500, assignments: [] },
        ],
        extras: [{ id: "tax", label: "Tax", amountCents: 100 }],
      }),
    );

    expect(result.people[0].totalCents).toBe(600);
    expect(result.people[1].totalCents).toBe(0);
    expect(result.unassignedItemsCents).toBe(500);
    expect(result.unallocatedExtrasCents).toBe(0);
    expect(result.peopleTotalCents + result.unassignedItemsCents + result.unallocatedExtrasCents).toBe(
      result.billTotalCents,
    );
  });

  it("holds extras aside until someone is assigned an item", () => {
    const result = splitBill(
      bill({
        people: [alex],
        items: [{ id: "tea", name: "Tea", priceCents: 500, assignments: [] }],
        extras: [
          { id: "tax", label: "Tax", amountCents: 40 },
          { id: "service", label: "Service charge", amountCents: 60 },
        ],
      }),
    );

    expect(result.peopleTotalCents).toBe(0);
    expect(result.unassignedItemsCents).toBe(500);
    expect(result.unallocatedExtras.map((extra) => extra.amountCents)).toEqual([40, 60]);
    expect(result.peopleTotalCents + result.unassignedItemsCents + result.unallocatedExtrasCents).toBe(
      600,
    );
  });

  it("splits a negative extra in proportion to pre-tax share", () => {
    const result = splitBill(
      bill({
        people: [alex, sam],
        items: [
          {
            id: "lunch",
            name: "Lunch",
            priceCents: 1000,
            assignments: [
              { personId: "alex", weight: 1 },
              { personId: "sam", weight: 1 },
            ],
          },
        ],
        extras: [{ id: "coupon", label: "Coupon", amountCents: -101 }],
      }),
    );

    expect(result.people.map((person) => person.totalCents)).toEqual([449, 450]);
    expect(result.peopleTotalCents).toBe(899);
    expect(result.billTotalCents).toBe(899);
  });

  it("accepts fractional weights by scaling them before rounding", () => {
    const result = splitBill(
      bill({
        people: [alex, sam],
        items: [
          {
            id: "nachos",
            name: "Nachos",
            priceCents: 400,
            assignments: [
              { personId: "alex", weight: 1.5 },
              { personId: "sam", weight: 0.5 },
            ],
          },
        ],
        extras: [{ id: "tax", label: "Tax", amountCents: 10 }],
      }),
    );

    expect(result.people.map((person) => person.preTaxCents)).toEqual([300, 100]);
    expect(result.peopleTotalCents).toBe(result.billTotalCents);
  });

  it("reconciles random fully assigned bills to the exact total", () => {
    let seed = 42;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };

    for (let trial = 0; trial < 40; trial += 1) {
      const people = [alex, sam, rae].slice(0, 2 + Math.floor(next() * 2));
      const items = Array.from({ length: 1 + Math.floor(next() * 5) }, (_, index) => {
        const priceCents = Math.floor(next() * 4000) - (next() > 0.9 ? 200 : 0);
        const shuffled = [...people].sort(() => next() - 0.5);
        const count = 1 + Math.floor(next() * shuffled.length);
        return {
          id: `item-${trial}-${index}`,
          name: `Item ${index}`,
          priceCents,
          assignments: shuffled.slice(0, count).map((person) => ({
            personId: person.id,
            weight: 1 + Math.floor(next() * 4),
          })),
        };
      });
      const extras = [
        { id: "tax", label: "Tax", amountCents: Math.floor(next() * 300) },
        { id: "tip", label: "Tip", amountCents: Math.floor(next() * 500) },
        { id: "service", label: "Service charge", amountCents: Math.floor(next() * 200) },
      ];
      const result = splitBill({ people, items, extras });
      expect(result.unassignedItemsCents).toBe(0);
      expect(result.unallocatedExtrasCents).toBe(0);
      expect(result.peopleTotalCents).toBe(result.billTotalCents);
      for (const person of result.people) {
        const fromParts =
          person.items.reduce((sum, item) => sum + item.amountCents, 0) +
          person.extras.reduce((sum, extra) => sum + extra.amountCents, 0);
        expect(person.totalCents).toBe(fromParts);
      }
    }
  });
});
