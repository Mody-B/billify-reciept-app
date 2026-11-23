export type Assignment = {
  personId: string;
  weight: number;
};

export type Item = {
  id: string;
  name: string;
  quantity: number;
  priceCents: number;
  assignments: Assignment[];
  shareMode: "even" | "custom";
  /** The printed quantity and line total did not agree. */
  needsCheck?: boolean;
  /** The item name is a literal reading and should be checked. */
  nameUncertain?: boolean;
};

export type Extra = {
  id: string;
  label: string;
  amountCents: number;
};

export type Person = {
  id: string;
  name: string;
  color: string;
};

export type StepId = "capture" | "review" | "people" | "assign" | "summary";

export const PERSON_COLORS = [
  "#1f6f4a",
  "#e07a2f",
  "#2c5aa0",
  "#8a3d5b",
  "#6b4c2a",
  "#0f6e6e",
  "#a33b24",
  "#3f4d34",
  "#7a4e9a",
  "#1d4e89",
];

export const STEPS: { id: StepId; label: string }[] = [
  { id: "capture", label: "Scan" },
  { id: "review", label: "Items" },
  { id: "people", label: "People" },
  { id: "assign", label: "Assign" },
  { id: "summary", label: "Totals" },
];
