/**
 * Live peso formatting for text inputs, ported from the prototype's
 * `moneyLive()` / `moneyFmt()`. Kept in packages/ui (not packages/core)
 * because it is input-field behaviour and ADR-0002 forbids ui → core imports.
 */

export type LiveMoney = {
  /** What the field should show while typing, e.g. "1,234,567.89". */
  text: string;
  /** The numeric peso value, or null when the field is empty. */
  value: number | null;
};

/**
 * Strips anything but digits and one dot, keeps at most two decimals, drops
 * leading zeros and inserts thousands separators.
 */
export function formatMoneyLive(raw: string): LiveMoney {
  const s = raw.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  let intPart = dot >= 0 ? s.slice(0, dot) : s;
  const decPart = dot >= 0 ? s.slice(dot + 1).replace(/\./g, "").slice(0, 2) : null;
  intPart = intPart.replace(/^0+(?=\d)/, "");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const text = withCommas + (decPart !== null ? `.${decPart}` : "");
  const value = s === "" || s === "." ? null : parseFloat(`${intPart || "0"}${decPart ? `.${decPart}` : ""}`);
  return { text, value };
}

/** Two-decimal display used on blur, e.g. 5000 → "5,000.00"; null → "". */
export function formatMoneyFixed(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "";
  return value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Where the caret belongs after reformatting: just after the same count of
 * significant characters (digits and dot) that preceded it before.
 */
export function caretAfterFormat(before: string, caret: number, after: string): number {
  const significant = before.slice(0, caret).replace(/[^0-9.]/g, "").length;
  let i = 0;
  let seen = 0;
  while (i < after.length && seen < significant) {
    if (/[0-9.]/.test(after.charAt(i))) seen++;
    i++;
  }
  return i;
}
