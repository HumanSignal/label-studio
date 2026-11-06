import type { Counts, Finding } from "./types";

export type Delta = { file: string; rule: string; was: number; now: number };

const sortKeys = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));

export function countFindings(findings: Finding[]): Counts {
  const counts: Counts = {};
  for (const { file, rule } of findings) {
    counts[file] ??= {};
    counts[file][rule] = (counts[file][rule] ?? 0) + 1;
  }
  return sortKeys(Object.fromEntries(Object.entries(counts).map(([file, rules]) => [file, sortKeys(rules)])));
}

/**
 * A count that rises, or a file or rule absent from the baseline that now has a violation, is a regression.
 * A count that falls is an improvement. With `scope`, only those files are compared.
 */
export function compareToBaseline(
  baseline: Counts,
  current: Counts,
  scope?: string[],
): { regressions: Delta[]; improvements: Delta[] } {
  const files = scope ?? [...new Set([...Object.keys(baseline), ...Object.keys(current)])];
  const regressions: Delta[] = [];
  const improvements: Delta[] = [];
  for (const file of [...files].sort()) {
    const was = baseline[file] ?? {};
    const now = current[file] ?? {};
    for (const rule of [...new Set([...Object.keys(was), ...Object.keys(now)])].sort()) {
      const delta = { file, rule, was: was[rule] ?? 0, now: now[rule] ?? 0 };
      if (delta.now > delta.was) regressions.push(delta);
      else if (delta.now < delta.was) improvements.push(delta);
    }
  }
  return { regressions, improvements };
}

export const totalOf = (counts: Counts) =>
  Object.values(counts).reduce((sum, rules) => sum + Object.values(rules).reduce((a, b) => a + b, 0), 0);
