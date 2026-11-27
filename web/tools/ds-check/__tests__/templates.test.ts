import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  TEMPLATE_CATALOG,
  TEMPLATE_DIALOG_RULE,
  TEMPLATE_RULE,
  listTemplateFiles,
  scanTemplateSource,
} from "../templates";

const FILE = `${TEMPLATE_CATALOG}/example/Screen.jsx`;

describe("scanTemplateSource", () => {
  test("finds raw controls written as JSX and as createElement", () => {
    const source = [
      '<button type="button" onClick={go}>Go</button>',
      "React.createElement('button', { onClick: go }, 'Go')",
      "<select value={v} />",
      '<input type="checkbox" checked={on} />',
      "React.createElement('input', { type: 'checkbox' })",
      '<svg viewBox="0 0 16 16"><path d="M0 0" /></svg>',
      "React.createElement('table', null)",
    ].join("\n");
    const findings = scanTemplateSource(FILE, source);
    expect(findings.map((f) => f.line)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(findings.map((f) => f.rule))).toEqual(new Set([TEMPLATE_RULE]));
    expect(findings[0].file).toBe(FILE);
  });

  test("finds raw text, number and radio inputs and textareas, but not sliders, colours, hidden or file inputs", () => {
    const source = [
      '<input type="text" value={v} />',
      "React.createElement('input', {",
      "  value: level,",
      "  type: 'number',",
      "})",
      '<input type="range" min={0} max={1} />',
      "h('input', { type: 'file', onChange: pick })",
      "React.createElement('input', { type: 'color' })",
      '<input type="hidden" value={id} />',
      "<input value={q} onChange={search} />",
      '<input type="radio" name="mode" />',
      "<textarea value={notes} />",
      "// ds-allow-raw: inline cell editor sized to the table cell",
      '<input type="text" value={cell} />',
    ].join("\n");
    expect(scanTemplateSource(FILE, source).map((f) => f.line)).toEqual([1, 2, 10, 11, 12]);
  });

  test("finds raw controls created through a short alias for React.createElement", () => {
    const source = [
      "var h = React.createElement;",
      'h("button", { onClick: go }, "Go")',
      "h('svg', { viewBox: '0 0 24 24' })",
      "const width = h(10);",
    ].join("\n");
    expect(scanTemplateSource(FILE, source).map((f) => f.line)).toEqual([2, 3]);
  });

  test("finds native dialogs, which the sandbox blocks, and hand-built modal dialogs", () => {
    const source = [
      "if (confirm('Clear all regions?')) clear();",
      "const raw = window.prompt('Level?', '');",
      '<div role="dialog" aria-modal={!props.floating}>',
      "React.createElement('div', { role: 'dialog', 'aria-modal': true })",
      ".kl-scrim { position: absolute; inset: 0; z-index: 80; background: rgba(2, 5, 10, 0.55); }",
      ".full { position: fixed; inset: 0; background: var(--color-neutral-surface); }",
      "const ok = confirm(options);",
      '<div aria-modal="false" />',
    ].join("\n");
    const findings = scanTemplateSource(FILE, source);
    expect(findings.map((f) => [f.line, f.rule])).toEqual([
      [1, TEMPLATE_DIALOG_RULE],
      [2, TEMPLATE_DIALOG_RULE],
      [3, TEMPLATE_DIALOG_RULE],
      [4, TEMPLATE_DIALOG_RULE],
      [5, TEMPLATE_DIALOG_RULE],
    ]);
    expect(findings[0].message).toContain("EditorUI.ConfirmDialog");
  });

  test("finds a native dialog whose message starts on the next line", () => {
    const findings = scanTemplateSource(FILE, "const ok = confirm(\n  'Clear all regions?',\n);");
    expect(findings.map((f) => [f.line, f.rule])).toEqual([[1, TEMPLATE_DIALOG_RULE]]);
  });

  test("skips a control marked with a reason on its line or the line above", () => {
    const source = [
      "// ds-allow-raw: waveform drawing, not an icon",
      '<svg viewBox="0 0 100 10" />',
      '<button type="button" /> {/* ds-allow-raw: row selection target */}',
      '<button type="button" />',
    ].join("\n");
    expect(scanTemplateSource(FILE, source).map((f) => f.line)).toEqual([4]);
  });

  test("ignores EditorUI components and names that only contain the tag", () => {
    const source = '<EditorUI.Button look="ghost" />\nconst buttonStyle = {};\n<EditorUI.Checkbox checked />';
    expect(scanTemplateSource(FILE, source)).toEqual([]);
  });
});

describe("listTemplateFiles", () => {
  test("measures built templates on their sources and leaves scenarios out", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "templates-"));
    const catalog = path.join(repo, TEMPLATE_CATALOG);
    fs.mkdirSync(path.join(catalog, "plain"), { recursive: true });
    fs.writeFileSync(path.join(catalog, "plain/Screen.jsx"), "");
    fs.writeFileSync(path.join(catalog, "plain/scenarios.js"), "");
    fs.mkdirSync(path.join(catalog, "built/src"), { recursive: true });
    fs.mkdirSync(path.join(catalog, "built/scripts"), { recursive: true });
    fs.writeFileSync(path.join(catalog, "built/Screen.jsx"), "");
    fs.writeFileSync(path.join(catalog, "built/src/01-ui.jsx"), "");
    fs.writeFileSync(path.join(catalog, "built/scripts/build.mjs"), "");

    expect(listTemplateFiles(repo)).toEqual([
      `${TEMPLATE_CATALOG}/built/src/01-ui.jsx`,
      `${TEMPLATE_CATALOG}/plain/Screen.jsx`,
    ]);
  });
});
