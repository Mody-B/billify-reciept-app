export type Point = { x: number; y: number };

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type StageBounds = Bounds & { floorMinY: number };

export type Sample = Point & { t: number };

const FLICK_WINDOW_MS = 100;
const MAX_FLICK = 1400;

export function flickVelocity(samples: Sample[], now: number): Point {
  const recent = samples.filter((sample) => now - sample.t <= FLICK_WINDOW_MS && now - sample.t >= 0);
  if (recent.length < 2) return { x: 0, y: 0 };
  const start = recent[0];
  const end = recent[recent.length - 1];
  const dt = (end.t - start.t) / 1000;
  if (dt < 0.012) return { x: 0, y: 0 };
  let x = (end.x - start.x) / dt;
  let y = (end.y - start.y) / dt;
  const speed = Math.hypot(x, y);
  if (speed > MAX_FLICK) {
    const scale = MAX_FLICK / speed;
    x *= scale;
    y *= scale;
  }
  return { x, y };
}

export function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  };
}

export function stepSlide(
  point: Point,
  velocity: Point,
  dt: number,
  bounds: Bounds,
): { point: Point; velocity: Point; settled: boolean } {
  const drag = Math.exp(-3.4 * dt);
  let vx = velocity.x * drag;
  let vy = velocity.y * drag;
  let x = point.x + vx * dt;
  let y = point.y + vy * dt;
  if (x < bounds.minX) {
    x = bounds.minX;
    vx = Math.abs(vx) * 0.45;
  } else if (x > bounds.maxX) {
    x = bounds.maxX;
    vx = -Math.abs(vx) * 0.45;
  }
  if (y < bounds.minY) {
    y = bounds.minY;
    vy = Math.abs(vy) * 0.45;
  } else if (y > bounds.maxY) {
    y = bounds.maxY;
    vy = -Math.abs(vy) * 0.45;
  }
  const settled = Math.hypot(vx, vy) < 36;
  if (settled) {
    vx = 0;
    vy = 0;
  }
  return { point: { x, y }, velocity: { x: vx, y: vy }, settled };
}

export function stepToward(
  point: Point,
  goal: Point,
  dt: number,
  speed: number,
  facing: 1 | -1,
): { point: Point; arrived: boolean; facing: 1 | -1 } {
  const dx = goal.x - point.x;
  const dy = goal.y - point.y;
  const dist = Math.hypot(dx, dy);
  const nextFacing: 1 | -1 = dx < -1 ? -1 : dx > 1 ? 1 : facing;
  if (dist < 1 || dist <= speed * dt) {
    return { point: { x: goal.x, y: goal.y }, arrived: true, facing: nextFacing };
  }
  const step = speed * dt;
  return {
    point: { x: point.x + (dx / dist) * step, y: point.y + (dy / dist) * step },
    arrived: false,
    facing: nextFacing,
  };
}

export function pickGoal(bounds: StageBounds, random: () => number = Math.random): Point {
  const floorTop = Math.min(Math.max(bounds.floorMinY, bounds.minY), bounds.maxY);
  return {
    x: bounds.minX + random() * Math.max(0, bounds.maxX - bounds.minX),
    y: floorTop + random() * Math.max(0, bounds.maxY - floorTop),
  };
}
