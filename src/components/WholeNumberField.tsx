import { useEffect, useState } from "react";
import { integerDraftValue, reviseIntegerDraft } from "../fields";

type WholeNumberFieldProps = {
  value: number;
  min: number;
  max: number;
  maxDigits: number;
  ariaLabel: string;
  onCommit: (value: number) => void;
};

export function WholeNumberField({ value, min, max, maxDigits, ariaLabel, onCommit }: WholeNumberFieldProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      dir="ltr"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const next = reviseIntegerDraft(text, event.target.value, maxDigits);
        setText(next);
        const committed = integerDraftValue(next, min, max);
        if (committed != null) onCommit(committed);
      }}
      onBlur={() => {
        setFocused(false);
        const committed = integerDraftValue(text, min, max);
        if (committed == null) {
          setText(String(value));
          return;
        }
        onCommit(committed);
        setText(String(committed));
      }}
    />
  );
}
