import { describe, expect, it } from "bun:test";
import {
  aliasToRuntimeId,
  captureExploreDefaultsFromTab,
  eligibleLeafColumns,
  pickVisibleAliases,
  projectDefaultsForNewTab,
  resolveColumnOrderFromProjectDefaults,
  resolveHiddenColumnsFromProjectDefaults,
  resolveRoleCode,
  runtimeIdToAlias,
  surfaceHasProjectDefaults,
  visualOrderedLeafColumns,
} from "./project_column_defaults";

const columns = [
  { id: "tasks:id", alias: "id" },
  { id: "tasks:data", children: ["tasks:data.text"], alias: "data" },
  { id: "tasks:data.text", alias: "text", parent: "tasks:data" },
  { id: "tasks:agreement", alias: "agreement" },
  { id: "tasks:annotations_results_json", alias: "annotations_results_json", hidden: true },
];

const catalogDefaultHidden = {
  explore: ["tasks:agreement"],
  labeling: ["tasks:agreement"],
};

const projectExplore = {
  order: ["data.text", "id", "stale.gone"],
  visible: {
    OW: ["id", "data.text"],
    AD: ["id", "data.text"],
    MA: ["id", "data.text"],
    AN: ["id", "data.text"],
    RE: ["id", "data.text"],
  },
};

describe("project_column_defaults (FIT-2846)", () => {
  describe("role / id helpers", () => {
    it("maps SDK role names and API codes to OW|AD|MA|AN|RE", () => {
      expect(resolveRoleCode("OWNER")).toBe("OW");
      expect(resolveRoleCode("OW")).toBe("OW");
      expect(resolveRoleCode("ANNOTATOR")).toBe("AN");
      expect(resolveRoleCode("nope")).toBeNull();
    });

    it("converts between catalog aliases and runtime column ids", () => {
      expect(runtimeIdToAlias("tasks:data.text")).toBe("data.text");
      expect(aliasToRuntimeId("data.text")).toBe("tasks:data.text");
      expect(aliasToRuntimeId("tasks:id")).toBe("tasks:id");
    });

    it("eligibleLeafColumns drops group parents and filter-only hidden columns", () => {
      expect(eligibleLeafColumns(columns).map((c) => c.id)).toEqual(["tasks:id", "tasks:data.text", "tasks:agreement"]);
    });
  });

  describe("surfaceHasProjectDefaults / pickVisibleAliases", () => {
    it("detects order or any role visible list", () => {
      expect(surfaceHasProjectDefaults(projectExplore)).toBe(true);
      expect(surfaceHasProjectDefaults({ order: [], visible: { OW: [] } })).toBe(true);
      expect(surfaceHasProjectDefaults({ order: [], visible: {} })).toBe(false);
      expect(surfaceHasProjectDefaults(null)).toBe(false);
    });

    it("prefers the current role then falls back to another populated role", () => {
      expect(pickVisibleAliases(projectExplore, "OW")).toEqual(["id", "data.text"]);
      expect(pickVisibleAliases({ visible: { MA: ["id"] } }, "AN")).toEqual(["id"]);
      expect(pickVisibleAliases({ visible: {} }, "OW")).toBeNull();
    });
  });

  describe("resolveHiddenColumnsFromProjectDefaults", () => {
    it("hides eligible columns not in the visible list and ignores stale aliases", () => {
      const result = resolveHiddenColumnsFromProjectDefaults({
        surface: {
          ...projectExplore,
          visible: { OW: ["id", "data.text", "stale.gone"] },
        },
        role: "OWNER",
        columns,
        catalogDefaultHidden,
      });

      expect(result.explore).toEqual(["tasks:agreement"]);
      expect(result.explore).not.toContain("tasks:annotations_results_json");
      // Labeling stays on catalog — not overwritten by the explore soft-hide set.
      expect(result.labeling).toEqual(["tasks:agreement"]);
    });

    it("keeps catalog visibility for brand-new columns not mentioned in saved defaults", () => {
      const withNew = [...columns, { id: "tasks:data.image", alias: "image", parent: "tasks:data" }];
      const result = resolveHiddenColumnsFromProjectDefaults({
        surface: projectExplore,
        role: "OW",
        columns: withNew,
        catalogDefaultHidden: { explore: [], labeling: [] },
      });

      // agreement is also unmentioned here (not in saved order/visible) → catalog (visible)
      expect(result.explore).toEqual([]);
      expect(result.explore).not.toContain("tasks:data.image");
    });

    it("does not apply labeling catalog-hidden to explore for unmentioned columns", () => {
      const withNew = [{ id: "tasks:id" }, { id: "tasks:data.text" }, { id: "tasks:data.new_col" }];
      const result = resolveHiddenColumnsFromProjectDefaults({
        surface: {
          order: ["id", "data.text"],
          visible: { OW: ["id", "data.text"] },
        },
        role: "OW",
        columns: withNew,
        catalogDefaultHidden: {
          explore: [],
          labeling: ["tasks:data.text", "tasks:data.new_col"],
        },
      });

      expect(result.explore).toEqual([]);
      expect(result.explore).not.toContain("tasks:data.new_col");
      expect(result.labeling).toEqual(["tasks:data.text", "tasks:data.new_col"]);
    });

    it("preserves catalog labeling when explore soft defaults hide a different set", () => {
      const result = resolveHiddenColumnsFromProjectDefaults({
        surface: {
          order: ["id", "data.text", "agreement"],
          visible: { OW: ["id", "data.text"] },
        },
        role: "OW",
        columns,
        catalogDefaultHidden: {
          explore: [],
          labeling: ["tasks:id", "tasks:data.text", "tasks:agreement"],
        },
      });

      expect(result.explore).toEqual(["tasks:agreement"]);
      expect(result.labeling).toEqual(["tasks:id", "tasks:data.text", "tasks:agreement"]);
    });

    it("hides columns listed in order but omitted from visible (intentional soft hide)", () => {
      const result = resolveHiddenColumnsFromProjectDefaults({
        surface: {
          order: ["id", "data.text", "agreement"],
          visible: { OW: ["id", "data.text"] },
        },
        role: "OW",
        columns,
        catalogDefaultHidden: { explore: [], labeling: [] },
      });

      expect(result.explore).toEqual(["tasks:agreement"]);
      expect(result.labeling).toEqual([]);
    });

    it("falls back to catalog defaultHidden when no project visible list exists", () => {
      const result = resolveHiddenColumnsFromProjectDefaults({
        surface: { order: ["id"], visible: {} },
        role: "OW",
        columns,
        catalogDefaultHidden,
      });

      expect(result).toEqual(catalogDefaultHidden);
    });
  });

  describe("resolveColumnOrderFromProjectDefaults", () => {
    it("maps aliases to runtime ids, drops stale ids, and appends new eligible columns", () => {
      const result = resolveColumnOrderFromProjectDefaults({
        surface: projectExplore,
        columns,
      });

      expect(result.select).toBe(0);
      expect(result["tasks:data.text"]).toBe(1);
      expect(result["tasks:id"]).toBe(2);
      expect(result["tasks:agreement"]).toBe(3);
      expect(result["show-source"]).toBe(4);
      expect(result["tasks:stale.gone"]).toBeUndefined();
    });
  });

  describe("projectDefaultsForNewTab", () => {
    it("returns empty when flag off, customization present, or no project defaults", () => {
      expect(
        projectDefaultsForNewTab({
          enabled: false,
          defaults: { explore: projectExplore },
          role: "OWNER",
          columns,
        }),
      ).toEqual({});

      expect(
        projectDefaultsForNewTab({
          enabled: true,
          hasCustomization: true,
          defaults: { explore: projectExplore },
          role: "OWNER",
          columns,
        }),
      ).toEqual({});

      expect(
        projectDefaultsForNewTab({
          enabled: true,
          defaults: { explore: { order: [], visible: {} } },
          role: "OWNER",
          columns,
        }),
      ).toEqual({});
    });

    it("returns hiddenColumns and columnOrder for a new tab when defaults exist", () => {
      const result = projectDefaultsForNewTab({
        enabled: true,
        defaults: { explore: projectExplore, labeling: { order: [], visible: {} } },
        surface: "explore",
        role: "MANAGER",
        columns,
        catalogDefaultHidden,
      });

      expect(result.hiddenColumns.explore).toEqual(["tasks:agreement"]);
      expect(result.columnOrder["tasks:data.text"]).toBe(1);
      expect(result.columnOrder["tasks:id"]).toBe(2);
    });
  });

  describe("captureExploreDefaultsFromTab (FIT-2847)", () => {
    const captureOpts = {
      sharedColumnOrder: true,
      projectColumnDefaults: true,
      personalOrder: {},
    };

    it("returns empty lists when view is missing", () => {
      expect(captureExploreDefaultsFromTab(null)).toEqual({ order: [], visibleIds: [] });
      expect(captureExploreDefaultsFromTab(undefined)).toEqual({ order: [], visibleIds: [] });
    });

    it("orders by columnOrderSnapshot and drops hidden leaves from visibleIds", () => {
      const result = captureExploreDefaultsFromTab(
        {
          columns: [
            { id: "tasks:id", alias: "id", is_hidden: false },
            { id: "tasks:data", children: ["tasks:data.text"], alias: "data" },
            { id: "tasks:data.text", alias: "text", parent: "tasks:data", is_hidden: false },
            { id: "tasks:agreement", alias: "agreement", is_hidden: true },
            { id: "tasks:annotations_results_json", alias: "annotations_results_json", hidden: true },
          ],
          columnOrderSnapshot: {
            "tasks:data.text": 1,
            "tasks:id": 2,
            "tasks:agreement": 3,
          },
        },
        captureOpts,
      );

      expect(result.order).toEqual(["data.text", "id", "agreement"]);
      expect(result.visibleIds).toEqual(["data.text", "id"]);
    });

    it("keeps catalog leaf order when the tab has no columnOrder", () => {
      const result = captureExploreDefaultsFromTab(
        {
          columns: [
            { id: "tasks:id", is_hidden: false },
            { id: "tasks:agreement", is_hidden: false },
            { id: "tasks:data.text", is_hidden: true },
          ],
          columnOrderSnapshot: {},
        },
        captureOpts,
      );

      expect(result.order).toEqual(["id", "agreement", "data.text"]);
      expect(result.visibleIds).toEqual(["id", "agreement"]);
    });

    it("expands Data at the group root position even when the child appears earlier in the flat list", () => {
      // Flat API order can list data.text before later roots and before the data parent —
      // the live grid expands Data at the parent root (last here), not flat leaf order.
      const columns = [
        { id: "tasks:data.text", alias: "text", parent: "tasks:data", is_hidden: false },
        { id: "tasks:id", alias: "id", is_hidden: false },
        { id: "tasks:agreement", alias: "agreement", is_hidden: false },
        { id: "tasks:data", children: ["tasks:data.text"], alias: "data" },
      ];

      expect(visualOrderedLeafColumns(columns).map((c) => c.id)).toEqual([
        "tasks:id",
        "tasks:agreement",
        "tasks:data.text",
      ]);

      const result = captureExploreDefaultsFromTab({ columns, columnOrderSnapshot: {} }, captureOpts);
      expect(result.order).toEqual(["id", "agreement", "data.text"]);
    });

    it("uses personal order when shared tab order is off (parity with Table)", () => {
      const result = captureExploreDefaultsFromTab(
        {
          columns: [
            { id: "tasks:id", is_hidden: false },
            { id: "tasks:data", children: ["tasks:data.text"] },
            { id: "tasks:data.text", parent: "tasks:data", is_hidden: false },
            { id: "tasks:agreement", is_hidden: false },
          ],
          columnOrderSnapshot: { "tasks:id": 1 },
        },
        {
          sharedColumnOrder: false,
          projectColumnDefaults: true,
          personalOrder: {
            "tasks:agreement": 1,
            "tasks:id": 2,
            "tasks:data.text": 3,
          },
        },
      );

      expect(result.order).toEqual(["agreement", "id", "data.text"]);
    });

    it("captures per-dimension agreement columns in order and visibleIds", () => {
      const result = captureExploreDefaultsFromTab(
        {
          columns: [
            { id: "tasks:id", alias: "id", is_hidden: false },
            { id: "tasks:agreement", alias: "agreement", is_hidden: false },
            { id: "tasks:dimension_agreement_7", alias: "dimension_agreement_7", is_hidden: false },
            { id: "tasks:dimension_agreement_9", alias: "dimension_agreement_9", is_hidden: true },
          ],
          columnOrderSnapshot: {
            "tasks:dimension_agreement_7": 1,
            "tasks:id": 2,
            "tasks:agreement": 3,
            "tasks:dimension_agreement_9": 4,
          },
          hiddenColumnsSnapshot: {
            explore: ["tasks:dimension_agreement_9"],
            labeling: [],
          },
        },
        captureOpts,
      );

      expect(result.order).toEqual(["dimension_agreement_7", "id", "agreement", "dimension_agreement_9"]);
      expect(result.visibleIds).toEqual(["dimension_agreement_7", "id", "agreement"]);
    });
  });
});
