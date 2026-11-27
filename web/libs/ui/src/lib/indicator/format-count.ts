const UNITS = [
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "k" },
] as const;

/**
 * Shortens a count so it fits a small container: 999 stays 999, 1,200 becomes 1.2k, 100,000 becomes 100k and
 * 2,500,000 becomes 2.5M. One decimal, dropped when it is zero, truncated so a count never reads higher than it is.
 */
export function formatCount(count: number): string {
  if (!Number.isFinite(count)) return "";
  const sign = count < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(count));
  const unit = UNITS.find(({ value }) => abs >= value);
  if (!unit) return `${sign}${abs}`;
  const scaled = Math.floor((abs / unit.value) * 10) / 10;
  return `${sign}${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}${unit.suffix}`;
}
