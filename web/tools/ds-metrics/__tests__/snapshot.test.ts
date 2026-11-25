import { describe, expect, test } from "bun:test";
import { TARGETS, TEMPLATES_AREA, areaOf, buildSnapshot } from "../snapshot";
import type { CheckAll, Manifest, SnapshotInput } from "../snapshot";

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

  test("areas carry the violations of their files, and only areas with violations are listed", () => {
    expect(snap.areas).toEqual({
      datamanager: { violations: 1 },
      editor: { violations: 2 },
      "lse/app": { violations: 5 },
      "lse/libs/editor-shell": { violations: 1 },
    });
  });

  test("goals carry the value and the target from the scoreboard", () => {
    expect(snap.goals.primitive_implementations_outside_ds).toEqual({
      value: 2,
      target: TARGETS.primitive_implementations_outside_ds,
    });
    expect(snap.goals.ds_components).toEqual({ value: 3, target: TARGETS.ds_components });
    expect(snap.goals.raw_controls_lse_app).toEqual({ value: 3, target: 0 });
    expect(snap.goals.legacy_icons).toEqual({ value: 2, target: 0 });
    expect(Object.keys(snap.goals)).toEqual([
      "primitive_implementations_outside_ds",
      "ds_components",
      "raw_controls_lse_app",
      "legacy_icons",
    ]);
  });

  test("the snapshot is deterministic for the same input", () => {
    expect(JSON.stringify(buildSnapshot(input))).toBe(JSON.stringify(snap));
  });
});

describe("buildSnapshot with retired copies", () => {
  const modal = "services/lse/web/apps/labelstudio/src/components/Modal/Modal.tsx";
  const withRetired: SnapshotInput = {
    ...input,
    manifest: {
      ...manifest,
      components: [
        ...manifest.components,
        { name: "ModalWindow", exports: ["ModalWindow"], replaces: [], retired: [modal] },
      ],
    },
    webs: {
      lso,
      lse: check("lse", [
        ...lse.findings,
        {
          file: "apps/labelstudio/src/pages/V.tsx",
          line: 1,
          rule: "replaced-import",
          message: "",
          component: "ModalWindow",
        },
      ]),
    },
  };

  test("an older commit that still has the copy keeps its cluster and counts it as a local copy", () => {
    const snap = buildSnapshot({ ...withRetired, exists: (p) => existing.has(p) || p === modal });
    expect(snap.clusters.ModalWindow).toEqual({ paths_remaining: 1, importers: 1 });
    expect(snap.goals.primitive_implementations_outside_ds.value).toBe(3);
  });

  test("a commit where the copy is gone has no cluster for it", () => {
    const snap = buildSnapshot(withRetired);
    expect(snap.clusters.ModalWindow).toBeUndefined();
    expect(snap.goals.primitive_implementations_outside_ds.value).toBe(2);
  });
});

describe("buildSnapshot with the template catalog", () => {
  const withTemplates = buildSnapshot({ ...input, templates: { rawControls: 7 } });

  test("the templates are their own area and goal", () => {
    expect(withTemplates.areas[TEMPLATES_AREA]).toEqual({ violations: 7 });
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
