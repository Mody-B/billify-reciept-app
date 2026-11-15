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
    const result = await readReceipt("not-a-photo", { OPENAI_API_KEY: "present" });
    expect(result.status).toBe(400);
    expect(result.body.error).toBe("bad_image");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
