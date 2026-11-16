/**
 * How full the receipt reader bar is while the request is still out.
 * It starts moving immediately and keeps a slow climb for the whole wait,
 * but it never reaches the end. The bar finishes only when the read returns.
 */
export function pendingReadPercent(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return 99 * (1 - Math.exp(-seconds / 80));
}
