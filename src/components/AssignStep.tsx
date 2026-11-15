import { useEffect, useState } from "react";
import { formatMoney, shareLabel } from "../money";
import { allocateCents } from "../split/splitBill";
import type { SplitResult } from "../split/splitBill";
import type { Item, Person } from "../types";

type DragState = {
  itemId: string;
  name: string;
  x: number;
  y: number;
  overId: string | null;
};

type AssignStepProps = {
  symbol: string;
  items: Item[];
  people: Person[];
  selectedItemId: string | null;
  result: SplitResult;
  onSelect: (id: string | null) => void;
  onToggle: (itemId: string, personId: string) => void;
  onAssign: (itemId: string, personId: string) => void;
  onShareMode: (itemId: string, mode: "even" | "custom") => void;
  onWeight: (itemId: string, personId: string, weight: number) => void;
  onBack: () => void;
  onNext: () => void;
};

function personAtPoint(x: number, y: number): string | null {
  const elements = document.elementsFromPoint(x, y);
  for (const element of elements) {
    if (!(element instanceof Element)) continue;
    const zone = element.closest("[data-person-id]");
    if (zone instanceof HTMLElement && zone.dataset.personId) return zone.dataset.personId;
  }
  return null;
}

function GripIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="6" cy="4" r="1.35" fill="currentColor" />
      <circle cx="12" cy="4" r="1.35" fill="currentColor" />
      <circle cx="6" cy="9" r="1.35" fill="currentColor" />
      <circle cx="12" cy="9" r="1.35" fill="currentColor" />
      <circle cx="6" cy="14" r="1.35" fill="currentColor" />
      <circle cx="12" cy="14" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function AssignStep({
  symbol,
  items,
  people,
  selectedItemId,
  result,
  onSelect,
  onToggle,
  onAssign,
  onShareMode,
  onWeight,
  onBack,
  onNext,
}: AssignStepProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [nudge, setNudge] = useState("");
  const open = items.filter((item) => item.assignments.length === 0);
  const placed = items.filter((item) => item.assignments.length > 0);
  const visual = [...open, ...placed];
  const selected = items.find((item) => item.id === selectedItemId) ?? null;

  useEffect(() => {
    document.body.classList.toggle("is-dragging", drag != null);
    return () => document.body.classList.remove("is-dragging");
  }, [drag]);

  function moveSelection(delta: number) {
    if (visual.length === 0) return;
    const index = visual.findIndex((item) => item.id === selectedItemId);
    const nextIndex = index === -1 ? (delta > 0 ? 0 : visual.length - 1) : (index + delta + visual.length) % visual.length;
    const next = visual[nextIndex];
    onSelect(next.id);
    setNudge("");
    document.querySelector<HTMLButtonElement>(`[data-item-id="${next.id}"]`)?.focus();
  }

  function assignByIndex(index: number) {
    const person = people[index];
    if (!person || !selectedItemId) {
      setNudge("Select an item first.");
      return;
    }
    setNudge("");
    onToggle(selectedItemId, person.id);
  }

  const status = selected
    ? `${selected.name || "Item"} selected. Tap a person, or press 1 through ${Math.min(people.length, 9)}.`
    : "Select an item to assign it.";

  return (
    <section
      className="step-panel"
      aria-labelledby="assign-title"
      data-testid="assign-board"
      onKeyDown={(event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("input, textarea")) return;
        if (event.key === "Escape") {
          onSelect(null);
          setNudge("");
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveSelection(event.key === "ArrowDown" ? 1 : -1);
        } else if (/^[1-9]$/.test(event.key)) {
          event.preventDefault();
          assignByIndex(Number(event.key) - 1);
        }
      }}
    >
      <div className="step-copy">
        <h2 id="assign-title">Put each item on someone</h2>
        <p id="assign-hint">Drag the grip onto a person, or tap an item and then a person. Tap again to remove them. Keys 1–9 work too.</p>
      </div>
      <p className="assign-status" role="status" aria-live="polite">
        {nudge || status}
      </p>

      <div className="assign-layout">
        <div className="item-scroller">
          {visual.length === 0 && <p className="empty">No items on this bill.</p>}
          {open.length > 0 && <h3 className="group-label">Still open</h3>}
          {open.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              people={people}
              symbol={symbol}
              selected={item.id === selectedItemId}
              onSelect={onSelect}
              onShareMode={onShareMode}
              onWeight={onWeight}
              onDragStart={(next) => setDrag({ ...next, overId: personAtPoint(next.x, next.y) })}
              onDragEnd={(itemId, x, y) => {
                const personId = personAtPoint(x, y);
                if (personId) onAssign(itemId, personId);
                setDrag(null);
              }}
            />
          ))}
          {placed.length > 0 && <h3 className="group-label">Assigned</h3>}
          {placed.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              people={people}
              symbol={symbol}
              selected={item.id === selectedItemId}
              onSelect={onSelect}
              onShareMode={onShareMode}
              onWeight={onWeight}
              onDragStart={(next) => setDrag({ ...next, overId: personAtPoint(next.x, next.y) })}
              onDragEnd={(itemId, x, y) => {
                const personId = personAtPoint(x, y);
                if (personId) onAssign(itemId, personId);
                setDrag(null);
              }}
            />
          ))}
        </div>

        <div className="people-tray" aria-label="People">
          {people.map((person, index) => {
            const row = result.people.find((entry) => entry.personId === person.id);
            const on = selected?.assignments.some((assignment) => assignment.personId === person.id) ?? false;
            const over = drag?.overId === person.id;
            return (
              <div
                key={person.id}
                className={`person-zone${on ? " is-on" : ""}${drag ? " is-target" : ""}${over ? " is-over" : ""}`}
                data-person-id={person.id}
                data-testid="person-zone"
                style={{ borderColor: over ? "var(--saffron)" : on ? person.color : undefined }}
              >
                <button
                  type="button"
                  className="person-hit"
                  aria-pressed={on}
                  onClick={() => {
                    if (!selectedItemId) {
                      setNudge("Select an item first, then tap a person.");
                      return;
                    }
                    setNudge("");
                    onToggle(selectedItemId, person.id);
                  }}
                >
                  <span className="swatch" style={{ background: person.color }} aria-hidden="true" />
                  <span className="person-copy">
                    <span className="person-name">{person.name}</span>
                    {index < 9 && <span className="person-key">Key {index + 1}</span>}
                  </span>
                  <strong>{formatMoney(row?.totalCents ?? 0, symbol || "$")}</strong>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="step-actions">
        <button type="button" className="button" data-testid="continue" onClick={onNext}>
          Next: who pays what
        </button>
        <button type="button" className="text-button" onClick={onBack}>
          Back
        </button>
      </div>

      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
          {drag.name}
        </div>
      )}
    </section>
  );
}

function ItemCard({
  item,
  people,
  symbol,
  selected,
  onSelect,
  onShareMode,
  onWeight,
  onDragStart,
  onDragEnd,
}: {
  item: Item;
  people: Person[];
  symbol: string;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onShareMode: (itemId: string, mode: "even" | "custom") => void;
  onWeight: (itemId: string, personId: string, weight: number) => void;
  onDragStart: (drag: Omit<DragState, "overId">) => void;
  onDragEnd: (itemId: string, x: number, y: number) => void;
}) {
  const known = item.assignments.filter((assignment) => people.some((person) => person.id === assignment.personId));
  const shares = allocateCents(
    item.priceCents,
    known.map((assignment) => assignment.weight),
  );
  const weightTotal = known.reduce((sum, assignment) => sum + assignment.weight, 0);
  const label = item.name.trim() || "Untitled item";

  return (
    <article className={`assign-item${selected ? " is-selected" : ""}${known.length === 0 ? " is-open" : ""}`} data-testid="item-card">
      <span
        className="grip"
        aria-hidden="true"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          onDragStart({ itemId: item.id, name: label, x: event.clientX, y: event.clientY });
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          onDragStart({ itemId: item.id, name: label, x: event.clientX, y: event.clientY });
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          onDragEnd(item.id, event.clientX, event.clientY);
        }}
        onPointerCancel={() => onDragEnd(item.id, -1, -1)}
      >
        <GripIcon />
      </span>
      <div className="assign-body">
        <button
          type="button"
          className="assign-select"
          data-item-id={item.id}
          aria-pressed={selected}
          aria-describedby="assign-hint"
          onClick={() => onSelect(selected ? null : item.id)}
        >
          <span>
            {label}
            {item.quantity > 1 ? ` × ${item.quantity}` : ""}
          </span>
          <strong>{formatMoney(item.priceCents, symbol || "$")}</strong>
        </button>
        {known.length > 0 && (
          <div className="chips">
            {known.map((assignment, index) => {
              const person = people.find((entry) => entry.id === assignment.personId);
              if (!person) return null;
              const fraction = shareLabel(assignment.weight, weightTotal);
              return (
                <span key={person.id} className="chip" style={{ background: person.color }}>
                  {person.name}
                  {fraction ? ` ${fraction}` : ""} {formatMoney(shares[index] ?? 0, symbol || "$")}
                </span>
              );
            })}
          </div>
        )}
        {known.length > 1 && (
          <div className="share-controls">
            <div className="segmented" role="group" aria-label={`How to split ${label}`}>
              <button type="button" aria-pressed={item.shareMode !== "custom"} onClick={() => onShareMode(item.id, "even")}>
                Even
              </button>
              <button type="button" aria-pressed={item.shareMode === "custom"} onClick={() => onShareMode(item.id, "custom")}>
                Custom
              </button>
            </div>
            {item.shareMode === "custom" && (
              <div className="weights">
                {known.map((assignment) => {
                  const person = people.find((entry) => entry.id === assignment.personId);
                  if (!person) return null;
                  return (
                    <label key={person.id}>
                      <span>{person.name}</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        aria-label={`${person.name} shares of ${label}`}
                        value={assignment.weight}
                        onChange={(event) => {
                          const weight = Number(event.target.value);
                          if (!Number.isFinite(weight) || weight <= 0) return;
                          onWeight(item.id, person.id, weight);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
