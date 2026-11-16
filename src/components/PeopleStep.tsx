import { useState } from "react";
import type { Person } from "../types";

type PeopleStepProps = {
  people: Person[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function PeopleStep({ people, onAdd, onRemove, onBack, onNext }: PeopleStepProps) {
  const [name, setName] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed.slice(0, 40));
    setName("");
  }

  return (
    <section className="step-panel" aria-labelledby="people-title">
      <div className="step-copy">
        <h2 id="people-title">Who’s splitting?</h2>
        <p>Type a name and tap Add. Then you’ll put items on them.</p>
      </div>

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

      {people.length === 0 ? (
        <p className="empty">No one yet. Add at least one person to continue.</p>
      ) : (
        <ul className="name-tabs">
          {people.map((person) => (
            <li key={person.id} className="person-tab">
              <span>{person.name}</span>
              <button type="button" className="tab-x" aria-label={`Remove ${person.name}`} onClick={() => onRemove(person.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="step-actions">
        <button
          type="button"
          className="button"
          data-testid="continue"
          disabled={people.length === 0}
          onClick={onNext}
        >
          Next: assign items
        </button>
        <button type="button" className="text-button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
