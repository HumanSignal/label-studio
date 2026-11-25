/**
 * Raw controls in the built-in Custom Interface templates (the system template catalog).
 *
 * The templates live outside the web folders and are written both as JSX and as `React.createElement`, so the
 * Biome plugins never see them. Each template reaches the design system through the global `EditorUI`. A control
 * that has no EditorUI equivalent stays raw with a `ds-allow-raw: <reason>` comment on its line, or on a comment line
 * right above it.
 */
import fs from "node:fs";
import path from "node:path";
import type { Finding } from "./types";

export const TEMPLATE_CATALOG = "services/lse/label_studio_enterprise/lse_interfaces/system_template_catalog";

export const TEMPLATE_RULE = "template-raw-control";
export const TEMPLATE_DIALOG_RULE = "template-dialog";

// The template iframe is sandboxed without allow-modals: confirm and prompt return false / null and show nothing.
const DIALOGS: { pattern: RegExp; message: string }[] = [
  {
    pattern:
      /\b(?:window|globalThis|self)\.(?:confirm|alert|prompt)\(|(?<![\w$.])(?<!\bfunction\s+)(?:confirm|alert|prompt)\(\s*["'`]/g,
    message:
      "The sandbox blocks confirm, alert and prompt (they return false / null): render EditorUI.ConfirmDialog, EditorUI.InfoDialog or EditorUI.ModalWindow.",
  },
  {
    pattern: /["']?aria-modal["']?\s*[:=]\s*(?:\{\s*)?(?!["']?false\b)(?!undefined\b)[^\s,}>]+/g,
    message: "A hand-built modal dialog: render EditorUI.ModalWindow, which draws the scrim.",
  },
  {
    pattern:
      /position:\s*["']?(?:fixed|absolute)\b(?=[^}\n]*\binset:\s*["']?0\b)(?=[^}\n]*\bbackground(?:-color)?:\s*["']?(?:rgba|hsla)\([^)]*,\s*0?\.\d+\s*\))/g,
    message: "A hand-built modal backdrop: render EditorUI.ModalWindow, which draws the scrim.",
  },
];

const RAW_CONTROLS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /<button\b|createElement\(\s*["']button["']/g,
    message: "Use EditorUI.Button (look filled, outlined or ghost; aria-label when icon-only), not a raw <button>.",
  },
  { pattern: /<select\b|createElement\(\s*["']select["']/g, message: "Use EditorUI.Select, not a raw <select>." },
  {
    pattern: /type=["']checkbox["']|type:\s*["']checkbox["']/g,
    message: "Use EditorUI.Checkbox (EditorUI.Toggle for a setting), not a raw checkbox input.",
  },
  {
    pattern: /<svg\b|createElement\(\s*["']svg["']/g,
    message: "Use an EditorUI.Icons icon, not an inline <svg> (drawings and charts take a ds-allow-raw reason).",
  },
  { pattern: /<table\b|createElement\(\s*["']table["']/g, message: "Use EditorUI.DataTable, not a raw <table>." },
];

const ALLOW = /ds-allow-raw:\s*\S/;
/** A line that holds only a comment, so a marker above a control covers that control and nothing further. */
const isComment = (line: string) => /^\s*(\/\/|\/\*|\{\/\*)/.test(line);

/**
 * The source files of every template, relative to the repo root. A template built from `src/` (scripts/build.mjs)
 * is measured on its sources, not on the generated Screen.jsx; scenario files are tests and are left out.
 */
export function listTemplateFiles(repoRoot: string): string[] {
  const catalog = path.join(repoRoot, TEMPLATE_CATALOG);
  if (!fs.existsSync(catalog)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(catalog, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(catalog, entry.name);
    const built = fs.existsSync(path.join(dir, "src"));
    const walk = (current: string) => {
      for (const child of fs.readdirSync(current, { withFileTypes: true })) {
        const abs = path.join(current, child.name);
        if (child.isDirectory()) {
          if (child.name !== "node_modules" && child.name !== "scripts") walk(abs);
          continue;
        }
        if (!/\.(jsx|tsx|js|ts)$/.test(child.name) || child.name.startsWith("scenarios.")) continue;
        if (built && current === dir && child.name === "Screen.jsx") continue;
        out.push(path.relative(repoRoot, abs).split(path.sep).join("/"));
      }
    };
    walk(dir);
  }
  return out.sort();
}

export const isTemplateFile = (repoRelative: string) => repoRelative.startsWith(`${TEMPLATE_CATALOG}/`);

/** The raw controls in one template source; `file` is repo-relative and comes back unchanged on each finding. */
export function scanTemplateSource(file: string, source: string): Finding[] {
  const lines = source.split("\n");
  const findings: Finding[] = [];
  lines.forEach((text, index) => {
    const allowed = ALLOW.test(text) || (index > 0 && isComment(lines[index - 1]) && ALLOW.test(lines[index - 1]));
    for (const { pattern, message } of RAW_CONTROLS) {
      for (const _ of text.matchAll(pattern)) {
        if (allowed) continue;
        findings.push({ file, line: index + 1, rule: TEMPLATE_RULE, message: `[ds/${TEMPLATE_RULE}] ${message}` });
      }
    }
  });
  // Dialogs are matched on the whole source: a call's message can start on the next line.
  for (const { pattern, message } of DIALOGS) {
    for (const match of source.matchAll(pattern)) {
      const index = source.slice(0, match.index ?? 0).split("\n").length - 1;
      const text = lines[index];
      if (ALLOW.test(text) || (index > 0 && isComment(lines[index - 1]) && ALLOW.test(lines[index - 1]))) continue;
      findings.push({
        file,
        line: index + 1,
        rule: TEMPLATE_DIALOG_RULE,
        message: `[ds/${TEMPLATE_DIALOG_RULE}] ${message}`,
      });
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}
