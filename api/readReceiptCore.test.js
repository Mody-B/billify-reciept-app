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
    expect(body.messages[0].content).toContain("Do not translate");
    expect(body.messages[0].content).toContain("المجموع");
    expect(body.messages[0].content).toContain("flagged");
    expect(body.messages[0].content).toContain("١٢٫٥٠");
    expect(url).not.toContain("openai.com");
    fetchSpy.mockRestore();
  });
});
