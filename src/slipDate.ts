/** Visible slip date and the datetime value, both from the local calendar day. */
export function slipStamp(now: Date): { iso: string; label: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const label = new Date(year, month, day)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  return { iso, label };
}
