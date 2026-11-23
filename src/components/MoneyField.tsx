import { useEffect, useState } from "react";
import { formatCentsForInput, liveMoneyCents } from "../money";

type MoneyFieldProps = {
  id: string;
  label: string;
  cents: number;
  symbol: string;
  fractionDigits?: number;
  onChange: (cents: number) => void;
};

export function MoneyField({ id, label, cents, symbol, fractionDigits = 2, onChange }: MoneyFieldProps) {
  const [text, setText] = useState(() => formatCentsForInput(cents, fractionDigits));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatCentsForInput(cents, fractionDigits));
  }, [cents, focused, fractionDigits]);

  return (
    <label className="money-field" htmlFor={id}>
      <span>{label}</span>
      <span className="money-input">
        <span className="money-prefix" aria-hidden="true">
          {symbol || "$"}
        </span>
        <input
          id={id}
          dir="ltr"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onFocus={(event) => {
            setFocused(true);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            const live = liveMoneyCents(next, fractionDigits);
            if (live != null) onChange(live);
          }}
          onBlur={() => {
            setFocused(false);
            const live = liveMoneyCents(text, fractionDigits);
            if (live == null) {
              setText(formatCentsForInput(cents, fractionDigits));
              return;
            }
            onChange(live);
            setText(formatCentsForInput(live, fractionDigits));
          }}
        />
      </span>
    </label>
  );
}
