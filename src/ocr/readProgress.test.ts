import { describe, expect, it } from "vitest";
import { pendingReadPercent } from "./readProgress";

describe("pendingReadPercent", () => {
  it("starts empty and never finishes on its own", () => {
    expect(pendingReadPercent(0)).toBe(0);
    expect(pendingReadPercent(180_000)).toBeGreaterThan(80);
    expect(pendingReadPercent(180_000)).toBeLessThan(100);
  });

  it("keeps moving through a long read", () => {
    for (let second = 0; second < 90; second += 5) {
      const earlier = pendingReadPercent(second * 1000);
      const later = pendingReadPercent((second + 5) * 1000);
      expect(later).toBeGreaterThan(earlier);
    }
  });
});
