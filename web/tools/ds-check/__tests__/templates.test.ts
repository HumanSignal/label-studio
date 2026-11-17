import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TEMPLATE_CATALOG, TEMPLATE_RULE, listTemplateFiles, scanTemplateSource, usesEditorUi } from "../templates";

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

test("usesEditorUi looks for an EditorUI component", () => {
  expect(usesEditorUi("React.createElement(EditorUI.Button, {})")).toBe(true);
  expect(usesEditorUi("const ui = window.EditorUI;")).toBe(false);
});
