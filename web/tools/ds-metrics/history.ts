/** The series on main: one NDJSON line per commit (label-studio-sandbox keeps it as ds-metrics/data.ndjson). */
import fs from "node:fs";
import type { Snapshot } from "./snapshot";

export function readHistory(file: string): Snapshot[] {
  if (!fs.existsSync(file)) return [];
  const lines = fs
    .readFileSync(file, "utf-8")
    .replace(/^\uFEFF/, "")
    .split("\n");
  const out: Snapshot[] = [];
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    try {
      out.push(JSON.parse(line) as Snapshot);
    } catch (error) {
      throw new Error(`${file} line ${i + 1} is not a snapshot: ${(error as Error).message}`);
    }
  });
  return out;
}

/** Writes the snapshot over the line of the same commit, or appends it. Returns which one it did. */
export function upsertSnapshot(file: string, snapshot: Snapshot): "replaced" | "appended" {
  const history = readHistory(file);
  const at = history.findIndex((s) => s.commit === snapshot.commit);
  if (at === -1) {
    appendSnapshot(file, snapshot);
    return "appended";
  }
  history[at] = snapshot;
  fs.writeFileSync(file, history.map((s) => `${JSON.stringify(s)}\n`).join(""));
  return "replaced";
}

/** Whether the snapshot was measured with every rule of `rules`; points without the field never were. */
export const measuredWith = (snapshot: Snapshot, rules: readonly string[]) =>
  !!snapshot.measured_rules && rules.every((rule) => snapshot.measured_rules?.includes(rule));

/** The commits measured without one of `rules`, oldest first: the points a new rule leaves stale. */
export function staleCommits(history: Snapshot[], rules: readonly string[]): string[] {
  return [...history]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .filter((s) => !measuredWith(s, rules))
    .map((s) => s.commit);
}

/** Appends one line unless the commit is already in the series. Returns whether a line was written. */
export function appendSnapshot(file: string, snapshot: Snapshot): boolean {
  if (readHistory(file).some((s) => s.commit === snapshot.commit)) return false;
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
  const glue = existing && !existing.endsWith("\n") ? "\n" : "";
  fs.appendFileSync(file, `${glue}${JSON.stringify(snapshot)}\n`);
  return true;
}
