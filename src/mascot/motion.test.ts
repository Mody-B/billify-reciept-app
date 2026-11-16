import { describe, expect, it } from "vitest";
import { CONTROL_CLEARANCE, clampPoint, clearOfBox, floorBelowControls, flickVelocity, pickGoal, spawnPoint, stepSlide, stepToward } from "./motion";

describe("receipt mascot motion", () => {
  it("reads a flick from recent pointer samples and caps the speed", () => {
    expect(flickVelocity([{ x: 0, y: 0, t: 0 }], 50)).toEqual({ x: 0, y: 0 });
    const flick = flickVelocity(
      [
        { x: 0, y: 0, t: 0 },
        { x: 40, y: -20, t: 40 },
      ],
      40,
    );
    expect(flick.x).toBeCloseTo(1000);
    expect(flick.y).toBeCloseTo(-500);

    const fast = flickVelocity(
      [
        { x: 0, y: 0, t: 0 },
        { x: 200, y: 0, t: 20 },
      ],
      20,
    );
    expect(Math.hypot(fast.x, fast.y)).toBeCloseTo(1400);
  });

  it("slides with drag and bounces inside the page", () => {
    const bounds = { minX: 0, minY: 0, maxX: 200, maxY: 300 };
    const next = stepSlide({ x: 10, y: 20 }, { x: -400, y: 80 }, 0.05, bounds);
    expect(next.point.x).toBe(0);
    expect(next.velocity.x).toBeGreaterThan(0);
    expect(next.settled).toBe(false);

    const slow = stepSlide({ x: 40, y: 40 }, { x: 10, y: 8 }, 0.05, bounds);
    expect(slow.settled).toBe(true);
    expect(slow.velocity).toEqual({ x: 0, y: 0 });
  });

  it("walks toward a spot on the floor and then stops on it", () => {
    const step = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.5, 80, 1);
    expect(step.arrived).toBe(false);
    expect(step.point.x).toBeCloseTo(40);
    expect(step.facing).toBe(1);

    const done = stepToward({ x: 90, y: 10 }, { x: 100, y: 10 }, 0.5, 80, 1);
    expect(done.arrived).toBe(true);
    expect(done.point).toEqual({ x: 100, y: 10 });

    const left = stepToward({ x: 50, y: 0 }, { x: 10, y: 0 }, 0.1, 40, 1);
    expect(left.facing).toBe(-1);
  });

  it("spawns at the bottom and stays clear of the controls", () => {
    const bounds = floorBelowControls(280, { width: 390, height: 844 }, { width: 76, height: 108 });
    expect(bounds.minY).toBe(280 + CONTROL_CLEARANCE);
    expect(bounds.floorMinY).toBe(bounds.minY);
    expect(bounds.maxY).toBe(844 - 108);
    expect(spawnPoint(bounds)).toEqual({ x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY });

    const blocked = stepSlide({ x: 40, y: bounds.minY + 4 }, { x: 0, y: -900 }, 0.05, bounds);
    expect(blocked.point.y).toBe(bounds.minY);
    expect(clampPoint({ x: 20, y: 0 }, bounds).y).toBe(bounds.minY);
    expect(pickGoal(bounds, () => 0).y).toBeGreaterThanOrEqual(bounds.minY);
  });

  it("keeps the mascot out of the bottom-left ad", () => {
    const bounds = { minX: 8, minY: 360, maxX: 300, maxY: 720 };
    const size = { width: 76, height: 108 };
    const ad = { x: 0, y: 760, width: 200, height: 70 };
    const parked = clearOfBox({ x: 150, y: 720 }, bounds, size, ad);
    expect(parked.x).toBeGreaterThanOrEqual(ad.x + ad.width + 20);
    expect(parked.y).toBe(720);
    expect(clearOfBox({ x: 220, y: 500 }, bounds, size, ad)).toEqual({ x: 220, y: 500 });
  });

  it("picks the next stroll inside the open floor", () => {
    const goal = pickGoal({ minX: 0, minY: 0, maxX: 100, maxY: 200, floorMinY: 120 }, () => 0.5);
    expect(goal).toEqual({ x: 50, y: 160 });
  });
});
