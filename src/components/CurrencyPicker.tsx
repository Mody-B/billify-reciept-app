import { useState } from "react";
import { findCurrency, searchCurrencies } from "../currency";

type CurrencyPickerProps = {
  code: string;
  onChange: (code: string) => void;
};

export function CurrencyPicker({ code, onChange }: CurrencyPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = findCurrency(code);
  const matches = searchCurrencies(query);

  return (
    <div className="currency-picker">
      <label>
        <span>Currency</span>
        <input
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="currency-list"
          aria-label="Currency"
          autoComplete="off"
          placeholder="Search currencies"
          value={open ? query : `${selected.name} (${selected.symbol})`}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              event.currentTarget.blur();
            }
            if (event.key === "Enter" && matches[0]) {
              event.preventDefault();
              onChange(matches[0].code);
              setOpen(false);
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      {open && (
        <ul id="currency-list" role="listbox" className="currency-list" aria-label="Currencies">
          {matches.length === 0 && <li className="empty">No match. Try dollar, euro, or pound.</li>}
          {matches.map((currency) => (
            <li key={currency.code}>
              <button
                type="button"
                role="option"
                aria-selected={currency.code === selected.code}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(currency.code);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span>{currency.name}</span>
                <span className="price">{currency.symbol}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
