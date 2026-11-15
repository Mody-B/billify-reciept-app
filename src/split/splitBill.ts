/**
 * Split a bill in integer cents.
 *
 * Each shared item is apportioned with the largest-remainder method (Hamilton).
 * Tax and every extra are then apportioned the same way, using each person's
 * already-rounded pre-tax cents as the weight. Every allocation sums to its
 * source amount, so when every item is assigned:
 *
 *   sum(person totals) === items + tax + extras
 *
 * Unassigned item cents, and extras that have nobody to charge, stay in their
 * own buckets. Those buckets plus the person totals still equal the bill.
 */

export type SplitPerson = {
  id: string;
  name: string;
};

export type SplitAssignment = {
  personId: string;
  /** Positive share weight. Equal split uses 1 for each person. */
  weight: number;
};

export type SplitItem = {
  id: string;
  name: string;
  priceCents: number;
  assignments: readonly SplitAssignment[];
};

export type SplitExtra = {
  id: string;
  label: string;
  amountCents: number;
};

export type SplitInput = {
  people: readonly SplitPerson[];
  items: readonly SplitItem[];
  extras: readonly SplitExtra[];
};

export type ItemShare = {
  itemId: string;
  name: string;
  amountCents: number;
  weight: number;
  weightTotal: number;
};

export type ExtraShare = {
  extraId: string;
  label: string;
  amountCents: number;
};

export type PersonBreakdown = {
  personId: string;
  name: string;
  items: ItemShare[];
  preTaxCents: number;
  extras: ExtraShare[];
  totalCents: number;
};

export type UnassignedItem = {
  itemId: string;
  name: string;
  amountCents: number;
};

export type SplitResult = {
  people: PersonBreakdown[];
  unassignedItems: UnassignedItem[];
  unassignedItemsCents: number;
  unallocatedExtras: ExtraShare[];
  unallocatedExtrasCents: number;
  subtotalCents: number;
  extrasCents: number;
  billTotalCents: number;
  peopleTotalCents: number;
};

function asCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

/**
 * Apportion `totalCents` across `weights` so the parts are integers and sum
 * to `totalCents`. Larger fractional remainders get the leftover cents.
 * Equal remainders break toward the earlier index.
 */
export function allocateCents(totalCents: number, weights: readonly number[]): number[] {
  const count = weights.length;
  const result = new Array<number>(count).fill(0);
  if (count === 0) return result;

  const totalInt = asCents(totalCents);
  if (totalInt === 0) return result;

  const scaled = weights.map((weight) => {
    if (!Number.isFinite(weight) || weight <= 0) return 0n;
    const scaledWeight = Math.round(weight * 1000);
    if (scaledWeight <= 0) return 0n;
    return BigInt(Math.min(scaledWeight, 1_000_000_000));
  });

  const sum = scaled.reduce((acc, weight) => acc + weight, 0n);
  if (sum === 0n) return result;

  const sign = totalInt < 0 ? -1 : 1;
  const total = BigInt(Math.abs(totalInt));
  const parts: { index: number; remainder: bigint }[] = [];
  let allocated = 0n;

  for (let index = 0; index < count; index += 1) {
    if (scaled[index] === 0n) continue;
    const numerator = total * scaled[index];
    const share = numerator / sum;
    result[index] = Number(share);
    allocated += share;
    parts.push({ index, remainder: numerator % sum });
  }

  let left = Number(total - allocated);
  parts.sort((a, b) => {
    if (a.remainder === b.remainder) return a.index - b.index;
    return a.remainder > b.remainder ? -1 : 1;
  });

  let cursor = 0;
  while (left > 0 && parts.length > 0) {
    result[parts[cursor % parts.length].index] += 1;
    left -= 1;
    cursor += 1;
  }

  if (sign < 0) {
    for (let index = 0; index < count; index += 1) result[index] = -result[index];
  }
  return result;
}

function mergeAssignments(
  assignments: readonly SplitAssignment[],
  knownIds: ReadonlySet<string>,
): SplitAssignment[] {
  const weights = new Map<string, number>();
  for (const assignment of assignments) {
    if (!knownIds.has(assignment.personId)) continue;
    if (!Number.isFinite(assignment.weight) || assignment.weight <= 0) continue;
    weights.set(assignment.personId, (weights.get(assignment.personId) ?? 0) + assignment.weight);
  }
  return [...weights.entries()].map(([personId, weight]) => ({ personId, weight }));
}

export function splitBill(input: SplitInput): SplitResult {
  const people = input.people;
  const knownIds = new Set(people.map((person) => person.id));

  const itemShares = new Map<string, ItemShare[]>();
  const preTax = new Map<string, number>();
  for (const person of people) {
    itemShares.set(person.id, []);
    preTax.set(person.id, 0);
  }

  const unassignedItems: UnassignedItem[] = [];
  let subtotalCents = 0;

  for (const item of input.items) {
    const priceCents = asCents(item.priceCents);
    subtotalCents += priceCents;
    const assignments = mergeAssignments(item.assignments, knownIds);

    if (assignments.length === 0) {
      unassignedItems.push({ itemId: item.id, name: item.name, amountCents: priceCents });
      continue;
    }

    const weightTotal = assignments.reduce((sum, assignment) => sum + assignment.weight, 0);
    const shares = allocateCents(
      priceCents,
      assignments.map((assignment) => assignment.weight),
    );

    assignments.forEach((assignment, index) => {
      const amountCents = shares[index] ?? 0;
      itemShares.get(assignment.personId)?.push({
        itemId: item.id,
        name: item.name,
        amountCents,
        weight: assignment.weight,
        weightTotal,
      });
      preTax.set(assignment.personId, (preTax.get(assignment.personId) ?? 0) + amountCents);
    });
  }

  const assignedIds = new Set<string>();
  for (const person of people) {
    if ((itemShares.get(person.id)?.length ?? 0) > 0) assignedIds.add(person.id);
  }

  let weights = people.map((person) => Math.max(0, preTax.get(person.id) ?? 0));
  if (weights.every((weight) => weight === 0)) {
    weights = people.map((person) => (assignedIds.has(person.id) ? 1 : 0));
  }

  const extrasCents = input.extras.reduce((sum, extra) => sum + asCents(extra.amountCents), 0);
  const hasPayer = weights.some((weight) => weight > 0);
  const extraShares = new Map<string, ExtraShare[]>();
  for (const person of people) extraShares.set(person.id, []);

  const unallocatedExtras: ExtraShare[] = [];

  for (const extra of input.extras) {
    const amountCents = asCents(extra.amountCents);
    if (!hasPayer) {
      if (amountCents !== 0) {
        unallocatedExtras.push({ extraId: extra.id, label: extra.label, amountCents });
      }
      continue;
    }
    const shares = allocateCents(amountCents, weights);
    people.forEach((person, index) => {
      const share = shares[index] ?? 0;
      if (share === 0) return;
      extraShares.get(person.id)?.push({
        extraId: extra.id,
        label: extra.label,
        amountCents: share,
      });
    });
  }

  const breakdowns: PersonBreakdown[] = people.map((person) => {
    const items = itemShares.get(person.id) ?? [];
    const extras = extraShares.get(person.id) ?? [];
    const preTaxCents = preTax.get(person.id) ?? 0;
    const extrasSum = extras.reduce((sum, extra) => sum + extra.amountCents, 0);
    return {
      personId: person.id,
      name: person.name,
      items,
      preTaxCents,
      extras,
      totalCents: preTaxCents + extrasSum,
    };
  });

  const peopleTotalCents = breakdowns.reduce((sum, person) => sum + person.totalCents, 0);
  const unassignedItemsCents = unassignedItems.reduce((sum, item) => sum + item.amountCents, 0);
  const unallocatedExtrasCents = unallocatedExtras.reduce((sum, extra) => sum + extra.amountCents, 0);

  return {
    people: breakdowns,
    unassignedItems,
    unassignedItemsCents,
    unallocatedExtras,
    unallocatedExtrasCents,
    subtotalCents,
    extrasCents,
    billTotalCents: subtotalCents + extrasCents,
    peopleTotalCents,
  };
}
