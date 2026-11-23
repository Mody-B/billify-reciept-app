import { useState } from "react";
import { integerDraftValue, reviseIntegerDraft } from "../fields";
import type { Person } from "../types";

type PeopleStepProps = {
  people: Person[];
  mode: "even" | "items" | null;
  evenCount: number | null;
  onMode: (mode: "even" | "items" | null) => void;
  onAdd: (name: string) => boolean;
  onRemove: (id: string) => void;
  onEven: (count: number) => void;
  onBack: () => void;
  onNext: () => void;
};

export function PeopleStep({ people, mode, evenCount, onMode, onAdd, onRemove, onEven, onBack, onNext }: PeopleStepProps) {
  const [name, setName] = useState("");
  const [nameNote, setNameNote] = useState("");
  const [evenText, setEvenText] = useState(evenCount == null ? "" : String(evenCount));
  const typedCount = integerDraftValue(evenText, 1, 99);
  const evenReady = typedCount != null;

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!onAdd(trimmed.slice(0, 40))) {
      setNameNote("That name is already on the bill.");
      return;
    }
    setName("");
    setNameNote("");
  }

  return (
    <section className="step-panel" aria-labelledby="people-title" data-testid="people-board">
      <div className="step-copy">
        <h2 id="people-title">Who’s splitting?</h2>
        <p>
          {mode == null
            ? "Choose one way to split this bill."
            : mode === "even"
              ? "Type how many people. The bill, including tax and extras, is divided by that number."
              : "Type a name and tap Add. Then you’ll put items on them."}
        </p>
      </div>

      {mode == null ? (
        <div className="split-modes" role="group" aria-label="How to split">
          <button type="button" className="button secondary" data-testid="assign-items" onClick={() => onMode("items")}>
            Assign items
          </button>
          <button type="button" className="button secondary" data-testid="split-evenly" onClick={() => onMode("even")}>
            Split evenly
          </button>
        </div>
      ) : mode === "items" ? (
        <>
          <form
            className="name-form"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <label>
              <span>Name</span>
              <input
                data-testid="person-name"
                dir="auto"
                value={name}
                placeholder="Alex"
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <button type="submit" className="button" data-testid="add-person">
              Add
            </button>
          </form>
          {nameNote && (
            <p className="flag" role="status">
              {nameNote}
            </p>
          )}

          {people.length === 0 ? (
            <p className="empty">No one yet. Add at least one person.</p>
          ) : (
            <ul className="name-tabs">
              {people.map((person) => (
                <li key={person.id} className="person-tab">
                  <bdi className="item-name" dir="auto">{person.name}</bdi>
                  <button type="button" className="tab-x" aria-label={`Remove ${person.name}`} onClick={() => onRemove(person.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <form
          className="even-count"
          data-testid="even-split"
          onSubmit={(event) => {
            event.preventDefault();
              if (typedCount != null) onEven(typedCount);
          }}
        >
          <label>
            <span>People</span>
            <input
              data-testid="even-count"
              dir="ltr"
              inputMode="numeric"
              min={1}
              max={99}
              value={evenText}
              onChange={(event) => setEvenText((current) => reviseIntegerDraft(current, event.target.value, 2))}
            />
          </label>
        </form>
      )}

      <div className="step-actions">
        {mode === "items" && (
          <button type="button" className="button" data-testid="continue" disabled={people.length === 0} onClick={onNext}>
            Next: assign items
          </button>
        )}
        {mode === "even" && (
          <button
            type="button"
            className="button"
            data-testid="continue"
            disabled={!evenReady}
            onClick={() => {
              if (typedCount != null) onEven(typedCount);
            }}
          >
            Next: who pays what
          </button>
        )}
        <button type="button" className="text-button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
