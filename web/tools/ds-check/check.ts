/** Counts the changed files now and at the merge base with the same rules, and compares them per file and rule. */
import fs from "node:fs";
import path from "node:path";
import { compareToBaseline, countFindings, type Delta } from "./baseline";
import type { Change } from "./git";
import { inScope, type ScanContext, scanSource } from "./scan";
import type { Counts, Finding } from "./types";

export type Lint = (webRoot: string, paths: string[]) => Finding[];

/** Base versions are written under the web root so Biome applies the same biome.json and plugin path filters. */
export const MIRROR_PREFIX = ".ds-check-base-";
const STALE_AFTER_MS = 10 * 60 * 1000;

/** Removes mirrors older than ten minutes, left behind when a run was killed; a concurrent live run keeps its own. */
export function removeStaleMirrors(webRoot: string, now = Date.now()): string[] {
  const removed: string[] = [];
  for (const name of fs.readdirSync(webRoot)) {
    if (!name.startsWith(MIRROR_PREFIX)) continue;
    const abs = path.join(webRoot, name);
    if (now - fs.statSync(abs).mtimeMs < STALE_AFTER_MS) continue;
    fs.rmSync(abs, { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}

const defaultMirror = {
  write: (abs: string, content: string) => {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  },
  remove: (absDir: string) => fs.rmSync(absDir, { recursive: true, force: true }),
};

export function checkChanges({
  webRoot,
  changes,
  ctx,
  readCurrent,
  readBase,
  lint,
  mirror = defaultMirror,
}: {
  webRoot: string;
  changes: Change[];
  ctx: ScanContext;
  readCurrent: (file: string) => string;
  readBase: (file: string) => string | null;
  lint: Lint;
  mirror?: typeof defaultMirror;
}): {
  files: string[];
  findings: Finding[];
  current: Counts;
  base: Counts;
  regressions: Delta[];
  improvements: Delta[];
} {
  const inScopeChanges = changes.filter((change) => inScope(change.file));
  const files = inScopeChanges.map((change) => change.file);

  const findings = files.flatMap((file) => scanSource(path.join(webRoot, file), readCurrent(file), ctx));
  findings.push(...lint(webRoot, files));

  const mirrorDir = `${MIRROR_PREFIX}${process.pid}-${Date.now()}`;
  const toCurrent = new Map<string, string>();
  const baseFindings: Finding[] = [];
  try {
    for (const { file, baseFile } of inScopeChanges) {
      if (!baseFile) continue;
      const content = readBase(baseFile);
      if (content === null) continue;
      toCurrent.set(baseFile, file);
      baseFindings.push(...scanSource(path.join(webRoot, baseFile), content, ctx));
      mirror.write(path.join(webRoot, mirrorDir, baseFile), content);
    }
    const mirrored = [...toCurrent.keys()].map((baseFile) => `${mirrorDir}/${baseFile}`);
    for (const finding of lint(webRoot, mirrored)) {
      baseFindings.push({ ...finding, file: finding.file.slice(mirrorDir.length + 1) });
    }
  } finally {
    mirror.remove(path.join(webRoot, mirrorDir));
  }

  const current = countFindings(findings);
  const base = countFindings(
    baseFindings.map((finding) => ({ ...finding, file: toCurrent.get(finding.file) ?? finding.file })),
  );
  return { files, findings, current, base, ...compareToBaseline(base, current, files) };
}
