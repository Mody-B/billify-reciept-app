import { describe, expect, it, vi } from "vitest";
import { readReceipt } from "./readReceiptCore.js";

describe("readReceipt", () => {
  it("says the key is missing and does not call the vision service", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await readReceipt("data:image/jpeg;base64,abc", {});
    expect(result).toEqual({ status: 503, body: { error: "missing_key" } });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects a payload that is not an image data url", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await readReceipt("not-a-photo", { OPENROUTER_API_KEY: "present" });
    expect(result.status).toBe(400);
    expect(result.body.error).toBe("bad_image");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("ignores an OpenAI key and does not call OpenAI", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await readReceipt("data:image/jpeg;base64,abc", { OPENAI_API_KEY: "present" });
    expect(result).toEqual({ status: 503, body: { error: "missing_key" } });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("sends the photo to the free OpenRouter vision model", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"items":[{"name":"Soup","quantity":1,"priceCents":600}]}' } }],
      }),
    });
    const result = await readReceipt("data:image/jpeg;base64,abc", { OPENROUTER_API_KEY: "present" });
    expect(result.status).toBe(200);
    expect(result.body.items[0].name).toBe("Soup");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer present");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("nvidia/nemotron-3.5-super-vl:free");
    expect(body.messages[0].content).toContain("Do not translate, correct, or substitute");
    expect(body.messages[0].content).toContain("مياه معدنية");
    expect(body.messages[0].content).toContain("مايونيز");
    expect(body.messages[0].content).toContain("If a glyph is unclear");
    expect(body.messages[0].content).toContain("المجموع");
    expect(body.messages[0].content).toContain("flagged");
    expect(body.messages[0].content).toContain("١٢٫٥٠");
    expect(body.messages[1].content[0].text).toContain("Do not substitute");
    expect(url).not.toContain("openai.com");
    fetchSpy.mockRestore();
  });

  it("rejects guessed Arabic names when the transcript has the printed words", async () => {
    const transcript = `2.00 مياه معدنية
5.00 فطيرة
88.00 موز
111.00 تفاحة
222.00 حليب
Subtotal 428.00`;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transcript,
                items: [
                  { name: "مايونيز", priceCents: 200 },
                  { name: "بطاطا", priceCents: 500 },
                  { name: "هوس", priceCents: 8800 },
                  { name: "تناقدة", priceCents: 11100 },
                  { name: "دلايل", priceCents: 22200 },
                ],
                subtotalCents: 42800,
              }),
            },
          },
        ],
      }),
    });
    const result = await readReceipt("data:image/jpeg;base64,abc", { OPENROUTER_API_KEY: "present" });
    expect(result.status).toBe(200);
    expect(result.body.items.map((item) => item.name)).toEqual(["مياه معدنية", "فطيرة", "موز", "تفاحة", "حليب"]);
    expect(JSON.stringify(result.body.items)).not.toContain("مايونيز");
    expect(JSON.stringify(result.body.items)).not.toContain("بطاطا");
    expect(JSON.stringify(result.body.items)).not.toContain("تناقدة");
    fetchSpy.mockRestore();
  });
});
