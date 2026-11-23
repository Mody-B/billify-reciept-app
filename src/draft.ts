import { billHasWork, serializeBill, type BillSnapshot } from "./billSnapshot";
import type { Extra, Item, Person, StepId } from "./types";

const DRAFT_KEY = "splitit-draft-v1";
const STEPS: StepId[] = ["capture", "review", "people", "assign", "summary"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

function asItems(value: unknown): Item[] | null {
  if (!Array.isArray(value)) return null;
  const items: Item[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.name !== "string") return null;
    if (typeof entry.quantity !== "number" || typeof entry.priceCents !== "number") return null;
    if (entry.shareMode !== "even" && entry.shareMode !== "custom") return null;
    if (!Array.isArray(entry.assignments)) return null;
    const assignments = [];
    for (const assignment of entry.assignments) {
      if (!isRecord(assignment) || typeof assignment.personId !== "string" || typeof assignment.weight !== "number") return null;
      if (assignment.weight <= 0) continue;
      assignments.push({ personId: assignment.personId, weight: assignment.weight });
    }
    items.push({
      id: entry.id,
      name: entry.name,
      quantity: entry.quantity,
      priceCents: entry.priceCents,
      shareMode: entry.shareMode,
      assignments,
      ...(entry.needsCheck === true ? { needsCheck: true } : {}),
    });
  }
  return items;
}

function asPeople(value: unknown): Person[] | null {
  if (!Array.isArray(value)) return null;
  const people: Person[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.name !== "string" || typeof entry.color !== "string") {
      return null;
    }
    people.push({ id: entry.id, name: entry.name, color: entry.color });
  }
  return people;
}

function asExtras(value: unknown): Extra[] | null {
  if (!Array.isArray(value)) return null;
  const extras: Extra[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.label !== "string" || typeof entry.amountCents !== "number") {
      return null;
    }
    extras.push({ id: entry.id, label: entry.label, amountCents: entry.amountCents });
  }
  return extras;
}

export function parseDraft(raw: string): BillSnapshot | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value)) return null;
    if (typeof value.step !== "string" || !STEPS.includes(value.step as StepId)) return null;
    if (typeof value.currency !== "string") return null;
    const items = asItems(value.items);
    const people = asPeople(value.people);
    const otherExtras = asExtras(value.otherExtras);
    if (!items || !people || !otherExtras) return null;
    if (typeof value.taxCents !== "number" || typeof value.tipCents !== "number" || typeof value.serviceCents !== "number") return null;
    const evenCount = value.evenCount == null ? null : value.evenCount;
    if (evenCount != null && typeof evenCount !== "number") return null;
    const splitMode = value.splitMode == null ? null : value.splitMode;
    if (splitMode != null && splitMode !== "even" && splitMode !== "items") return null;
    let detectedTotalCents: number | null = null;
    if (value.detectedTotalCents != null) {
      if (typeof value.detectedTotalCents !== "number") return null;
      detectedTotalCents = value.detectedTotalCents;
    }
    let selectedItemId: string | null = null;
    if (value.selectedItemId != null) {
      if (typeof value.selectedItemId !== "string") return null;
      selectedItemId = value.selectedItemId;
    }
    const bill: BillSnapshot = {
      step: value.step as StepId,
      currency: value.currency,
      items,
      taxCents: value.taxCents,
      tipCents: value.tipCents,
      serviceCents: value.serviceCents,
      otherExtras,
      detectedTotalCents,
      people,
      evenCount,
      splitMode,
      selectedItemId,
    };
    if (!billHasWork(bill)) return null;
    return bill;
  } catch {
    return null;
  }
}

export function loadDraft(): BillSnapshot | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return parseDraft(raw);
  } catch {
    return null;
  }
}

export function saveDraft(bill: BillSnapshot): void {
  localStorage.setItem(DRAFT_KEY, serializeBill(bill));
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
