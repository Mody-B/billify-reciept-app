import { describe, expect, it } from "vitest";
import { slipStamp } from "./slipDate";

describe("slipStamp", () => {
  it("keeps the visible day and the datetime on the same local date around midnight", () => {
    const now = new Date(2026, 10, 23, 0, 15);
    const stamp = slipStamp(now);
    expect(stamp.iso).toBe("2026-11-23");
    expect(stamp.label).toContain("23");
    expect(stamp.label).toContain("2026");
    const utcDay = now.toISOString().slice(0, 10);
    if (utcDay !== "2026-11-23") expect(stamp.iso).not.toBe(utcDay);
  });
});
