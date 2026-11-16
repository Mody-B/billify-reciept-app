import { useEffect, useRef, useState } from "react";
import { clearOfBox, flickVelocity, floorBelowControls, pickGoal, spawnPoint, stepSlide, stepToward, type Box, type Sample, type StageBounds } from "../mascot/motion";

const WIDTH = 76;
const HEIGHT = 108;
const WALK_SPEED = 68;

type Mode = "walk" | "hold" | "fly";

type Body = {
  point: { x: number; y: number };
  velocity: { x: number; y: number };
  goal: { x: number; y: number };
  facing: 1 | -1;
  mode: Mode;
  rot: number;
  spin: number;
  pauseUntil: number;
};

type Pose = {
  x: number;
  y: number;
  facing: 1 | -1;
  mode: Mode;
  rot: number;
};

function prefersStill() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ReceiptMascot() {
  const nodeRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<StageBounds | null>(null);
  const obstacleRef = useRef<Box | null>(null);
  const bodyRef = useRef<Body>({
    point: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    facing: 1,
    mode: "walk",
    rot: 0,
    spin: 0,
    pauseUntil: 0,
  });
  const grabRef = useRef({ dx: 0, dy: 0 });
  const samplesRef = useRef<Sample[]>([]);
  const placedRef = useRef(false);
  const [pose, setPose] = useState<Pose | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    const stage = node?.parentElement;
    if (!node || !stage) return;

    const measure = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (width < WIDTH || height < HEIGHT) return;
      const stageRect = stage.getBoundingClientRect();
      let controlBottom = 0;
      stage.querySelectorAll("button, a").forEach((control) => {
        if (control.closest(".home-support")) return;
        const bottom = control.getBoundingClientRect().bottom - stageRect.top;
        if (bottom > controlBottom) controlBottom = bottom;
      });
      const ad = stage.querySelector(".home-support");
      obstacleRef.current =
        ad instanceof HTMLElement
          ? {
              x: ad.getBoundingClientRect().left - stageRect.left,
              y: ad.getBoundingClientRect().top - stageRect.top,
              width: ad.offsetWidth,
              height: ad.offsetHeight,
            }
          : null;
      const bounds: StageBounds = floorBelowControls(controlBottom, { width, height }, { width: WIDTH, height: HEIGHT });
      boundsRef.current = bounds;
      const body = bodyRef.current;
      const place = (point: { x: number; y: number }) => clearOfBox(point, bounds, { width: WIDTH, height: HEIGHT }, obstacleRef.current);
      if (!placedRef.current) {
        placedRef.current = true;
        body.point = place(spawnPoint(bounds));
        body.goal = place(pickGoal(bounds));
        body.pauseUntil = performance.now() + 700;
      } else {
        body.point = place(body.point);
        body.goal = place(body.goal);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const ad = stage.querySelector(".home-support");
    if (ad) observer.observe(ad);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const bounds = boundsRef.current;
      const body = bodyRef.current;
      const place = (point: { x: number; y: number }) =>
        bounds ? clearOfBox(point, bounds, { width: WIDTH, height: HEIGHT }, obstacleRef.current) : point;
      if (bounds && body.mode === "fly") {
        const next = stepSlide(body.point, body.velocity, dt, bounds);
        const cleared = place(next.point);
        if (cleared.x !== next.point.x) next.velocity.x = 0;
        if (cleared.y !== next.point.y) next.velocity.y = 0;
        body.point = cleared;
        body.velocity = next.velocity;
        body.rot += body.spin * dt;
        body.spin *= Math.exp(-2.4 * dt);
        if (next.settled) {
          body.mode = "walk";
          body.rot = 0;
          body.spin = 0;
          body.pauseUntil = now + 650;
          body.goal = pickGoal(bounds);
        }
      } else if (bounds && body.mode === "walk" && !prefersStill()) {
        if (now >= body.pauseUntil) {
          const next = stepToward(body.point, body.goal, dt, WALK_SPEED, body.facing);
          body.point = place(next.point);
          body.facing = next.facing;
          if (next.arrived) {
            body.pauseUntil = now + 900;
            body.goal = place(pickGoal(bounds));
          }
        }
      }
      setPose({
        x: body.point.x,
        y: body.point.y,
        facing: body.facing,
        mode: body.mode,
        rot: body.rot,
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  function stageBox() {
    return nodeRef.current?.parentElement?.getBoundingClientRect() ?? null;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const box = stageBox();
    const bounds = boundsRef.current;
    if (!box || !bounds) return;
    const body = bodyRef.current;
    grabRef.current = {
      dx: event.clientX - box.left - body.point.x,
      dy: event.clientY - box.top - body.point.y,
    };
    body.mode = "hold";
    body.velocity = { x: 0, y: 0 };
    body.spin = 0;
    body.rot = 0;
    samplesRef.current = [{ x: event.clientX, y: event.clientY, t: performance.now() }];
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const body = bodyRef.current;
    if (body.mode !== "hold") return;
    const box = stageBox();
    const bounds = boundsRef.current;
    if (!box || !bounds) return;
    body.point = clearOfBox(
      {
        x: event.clientX - box.left - grabRef.current.dx,
        y: event.clientY - box.top - grabRef.current.dy,
      },
      bounds,
      { width: WIDTH, height: HEIGHT },
      obstacleRef.current,
    );
    const samples = samplesRef.current;
    samples.push({ x: event.clientX, y: event.clientY, t: performance.now() });
    if (samples.length > 8) samples.shift();
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const body = bodyRef.current;
    if (body.mode !== "hold") return;
    const velocity = flickVelocity(samplesRef.current, performance.now());
    if (Math.hypot(velocity.x, velocity.y) > 90) {
      body.mode = "fly";
      body.velocity = velocity;
      body.spin = Math.max(-280, Math.min(280, velocity.x * 0.12));
    } else {
      body.mode = "walk";
      body.velocity = { x: 0, y: 0 };
      body.pauseUntil = performance.now() + 500;
      if (boundsRef.current) {
        body.goal = clearOfBox(pickGoal(boundsRef.current), boundsRef.current, { width: WIDTH, height: HEIGHT }, obstacleRef.current);
      }
    }
    samplesRef.current = [];
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const walking = pose?.mode === "walk";
  return (
    <div
      ref={nodeRef}
      className={`home-mascot${pose ? ` is-${pose.mode}` : ""}${walking ? " is-walking" : ""}`}
      data-testid="receipt-mascot"
      aria-hidden="true"
      style={{
        transform: pose ? `translate(${pose.x}px, ${pose.y}px) rotate(${pose.rot}deg)` : undefined,
        visibility: pose ? "visible" : "hidden",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className={`mascot-turn${pose?.facing === -1 ? " is-left" : ""}`}>
        <svg className="mascot-svg" viewBox="0 0 80 112" width="76" height="108">
          <ellipse className="mascot-shadow" cx="40" cy="108" rx="16" ry="3.2" />
          <g transform="translate(28,78)">
            <g className="leg leg-l">
              <line className="limb-halo" x1="0" y1="0" x2="-1" y2="20" />
              <ellipse className="limb-halo" cx="-1" cy="23" rx="7.2" ry="4.2" />
              <line x1="0" y1="0" x2="-1" y2="20" />
              <ellipse cx="-1" cy="23" rx="6" ry="3" />
            </g>
          </g>
          <g transform="translate(52,78)">
            <g className="leg leg-r">
              <line className="limb-halo" x1="0" y1="0" x2="1" y2="20" />
              <ellipse className="limb-halo" cx="1" cy="23" rx="7.2" ry="4.2" />
              <line x1="0" y1="0" x2="1" y2="20" />
              <ellipse cx="1" cy="23" rx="6" ry="3" />
            </g>
          </g>
          <g transform="translate(20,40)">
            <g className="arm arm-l">
              <line className="limb-halo" x1="0" y1="0" x2={pose?.mode === "hold" ? -10 : -12} y2={pose?.mode === "hold" ? -26 : 18} />
              <circle className="limb-halo" cx={pose?.mode === "hold" ? -11 : -13} cy={pose?.mode === "hold" ? -30 : 21} r="4.6" />
              <line x1="0" y1="0" x2={pose?.mode === "hold" ? -10 : -12} y2={pose?.mode === "hold" ? -26 : 18} />
              <circle cx={pose?.mode === "hold" ? -11 : -13} cy={pose?.mode === "hold" ? -30 : 21} r="3.1" />
            </g>
          </g>
          <g transform="translate(60,40)">
            <g className="arm arm-r">
              <line className="limb-halo" x1="0" y1="0" x2={pose?.mode === "hold" ? 10 : 12} y2={pose?.mode === "hold" ? -26 : 18} />
              <circle className="limb-halo" cx={pose?.mode === "hold" ? 11 : 13} cy={pose?.mode === "hold" ? -30 : 21} r="4.6" />
              <line x1="0" y1="0" x2={pose?.mode === "hold" ? 10 : 12} y2={pose?.mode === "hold" ? -26 : 18} />
              <circle cx={pose?.mode === "hold" ? 11 : 13} cy={pose?.mode === "hold" ? -30 : 21} r="3.1" />
            </g>
          </g>
          <path
            className="mascot-paper"
            d="M20 16l4-5 6 5 6-6 6 6 6-6 6 6 6-5 2 4v50l-4 8-6-8-6 10-6-10-6 9-6-9-6 8-4-8v-50z"
          />
          <g className="mascot-print">
            <circle cx="28" cy="24" r="1.2" />
            <circle cx="36" cy="24" r="1.2" />
            <circle cx="44" cy="24" r="1.2" />
            <circle cx="52" cy="24" r="1.2" />
            <path d="M30 58h22M32 63h14" />
          </g>
          <path className="mascot-total" d="M34 68h12" />
          <g className="mascot-face">
            <circle cx="33" cy="40" r="2.15" />
            <circle cx="47" cy="40" r="2.15" />
            <path d="M33 49q7 7 14 0" />
          </g>
        </svg>
      </div>
    </div>
  );
}
