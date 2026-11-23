import { describe, expect, it } from "vitest";
import { lineTotalCents } from "../money";
import { parseReceiptText, receiptFromVision } from "./parseReceipt";

const SYRIAN = `مطعم الياسمين
بيتزا ٢ ٨٬٠٠٠ ١٦٬٠٠٠ ل.س
سلطة ١ ٦٬٠٠٠ ٦٬٠٠٠
مشروبات ٣ ٢٬٠٠٠ ٦٬٠٠٠
المجموع ٢٨٬٠٠٠
الضريبة ٢٬٠٠٠
الخدمة ١٬٠٠٠
المجموع الكلي ٣١٬٠٠٠ ل.س`;

const MIXED_SAR = `Chicken Burger 1 40.00 40.00
عصير برتقال 2 8.00 16.00
المجموع 56.00
ضريبة القيمة المضافة 15% 8.40
الإجمالي 64.40 ر.س`;

const JORDAN = `منسف 2 4.500 9.000
حمص 1 1.250 1.250
المجموع 10.250
الضريبة 0.820
المطلوب 11.070 د.أ`;

const DISCOUNT = `شاورما 2 15.00 30.00
خصم ٥٫٠٠
الإجمالي 25.00`;

function itemSum(items: { quantity: number; priceCents: number }[]): number {
  return items.reduce((sum, item) => sum + lineTotalCents(item.quantity, item.priceCents), 0);
}

describe("Arabic receipts", () => {
  it("reads a Syrian receipt in Eastern Arabic digits and matches the printed total", () => {
    const parsed = parseReceiptText(SYRIAN);
    expect(parsed.language).toBe("ar");
    expect(parsed.currencySymbol).toBe("ل.س");
    expect(parsed.items).toEqual([
      { name: "بيتزا", quantity: 2, priceCents: 8000 },
      { name: "سلطة", quantity: 1, priceCents: 6000 },
      { name: "مشروبات", quantity: 3, priceCents: 2000 },
    ]);
    expect(parsed.items[0].name).toBe("بيتزا");
    expect(parsed.subtotalCents).toBe(28000);
    expect(parsed.taxCents).toBe(2000);
    expect(parsed.serviceCents).toBe(1000);
    expect(parsed.totalCents).toBe(31000);
    expect(itemSum(parsed.items) + 2000 + 1000).toBe(parsed.totalCents);
  });

  it("reads a mixed Arabic and English Saudi receipt with 15% VAT", () => {
    const parsed = parseReceiptText(MIXED_SAR);
    expect(parsed.language).toBe("mixed");
    expect(parsed.currencySymbol).toBe("ر.س");
    expect(parsed.items.map((item) => item.name)).toEqual(["Chicken Burger", "عصير برتقال"]);
    expect(itemSum(parsed.items)).toBe(5600);
    expect(parsed.subtotalCents).toBe(5600);
    expect(parsed.taxCents).toBe(840);
    expect(parsed.totalCents).toBe(6440);
    expect(itemSum(parsed.items) + (parsed.taxCents ?? 0)).toBe(parsed.totalCents);
  });

  it("reads Jordanian fils with three decimal places", () => {
    const parsed = parseReceiptText(JORDAN);
    expect(parsed.currencySymbol).toBe("د.أ");
    expect(parsed.items).toEqual([
      { name: "منسف", quantity: 2, priceCents: 4500 },
      { name: "حمص", quantity: 1, priceCents: 1250 },
    ]);
    expect(parsed.subtotalCents).toBe(10250);
    expect(parsed.taxCents).toBe(820);
    expect(parsed.totalCents).toBe(11070);
    expect(itemSum(parsed.items) + 820).toBe(11070);
  });

  it("treats a discount line as a negative extra, not an item", () => {
    const parsed = parseReceiptText(DISCOUNT);
    expect(parsed.items).toEqual([{ name: "شاورما", quantity: 2, priceCents: 1500 }]);
    expect(parsed.otherExtras).toEqual([{ label: "خصم", amountCents: -500 }]);
    expect(parsed.totalCents).toBe(2500);
    expect(itemSum(parsed.items) + (parsed.otherExtras[0]?.amountCents ?? 0)).toBe(2500);
  });

  it("flags a line whose quantity and printed total disagree instead of guessing", () => {
    const parsed = parseReceiptText("بيتزا 2 18.00 30.00");
    expect(parsed.items).toEqual([{ name: "بيتزا", quantity: 2, priceCents: 1800, flagged: true, lineTotalCents: 3000 }]);
    expect(parsed.items[0].quantity).toBe(2);
    expect(parsed.items[0].priceCents).not.toBe(1500);
  });

  it("keeps an Arabic vision line in the original language", () => {
    const parsed = receiptFromVision({
      language: "ar",
      currency: "AED",
      items: [{ name: "قهوة", quantity: 2, unitPriceMinor: 1500, lineTotalMinor: 3000, flagged: false }],
      taxMinor: 150,
      totalMinor: 3150,
    });
    expect(parsed?.language).toBe("ar");
    expect(parsed?.currencySymbol).toBe("د.إ");
    expect(parsed?.items).toEqual([{ name: "قهوة", quantity: 2, priceCents: 1500 }]);
    expect(parsed?.taxCents).toBe(150);
    expect(parsed?.totalCents).toBe(3150);
    expect(itemSum(parsed?.items ?? []) + 150).toBe(3150);
  });
});
