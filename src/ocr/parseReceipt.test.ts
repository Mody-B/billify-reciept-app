import { describe, expect, it } from "vitest";
import { parseReceipt, parseReceiptText, receiptFromVision, type OcrWord } from "./parseReceipt";

function word(text: string, x: number, y: number, width = 40): OcrWord {
  return { text, x0: x, y0: y, x1: x + width, y1: y + 16 };
}

describe("parseReceipt", () => {
  it("reads items, pulls tax tip and service out, and keeps the total", () => {
    const words = [
      word("Joe's", 20, 0, 70),
      word("Diner", 100, 0, 70),
      word("Burger", 20, 40, 80),
      word("14.50", 760, 40, 50),
      word("2", 12, 80, 16),
      word("Fries", 80, 80, 60),
      word("7.00", 760, 80, 50),
      word("2x", 12, 120, 24),
      word("Soda", 80, 120, 50),
      word("3.00", 760, 120, 50),
      word("Subtotal", 20, 180, 90),
      word("24.50", 760, 180, 50),
      word("Tax", 20, 220, 40),
      word("2.00", 760, 220, 50),
      word("Service", 20, 260, 70),
      word("charge", 100, 260, 70),
      word("3.00", 760, 260, 50),
      word("Tip", 20, 300, 40),
      word("5.00", 760, 300, 50),
      word("T0tal", 20, 340, 60),
      word("34.50", 760, 340, 50),
      word("Thank", 20, 400, 60),
      word("you", 90, 400, 40),
    ];

    const parsed = parseReceipt(words);
    expect(parsed.items).toEqual([
      { name: "Burger", quantity: 1, priceCents: 1450 },
      { name: "Fries", quantity: 2, priceCents: 700 },
      { name: "Soda", quantity: 2, priceCents: 300 },
    ]);
    expect(parsed.subtotalCents).toBe(2450);
    expect(parsed.taxCents).toBe(200);
    expect(parsed.serviceCents).toBe(300);
    expect(parsed.tipCents).toBe(500);
    expect(parsed.totalCents).toBe(3450);
    expect(parsed.items.reduce((sum, item) => sum + item.priceCents, 0) + 200 + 300 + 500).toBe(3450);
  });

  it("uses the extended price when a line has quantity, unit price, and total", () => {
    const words = [
      word("Nachos", 20, 0, 70),
      word("2", 220, 0, 16),
      word("@", 250, 0, 16),
      word("3.50", 280, 0, 40),
      word("7.00", 760, 0, 50),
    ];
    expect(parseReceipt(words).items).toEqual([{ name: "Nachos", quantity: 2, priceCents: 700 }]);
  });

  it("treats discounts as negative extras and comma decimals as cents", () => {
    const words = [
      word("Coffee", 20, 0, 70),
      word("€4,50", 760, 0, 50),
      word("Coupon", 20, 40, 70),
      word("(1,00)", 760, 40, 60),
      word("Bag", 20, 80, 40),
      word("fee", 70, 80, 40),
      word("0,25", 760, 80, 40),
      word("Total", 20, 120, 50),
      word("€3,75", 760, 120, 50),
    ];
    const parsed = parseReceipt(words);
    expect(parsed.currencySymbol).toBe("€");
    expect(parsed.items).toEqual([{ name: "Coffee", quantity: 1, priceCents: 450 }]);
    expect(parsed.otherExtras).toEqual([
      { label: "Coupon", amountCents: -100 },
      { label: "Bag fee", amountCents: 25 },
    ]);
    expect(parsed.totalCents).toBe(375);
  });

  it("infers tax from subtotal and total when the tax line is missing", () => {
    const parsed = parseReceiptText(`Burger 10.00\nSubtotal 10.00\nTotal 10.80`);
    expect(parsed.items).toEqual([{ name: "Burger", quantity: 1, priceCents: 1000 }]);
    expect(parsed.taxCents).toBe(80);
    expect(parsed.totalCents).toBe(1080);
  });

  it("does not turn the subtotal or a thank-you line into items", () => {
    const parsed = parseReceiptText("Thanks\nSoup 6.00\nSubtotal 6.00\nTotal 6.00");
    expect(parsed.items.map((item) => item.name)).toEqual(["Soup"]);
  });

  it("joins wrapped names and reads quantity prefixes", () => {
    const parsed = parseReceiptText(`JOE'S DINER
123 Main Street
(555) 010-2000
GRILLED
CHICKEN SANDWICH 14.50
2 ICED
TEA 6.00
QTY 3 Wings 12.00
2x Fries 7.00`);
    expect(parsed.items).toEqual([
      { name: "GRILLED CHICKEN SANDWICH", quantity: 1, priceCents: 1450 },
      { name: "ICED TEA", quantity: 2, priceCents: 600 },
      { name: "Wings", quantity: 3, priceCents: 1200 },
      { name: "Fries", quantity: 2, priceCents: 700 },
    ]);
  });

  it("keeps tax, fees, and the card slip out of the item list", () => {
    const parsed = parseReceiptText(`Burger 10.00
NO ONION
Sales Tax 0.80
NY State Tax 0.40
Bag fee 0.10
Subtotal 10.00
Amount Due 11.30
VISA ****4242
AUTH 839201
Thank you`);
    expect(parsed.items).toEqual([{ name: "Burger NO ONION", quantity: 1, priceCents: 1000 }]);
    expect(parsed.taxCents).toBe(120);
    expect(parsed.otherExtras).toEqual([{ label: "Bag fee", amountCents: 10 }]);
    expect(parsed.totalCents).toBe(1130);
    expect(parsed.subtotalCents).toBe(1000);
  });

  it("moves a tax line the model put in items back into tax", () => {
    const parsed = receiptFromVision({
      currencySymbol: "$",
      items: [
        { name: "Burger", quantity: 1, priceCents: 1000 },
        { name: "Sales Tax", quantity: 1, priceCents: 80 },
      ],
      taxCents: 0,
      tipCents: 150,
      otherFees: [{ label: "Delivery fee", amountCents: 200 }],
      totalCents: 1430,
    });
    expect(parsed?.items).toEqual([{ name: "Burger", quantity: 1, priceCents: 1000 }]);
    expect(parsed?.taxCents).toBe(80);
    expect(parsed?.tipCents).toBe(150);
    expect(parsed?.otherExtras).toEqual([{ label: "Delivery fee", amountCents: 200 }]);
    expect(parsed?.totalCents).toBe(1430);
  });
});
