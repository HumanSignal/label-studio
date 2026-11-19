import { describe, expect, test } from "bun:test";
import { TARGETS, TEMPLATES_AREA, areaOf, buildSnapshot } from "../snapshot";
import type { CheckAll, Manifest, RenderFile, SnapshotInput } from "../snapshot";

const manifest: Manifest = {
  components: [
    {
      name: "Button",
      exports: ["Button", "ButtonGroup"],
      replaces: ["services/lso/web/libs/editor/src/common/Button/Button.tsx", "jsx:<button>"],
    },
    {
      name: "Dropdown",
      exports: ["Dropdown"],
      replaces: [
        "services/lse/web/apps/labelstudio/src/components/Menu/Menu.jsx",
        "services/lse/web/apps/labelstudio/src/components_lse/Legacy",
      ],
    },
    {
      name: "Spinner",
      exports: ["Spinner"],
      replaces: ["services/lse/web/apps/labelstudio/src/components/Spinner/Spinner.tsx"],
    },
  ],
  nonComponents: ["SIZES"],
};

const check = (web: "lso" | "lse", findings: CheckAll["findings"]): CheckAll => ({
  web,
  scope: "all",
  totals: { violations: findings.length, files: new Set(findings.map((f) => f.file)).size, scanned: 0 },
  rules: {},
  files: {},
  findings,
});

const lso = check("lso", [
  { file: "libs/editor/src/A.tsx", line: 1, rule: "raw-control", message: "", element: "button", component: "Button" },
  { file: "libs/editor/src/A.tsx", line: 2, rule: "color-literal", message: "" },
  { file: "libs/datamanager/src/B.jsx", line: 1, rule: "legacy-icon", message: "" },
]);
const lse = check("lse", [
  {
    file: "apps/labelstudio/src/pages/X.tsx",
    line: 1,
    rule: "raw-control",
    message: "",
    element: "button",
    component: "Button",
  },
  {
    file: "apps/labelstudio/src/pages/X.tsx",
    line: 9,
    rule: "raw-control",
    message: "",
    element: "table",
    component: "DataTable",
  },
  {
    file: "apps/labelstudio/src/pages/Y.tsx",
    line: 1,
    rule: "raw-control",
    message: "",
    element: "button",
    component: "Button",
  },
  { file: "apps/labelstudio/src/pages/Y.tsx", line: 3, rule: "replaced-import", message: "", component: "Dropdown" },
  { file: "apps/labelstudio/src/pages/Z.tsx", line: 3, rule: "replaced-import", message: "", component: "Dropdown" },
  { file: "libs/editor-shell/src/C.tsx", line: 1, rule: "legacy-icon", message: "" },
]);

type Elements = RenderFile["elements"];
const render = (web: "lso" | "lse", files: [string, boolean, Elements?][]): RenderFile[] =>
  files.map(([file, importsDs, elements]) => ({ web, file, importsDs, elements }));

const existing = new Set([
  "services/lso/web/libs/editor/src/common/Button/Button.tsx",
  "services/lse/web/apps/labelstudio/src/components/Menu/Menu.jsx",
]);

const input: SnapshotInput = {
  commit: "abc123",
  date: "2026-11-06T12:00:00Z",
  pr: 3780,
  prs: [{ number: 3780, title: "Example change", commit: "abc123" }],
  manifest,
  webs: { lso, lse },
  renderFiles: [
    ...render("lso", [
      ["libs/editor/src/A.tsx", false, { ds: 0, local: 0 }],
      ["libs/editor/src/D.tsx", true, { ds: 2, local: 0 }],
      ["apps/labelstudio/src/E.tsx", true, { ds: 1, local: 0 }],
      ["libs/datamanager/src/B.jsx", false, { ds: 0, local: 0 }],
    ]),
    ...render("lse", [
      ["apps/labelstudio/src/pages/X.tsx", true, { ds: 1, local: 0 }],
      ["apps/labelstudio/src/pages/Y.tsx", false, { ds: 0, local: 2 }],
      ["apps/labelstudio/src/pages/Z.tsx", true, { ds: 3, local: 1 }],
      ["apps/labelstudio/src/pages/W.tsx", true, { ds: 2, local: 0 }],
      ["libs/editor-shell/src/C.tsx", false, null],
    ]),
  ],
  exists: (p) => existing.has(p),
};

describe("areaOf", () => {
  test("maps files to the dashboard areas", () => {
    expect(areaOf("lso", "apps/labelstudio/src/x.tsx")).toBe("lso/app");
    expect(areaOf("lso", "libs/editor/src/x.tsx")).toBe("editor");
    expect(areaOf("lso", "libs/datamanager/src/x.jsx")).toBe("datamanager");
    expect(areaOf("lso", "libs/core/src/x.ts")).toBe("lso/libs/core");
    expect(areaOf("lso", "apps/playground/src/x.tsx")).toBe("lso/apps/playground");
    expect(areaOf("lse", "apps/labelstudio/src/x.tsx")).toBe("lse/app");
    expect(areaOf("lse", "libs/interface-components/src/x.tsx")).toBe("lse/libs/interface-components");
  });
});

describe("buildSnapshot", () => {
  const snap = buildSnapshot(input);

  test("identity and totals", () => {
    expect(snap).toMatchObject({
      version: 1,
      commit: "abc123",
      date: "2026-11-06T12:00:00Z",
      pr: 3780,
      prs: [{ number: 3780, title: "Example change", commit: "abc123" }],
    });
    expect(snap.totals).toEqual({ violations: 9, files_with_violations: 6 });
  });

  test("rules are summed across both webs", () => {
    expect(snap.rules).toEqual({ "color-literal": 1, "legacy-icon": 2, "raw-control": 4, "replaced-import": 2 });
  });

  test("clusters count the remaining paths and the files still importing them", () => {
    expect(snap.clusters.Dropdown).toEqual({ paths_remaining: 1, importers: 2 });
    expect(snap.clusters.Button).toEqual({ paths_remaining: 1, importers: 0 });
    expect(snap.clusters.Spinner).toBeUndefined();
  });

  const noUi = { ui_elements: 0, ds_elements: 0, element_share: null, ui_files: 0, clean_files: 0, clean_share: null };

  test("areas carry violations and the share of render files importing the design system", () => {
    expect(snap.areas["lse/app"]).toMatchObject({ violations: 5, render_files: 4, ds_import_share: 0.75 });
    expect(snap.areas.editor).toMatchObject({ violations: 2, render_files: 2, ds_import_share: 0.5 });
    expect(snap.areas.datamanager).toEqual({ violations: 1, render_files: 1, ds_import_share: 0, ...noUi });
    expect(snap.areas["lse/libs/editor-shell"]).toEqual({
      violations: 1,
      render_files: 1,
      ds_import_share: 0,
      ...noUi,
    });
  });

  test("element share: DS elements over DS elements, raw controls and local look-alikes", () => {
    // X: 1 DS + 2 raw; Y: 2 local + 1 raw; Z: 3 DS + 1 local; W: 2 DS
    expect(snap.areas["lse/app"]).toMatchObject({ ui_elements: 12, ds_elements: 6, element_share: 0.5 });
    // A: 1 raw; D: 2 DS
    expect(snap.areas.editor).toMatchObject({ ui_elements: 3, ds_elements: 2, element_share: 0.667 });
    expect(snap.areas["lso/app"]).toMatchObject({ ui_elements: 1, ds_elements: 1, element_share: 1 });
  });

  test("clean-file share: UI files with no raw control, local copy or old icon", () => {
    expect(snap.areas["lse/app"]).toMatchObject({ ui_files: 4, clean_files: 1, clean_share: 0.25 });
    expect(snap.areas.editor).toMatchObject({ ui_files: 2, clean_files: 1, clean_share: 0.5 });
  });

  test("a file that renders nothing the design system covers is in neither share", () => {
    // B.jsx has a legacy icon but no elements; C.tsx could not be read
    expect(snap.areas.datamanager.ui_files).toBe(0);
    expect(snap.areas["lse/libs/editor-shell"].ui_files).toBe(0);
  });

  test("the element and clean-file shares are goals per web, without a target yet", () => {
    expect(snap.goals.ds_element_share_lse).toEqual({ value: 0.5, target: null });
    expect(snap.goals.ds_element_share_lso).toEqual({ value: 0.75, target: null });
    expect(snap.goals.clean_file_share_lse).toEqual({ value: 0.25, target: null });
    expect(snap.goals.clean_file_share_lso).toEqual({ value: 0.667, target: null });
  });

  test("goals carry the value and the target from the scoreboard", () => {
    expect(snap.goals.primitive_implementations_outside_ds).toEqual({
      value: 2,
      target: TARGETS.primitive_implementations_outside_ds,
    });
    expect(snap.goals.ds_components).toEqual({ value: 3, target: TARGETS.ds_components });
    expect(snap.goals.raw_controls_lse_app).toEqual({ value: 3, target: 0 });
    expect(snap.goals.legacy_icons).toEqual({ value: 2, target: 0 });
    expect(snap.goals.ds_render_share_lse).toEqual({ value: 0.6, target: TARGETS.ds_render_share_lse });
    expect(snap.goals.ds_render_share_lso).toEqual({ value: 0.5, target: TARGETS.ds_render_share_lso });
  });

  test("the snapshot is deterministic for the same input", () => {
    expect(JSON.stringify(buildSnapshot(input))).toBe(JSON.stringify(snap));
  });
});

describe("buildSnapshot with the template catalog", () => {
  const withTemplates = buildSnapshot({ ...input, templates: { files: 4, filesUsingEditorUi: 3, rawControls: 7 } });

  test("the templates are their own area and goal", () => {
    expect(withTemplates.areas[TEMPLATES_AREA]).toEqual({ violations: 7, render_files: 4, ds_import_share: 0.75 });
    expect(withTemplates.goals.raw_controls_templates).toEqual({ value: 7, target: TARGETS.raw_controls_templates });
  });

  test("template raw controls stay out of the rule counts the PR gate compares", () => {
    expect(withTemplates.rules).toEqual(buildSnapshot(input).rules);
    expect(withTemplates.totals).toEqual(buildSnapshot(input).totals);
  });

  test("a checkout without the catalog has no template area or goal", () => {
    expect(buildSnapshot(input).areas[TEMPLATES_AREA]).toBeUndefined();
    expect(buildSnapshot(input).goals.raw_controls_templates).toBeUndefined();
  });
});
