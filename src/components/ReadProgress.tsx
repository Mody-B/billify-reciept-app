import { useEffect, useRef, useState } from "react";
import { pendingReadPercent } from "../ocr/readProgress";

const FINISH_MS = 420;

export function ReadProgress({ active }: { active: boolean }) {
  const [percent, setPercent] = useState(0);
  const [holding, setHolding] = useState(false);
  const percentRef = useRef(0);
  const liveRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    let hideTimer = 0;

    const paint = (next: number) => {
      percentRef.current = next;
      setPercent(next);
    };

    if (active) {
      const started = performance.now();
      liveRef.current = true;
      setHolding(true);
      const tick = (now: number) => {
        paint(pendingReadPercent(now - started));
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }

    if (!liveRef.current) return;
    const from = percentRef.current;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / FINISH_MS);
      paint(from + (100 - from) * t);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      hideTimer = window.setTimeout(() => {
        liveRef.current = false;
        paint(0);
        setHolding(false);
      }, 180);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
    };
  }, [active]);

  if (!active && !holding) return null;

  return (
    <div className="reader" role="status" data-testid="read-progress">
      <div className="reader-top">
        <strong>Reading the receipt</strong>
      </div>
      <div className="reader-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
