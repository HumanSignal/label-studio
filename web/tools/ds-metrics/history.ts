/** The series on main: one NDJSON line per merge commit, kept on the orphan branch `ds-metrics`. */
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

/** Appends one line unless the commit is already in the series. Returns whether a line was written. */
export function appendSnapshot(file: string, snapshot: Snapshot): boolean {
  if (readHistory(file).some((s) => s.commit === snapshot.commit)) return false;
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
  const glue = existing && !existing.endsWith("\n") ? "\n" : "";
  fs.appendFileSync(file, `${glue}${JSON.stringify(snapshot)}\n`);
  return true;
}
