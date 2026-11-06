/** Runs Biome and keeps the design-system plugin diagnostics (messages prefixed `[ds/<rule>]`). */
import fs from "node:fs";
import path from "node:path";
import type { Finding } from "./types";

type BiomeDiagnostic = {
  category?: string;
  description?: string;
  message?: string | { content?: string }[];
  location?: { path?: string | { file?: string }; start?: { line?: number } };
};

const RULE_PREFIX = /^\[ds\/([a-z-]+)\]\s*/;

/** The version the Biome CI job pins; used when the web has no node_modules (that job skips the install). */
const PINNED_BIOME = "@biomejs/biome@2.4.6";

function biomeCommand(webRoot: string): string[] {
  const local = path.join(webRoot, "node_modules/.bin/biome");
  return fs.existsSync(local) ? [local] : ["bunx", PINNED_BIOME];
}

const textOf = (d: BiomeDiagnostic) =>
  d.description ?? (typeof d.message === "string" ? d.message : (d.message ?? []).map((m) => m.content ?? "").join(""));

/** `paths` are relative to `webRoot`; findings come back with the same relative paths. */
export function runBiomePlugins(webRoot: string, paths: string[]): Finding[] {
  if (!paths.length) return [];
  const result = Bun.spawnSync(
    [
      ...biomeCommand(webRoot),
      "lint",
      "--reporter=json",
      "--max-diagnostics=none",
      "--diagnostic-level=warn",
      ...paths,
    ],
    { cwd: webRoot, stdout: "pipe", stderr: "pipe" },
  );
  const stdout = result.stdout.toString();
  let parsed: { diagnostics?: BiomeDiagnostic[] };
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`biome lint did not return JSON:\n${result.stderr.toString().slice(0, 2000)}`);
  }
  const findings: Finding[] = [];
  for (const d of parsed.diagnostics ?? []) {
    if (d.category !== "plugin") continue;
    const text = textOf(d);
    const rule = text.match(RULE_PREFIX)?.[1];
    if (!rule) continue;
    const loc = d.location?.path;
    const file = (typeof loc === "string" ? loc : (loc?.file ?? "")).split(path.sep).join("/");
    findings.push({ file, line: d.location?.start?.line ?? 0, rule, message: text.replace(RULE_PREFIX, "") });
  }
  return findings;
}
