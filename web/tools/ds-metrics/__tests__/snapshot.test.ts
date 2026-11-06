import { describe, expect, test } from "bun:test";
import { TARGETS, areaOf, buildSnapshot } from "../snapshot";
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

const render = (web: "lso" | "lse", files: [string, boolean][]): RenderFile[] =>
  files.map(([file, importsDs]) => ({ web, file, importsDs }));

const existing = new Set([
  "services/lso/web/libs/editor/src/common/Button/Button.tsx",
  "services/lse/web/apps/labelstudio/src/components/Menu/Menu.jsx",
]);

const input: SnapshotInput = {
  commit: "abc123",
  date: "2026-11-06T12:00:00Z",
  pr: 3780,
  manifest,
  webs: { lso, lse },
  renderFiles: [
    ...render("lso", [
      ["libs/editor/src/A.tsx", false],
      ["libs/editor/src/D.tsx", true],
      ["apps/labelstudio/src/E.tsx", true],
      ["libs/datamanager/src/B.jsx", false],
    ]),
    ...render("lse", [
      ["apps/labelstudio/src/pages/X.tsx", true],
      ["apps/labelstudio/src/pages/Y.tsx", false],
      ["apps/labelstudio/src/pages/Z.tsx", true],
      ["apps/labelstudio/src/pages/W.tsx", true],
      ["libs/editor-shell/src/C.tsx", false],
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
    expect(snap).toMatchObject({ version: 1, commit: "abc123", date: "2026-11-06T12:00:00Z", pr: 3780 });
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

  test("areas carry violations and the share of render files importing the design system", () => {
    expect(snap.areas["lse/app"]).toEqual({ violations: 5, render_files: 4, ds_import_share: 0.75 });
    expect(snap.areas.editor).toEqual({ violations: 2, render_files: 2, ds_import_share: 0.5 });
    expect(snap.areas.datamanager).toEqual({ violations: 1, render_files: 1, ds_import_share: 0 });
    expect(snap.areas["lse/libs/editor-shell"]).toEqual({ violations: 1, render_files: 1, ds_import_share: 0 });
  });

  test("goals carry the value and the target from the scoreboard", () => {
    expect(snap.goals.primitive_implementations_outside_ds).toEqual({
      value: 2,
      target: TARGETS.primitive_implementations_outside_ds,
    });
    expect(snap.goals.ds_exports).toEqual({ value: 4, target: TARGETS.ds_exports });
    expect(snap.goals.raw_buttons_lse_app).toEqual({ value: 2, target: 0 });
    expect(snap.goals.legacy_icons).toEqual({ value: 2, target: 0 });
    expect(snap.goals.ds_render_share_lse).toEqual({ value: 0.6, target: TARGETS.ds_render_share_lse });
    expect(snap.goals.ds_render_share_lso).toEqual({ value: 0.5, target: TARGETS.ds_render_share_lso });
  });

  test("the snapshot is deterministic for the same input", () => {
    expect(JSON.stringify(buildSnapshot(input))).toBe(JSON.stringify(snap));
  });
});
