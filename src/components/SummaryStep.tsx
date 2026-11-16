import { InstallPrompt } from "./InstallPrompt";
import { formatMoney, shareLabel } from "../money";
import type { SplitResult } from "../split/splitBill";
import type { Item, Person } from "../types";

type SummaryStepProps = {
  symbol: string;
  items: Item[];
  people: Person[];
  result: SplitResult;
  onBack: () => void;
  onReset: () => void;
};

export function SummaryStep({ symbol, items, result, onBack, onReset }: SummaryStepProps) {
  const mark = symbol || "$";
  const covered =
    result.unassignedItemsCents === 0 && result.unallocatedExtrasCents === 0 && result.peopleTotalCents === result.billTotalCents;

  return (
    <section className="step-panel" aria-labelledby="summary-title">
      <div className="step-copy">
        <h2 id="summary-title">Who pays what</h2>
        <p>Tax and fees follow each person’s share of the items.</p>
      </div>

      <div className="summary-slips">
        {result.people.map((row) => {
          return (
            <section key={row.personId} className="person-slip">
              <h3 className="person-tab is-static">
                <span>{row.name || "Someone"}</span>
                <strong>{formatMoney(row.totalCents, mark)}</strong>
              </h3>
              {row.items.length === 0 && row.extras.length === 0 ? (
                <p className="empty">Nothing assigned.</p>
              ) : (
                <ul className="summary-lines">
                  {row.items.map((share) => {
                    const source = items.find((item) => item.id === share.itemId);
                    const fraction = shareLabel(share.weight, share.weightTotal);
                    const qty = source && source.quantity > 1 ? ` × ${source.quantity}` : "";
                    return (
                      <li key={share.itemId}>
                        <span>
                          {share.name || "Item"}
                          {qty}
                          {fraction ? <em> {fraction}</em> : null}
                        </span>
                        <span>{formatMoney(share.amountCents, mark)}</span>
                      </li>
                    );
                  })}
                  {row.extras.map((extra) => (
                    <li key={extra.extraId}>
                      <span>{extra.label}</span>
                      <span>{formatMoney(extra.amountCents, mark)}</span>
                    </li>
                  ))}
                  <li className="line-total">
                    <span>Total</span>
                    <span>{formatMoney(row.totalCents, mark)}</span>
                  </li>
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="receipt-box">
        <div className="total-row">
          <span>People together</span>
          <strong>{formatMoney(result.peopleTotalCents, mark)}</strong>
        </div>
        {result.unassignedItemsCents !== 0 && (
          <div className="total-row">
            <span>Still unassigned</span>
            <strong>{formatMoney(result.unassignedItemsCents, mark)}</strong>
          </div>
        )}
        {result.unallocatedExtrasCents !== 0 && (
          <div className="total-row">
            <span>Extras not split yet</span>
            <strong>{formatMoney(result.unallocatedExtrasCents, mark)}</strong>
          </div>
        )}
        <div className="total-row grand">
          <span>Bill total</span>
          <strong data-testid="grand-total">{formatMoney(result.billTotalCents, mark)}</strong>
        </div>
        {covered ? (
          <>
            <p className="ok">These totals add up to the bill exactly.</p>
            <InstallPrompt />
          </>
        ) : (
          <p className="flag" role="status">
            {result.unassignedItems.length > 0
              ? `Still open: ${result.unassignedItems.map((item) => item.name || "Item").join(", ")}. Assign them and the people will cover the full bill.`
              : "Assign the remaining extras by giving someone an item."}
          </p>
        )}
      </div>

      <div className="step-actions">
        <button type="button" className="button" onClick={onReset}>
          Start over
        </button>
        <button type="button" className="text-button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
