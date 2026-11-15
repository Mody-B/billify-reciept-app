import { formatMoney } from "../money";
import type { Extra, Item } from "../types";
import { MoneyField } from "./MoneyField";

type ReviewStepProps = {
  symbol: string;
  items: Item[];
  taxCents: number;
  tipCents: number;
  serviceCents: number;
  otherExtras: Extra[];
  detectedTotalCents: number | null;
  ocrText: string | null;
  onSymbol: (symbol: string) => void;
  onItem: (id: string, patch: Partial<Pick<Item, "name" | "quantity" | "priceCents">>) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: () => void;
  onTax: (cents: number) => void;
  onTip: (cents: number) => void;
  onService: (cents: number) => void;
  onExtra: (id: string, patch: Partial<Pick<Extra, "label" | "amountCents">>) => void;
  onRemoveExtra: (id: string) => void;
  onAddExtra: () => void;
  onBack: () => void;
  onNext: () => void;
};

export function ReviewStep(props: ReviewStepProps) {
  const subtotal = props.items.reduce((sum, item) => sum + item.priceCents, 0);
  const extras =
    props.taxCents +
    props.tipCents +
    props.serviceCents +
    props.otherExtras.reduce((sum, extra) => sum + extra.amountCents, 0);
  const total = subtotal + extras;
  const delta = props.detectedTotalCents == null ? null : props.detectedTotalCents - total;
  const canContinue = props.items.length > 0 || extras !== 0;

  return (
    <section className="step-panel" aria-labelledby="review-title">
      <div className="step-copy">
        <h2 id="review-title">Check the lines</h2>
        <p>Tax, tip, and service stay out of the item list. Fix names and prices before anyone is assigned.</p>
      </div>

      <label className="symbol-field">
        <span>Currency symbol</span>
        <input
          aria-label="Currency symbol"
          value={props.symbol}
          maxLength={3}
          onChange={(event) => props.onSymbol(event.target.value)}
          onBlur={() => {
            if (!props.symbol.trim()) props.onSymbol("$");
          }}
        />
      </label>

      <div className="stack">
        {props.items.map((item, index) => (
          <article className="edit-card" key={item.id} data-testid="edit-item">
            <div className="edit-grid">
              <label className="name">
                <span>Item</span>
                <input
                  value={item.name}
                  aria-label={`Item ${index + 1} name`}
                  onChange={(event) => props.onItem(item.id, { name: event.target.value })}
                />
              </label>
              <label>
                <span>Qty</span>
                <input
                  inputMode="numeric"
                  aria-label={`Item ${index + 1} quantity`}
                  value={item.quantity}
                  onChange={(event) => {
                    const quantity = Number(event.target.value);
                    if (!Number.isFinite(quantity)) return;
                    props.onItem(item.id, { quantity: Math.max(1, Math.min(99, Math.trunc(quantity))) });
                  }}
                />
              </label>
              <MoneyField
                id={`price-${item.id}`}
                label="Line total"
                cents={item.priceCents}
                symbol={props.symbol}
                onChange={(priceCents) => props.onItem(item.id, { priceCents })}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete ${item.name || "item"}`}
                onClick={() => props.onRemoveItem(item.id)}
              >
                ✕
              </button>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="button secondary add-button" data-testid="add-item" onClick={props.onAddItem}>
        Add item
      </button>

      <div className="receipt-box">
        <div className="total-row">
          <span>Subtotal</span>
          <strong>{formatMoney(subtotal, props.symbol || "$")}</strong>
        </div>
        <div className="extra-list">
          <MoneyField id="tax" label="Tax" cents={props.taxCents} symbol={props.symbol} onChange={props.onTax} />
          <MoneyField id="tip" label="Tip" cents={props.tipCents} symbol={props.symbol} onChange={props.onTip} />
          <MoneyField
            id="service"
            label="Service charge"
            cents={props.serviceCents}
            symbol={props.symbol}
            onChange={props.onService}
          />
          {props.otherExtras.map((extra) => (
            <div className="other-extra" key={extra.id}>
              <label>
                <span>Extra</span>
                <input
                  value={extra.label}
                  aria-label="Extra cost name"
                  onChange={(event) => props.onExtra(extra.id, { label: event.target.value })}
                />
              </label>
              <MoneyField
                id={`extra-${extra.id}`}
                label="Amount"
                cents={extra.amountCents}
                symbol={props.symbol}
                onChange={(amountCents) => props.onExtra(extra.id, { amountCents })}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete ${extra.label || "extra"}`}
                onClick={() => props.onRemoveExtra(extra.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="text-button" onClick={props.onAddExtra}>
          Add another extra
        </button>
        <div className="total-row grand">
          <span>Bill total</span>
          <strong>{formatMoney(total, props.symbol || "$")}</strong>
        </div>
        {props.detectedTotalCents != null && (
          <div className="total-row muted">
            <span>Receipt total</span>
            <span>{formatMoney(props.detectedTotalCents, props.symbol || "$")}</span>
          </div>
        )}
        {delta === 0 && <p className="ok">Matches the receipt total.</p>}
        {delta != null && delta !== 0 && (
          <p className="flag" role="alert">
            Items plus extras are {formatMoney(Math.abs(delta), props.symbol || "$")}{" "}
            {delta > 0 ? "short of" : "over"} the receipt total of{" "}
            {formatMoney(props.detectedTotalCents ?? 0, props.symbol || "$")}. Adjust a line or an extra if
            that looks wrong. You can still split.
          </p>
        )}
      </div>

      {props.ocrText && (
        <details className="ocr-text">
          <summary>What the reader saw</summary>
          <pre>{props.ocrText}</pre>
        </details>
      )}

      <div className="step-actions">
        <button type="button" className="button secondary" onClick={props.onBack}>
          Back
        </button>
        <button type="button" className="button" data-testid="continue" disabled={!canContinue} onClick={props.onNext}>
          Add people
        </button>
      </div>
    </section>
  );
}
