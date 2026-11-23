import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReviewStep } from "./ReviewStep";

describe("review list", () => {
  it("shows an uncertain Arabic name and a check flag instead of hiding the line", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewStep, {
        symbol: "$",
        fractionDigits: 2,
        currency: "USD",
        items: [
          {
            id: "water",
            name: "مياه معدنية",
            quantity: 1,
            priceCents: 200,
            assignments: [],
            shareMode: "even",
            nameUncertain: true,
          },
        ],
        taxCents: 0,
        tipCents: 0,
        serviceCents: 0,
        otherExtras: [],
        detectedTotalCents: null,
        photoUrl: null,
        reading: false,
        note: null,
        onCurrency: () => undefined,
        onItem: () => undefined,
        onRemoveItem: () => undefined,
        onAddItem: () => undefined,
        onTax: () => undefined,
        onTip: () => undefined,
        onService: () => undefined,
        onExtra: () => undefined,
        onRemoveExtra: () => undefined,
        onAddExtra: () => undefined,
        onBack: () => undefined,
        onNext: () => undefined,
      }),
    );
    expect(html).toContain("مياه معدنية");
    expect(html).toContain("Check this line.");
    expect(html).not.toContain("مايونيز");
  });
});
