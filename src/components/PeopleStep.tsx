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
        <h2 id="people-title">Who is splitting?</h2>
        <p>Add a name for each person. You can share any item across more than one of them.</p>
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
        <ul className="people-list">
          {people.map((person) => (
            <li key={person.id}>
              <span className="person-row">
                <span className="swatch" style={{ background: person.color }} aria-hidden="true" />
                <span>{person.name}</span>
              </span>
              <button type="button" className="text-button" onClick={() => onRemove(person.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="step-actions">
        <button type="button" className="button secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="button"
          data-testid="continue"
          disabled={people.length === 0}
          onClick={onNext}
        >
          Assign items
        </button>
      </div>
    </section>
  );
}
