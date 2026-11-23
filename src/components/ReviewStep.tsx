import { useState } from "react";
import { CurrencyPicker } from "./CurrencyPicker";
import { newId } from "../id";
import { formatMoney, lineTotalCents } from "../money";
import { WholeNumberField } from "./WholeNumberField";
import type { Extra, Item } from "../types";
import { MoneyField } from "./MoneyField";
import { ReadProgress } from "./ReadProgress";

type ReviewStepProps = {
  symbol: string;
  fractionDigits: number;
  currency: string;
  items: Item[];
  taxCents: number;
  tipCents: number;
  serviceCents: number;
  otherExtras: Extra[];
  detectedTotalCents: number | null;
  photoUrl: string | null;
  reading: boolean;
  note: string | null;
  onCurrency: (code: string) => void;
  onItem: (id: string, patch: Partial<Pick<Item, "name" | "quantity" | "priceCents" | "needsCheck" | "nameUncertain">>) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: (item: Item) => void;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const mark = props.symbol || "$";
  const digits = props.fractionDigits;
  const subtotal = props.items.reduce((sum, item) => sum + lineTotalCents(item.quantity, item.priceCents), 0);
  const extras =
    props.taxCents +
    props.tipCents +
    props.serviceCents +
    props.otherExtras.reduce((sum, extra) => sum + extra.amountCents, 0);
  const total = subtotal + extras;
  const delta = props.detectedTotalCents == null ? null : props.detectedTotalCents - total;
  const canContinue = props.items.some((item) => item.name.trim() || item.priceCents !== 0) || extras !== 0;

  return (
    <section className="step-panel" aria-labelledby="review-title">
      <div className="step-copy">
        <h2 id="review-title">Check the items</h2>
        <p>Tap a line to fix it. Tax and tip stay out of the list.</p>
      </div>

      <div className="check-layout">
        {props.photoUrl && (
          <figure className="preview">
            <img src={props.photoUrl} alt="Your receipt" />
          </figure>
        )}
        <div>
          <ReadProgress active={props.reading} />
          {props.note && (
            <p className="flag" role="status">
              {props.note}
            </p>
          )}
          <div className="line-list">
            {props.items.map((item, index) =>
              editingId === item.id ? (
                <article className="edit-card" key={item.id} data-testid="edit-item">
                  <div className="edit-grid">
                    <label className="name">
                      <span>Item</span>
                      <input
                        autoFocus
                        dir="auto"
                        value={item.name}
                        aria-label={`Item ${index + 1} name`}
                        onChange={(event) => props.onItem(item.id, { name: event.target.value, needsCheck: false, nameUncertain: false })}
                      />
                    </label>
                    <label>
                      <span>Qty</span>
                      <WholeNumberField
                        value={item.quantity}
                        min={1}
                        max={99}
                        maxDigits={2}
                        ariaLabel={`Item ${index + 1} quantity`}
                        onCommit={(quantity) => props.onItem(item.id, { quantity, needsCheck: false })}
                      />
                    </label>
                    <MoneyField
                      id={`price-${item.id}`}
                      label="Each"
                      cents={item.priceCents}
                      symbol={props.symbol}
                      fractionDigits={digits}
                      onChange={(priceCents) => props.onItem(item.id, { priceCents, needsCheck: false })}
                    />
                  </div>
                  {item.quantity > 1 && (
                    <p className="even-note">Line {formatMoney(lineTotalCents(item.quantity, item.priceCents), mark, digits)}</p>
                  )}
                  {item.nameUncertain && <p className="flag">Check this line.</p>}
                  {item.needsCheck && <p className="flag">Quantity and the printed line total don't match. Check this line.</p>}
                  <div className="edit-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        props.onRemoveItem(item.id);
                        setEditingId(null);
                      }}
                    >
                      Delete
                    </button>
                    <button type="button" className="text-button" onClick={() => setEditingId(null)}>
                      Done
                    </button>
                  </div>
                </article>
              ) : (
                <div key={item.id}>
                  <button
                    type="button"
                    className="line-row"
                    data-testid="edit-item"
                    onClick={() => setEditingId(item.id)}
                  >
                    <span className="qty" dir="ltr">{item.quantity > 1 ? `${item.quantity}×` : ""}</span>
                    <bdi className="item-name" dir="auto">{item.name || "Untitled item"}</bdi>
                    <span className="price" dir="ltr">{formatMoney(lineTotalCents(item.quantity, item.priceCents), mark, digits)}</span>
                  </button>
                  {item.nameUncertain && <p className="flag">Check this line.</p>}
                  {item.needsCheck && <p className="flag">Quantity and the printed line total don't match. Check this line.</p>}
                </div>
              ),
            )}
          </div>
          <button
            type="button"
            className="text-button"
            data-testid="add-item"
            onClick={() => {
              const item: Item = { id: newId(), name: "", quantity: 1, priceCents: 0, assignments: [], shareMode: "even" };
              props.onAddItem(item);
              setEditingId(item.id);
            }}
          >
            Add an item
          </button>
        </div>
      </div>

      <div className="receipt-box">
        <div className="total-row">
          <span>Subtotal</span>
          <strong dir="ltr">{formatMoney(subtotal, mark, digits)}</strong>
        </div>
        <div className="extra-list">
          <MoneyField id="tax" label="Tax" cents={props.taxCents} symbol={props.symbol} fractionDigits={digits} onChange={props.onTax} />
          <MoneyField id="tip" label="Tip" cents={props.tipCents} symbol={props.symbol} fractionDigits={digits} onChange={props.onTip} />
          <MoneyField id="service" label="Service" cents={props.serviceCents} symbol={props.symbol} fractionDigits={digits} onChange={props.onService} />
          {props.otherExtras.map((extra) => (
            <div className="other-extra" key={extra.id}>
              <label>
                <span>Fee</span>
                <input
                  dir="auto"
                  value={extra.label}
                  aria-label="Fee name"
                  onChange={(event) => props.onExtra(extra.id, { label: event.target.value })}
                />
              </label>
              <MoneyField
                id={`extra-${extra.id}`}
                label="Amount"
                cents={extra.amountCents}
                symbol={props.symbol}
                fractionDigits={digits}
                onChange={(amountCents) => props.onExtra(extra.id, { amountCents })}
              />
              <button type="button" className="icon-button" aria-label={`Delete ${extra.label || "fee"}`} onClick={() => props.onRemoveExtra(extra.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="text-button" onClick={props.onAddExtra}>
          Add a fee
        </button>
        <CurrencyPicker code={props.currency} onChange={props.onCurrency} />
        <div className="total-row grand">
          <span>Total</span>
          <strong dir="ltr">{formatMoney(total, mark, digits)}</strong>
        </div>
        {props.detectedTotalCents != null && (
          <div className="total-row muted">
            <span>Printed total</span>
            <span className="money" dir="ltr">{formatMoney(props.detectedTotalCents, mark, digits)}</span>
          </div>
        )}
        {delta === 0 && <p className="ok">Matches the printed total.</p>}
        {delta != null && delta !== 0 && (
          <p className="flag" role="alert">
            Off by {formatMoney(Math.abs(delta), mark, digits)} from the printed total. Tap a line to fix it.
          </p>
        )}
      </div>

      <div className="step-actions">
        <button type="button" className="button" data-testid="continue" disabled={!canContinue || props.reading} onClick={props.onNext}>
          Next: who’s splitting
        </button>
        <button type="button" className="text-button" onClick={props.onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
