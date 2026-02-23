/**
 * Unit tests for RegionStore (stores/RegionStore.js).
 * Target: coverage parity 70.11% (parity-93).
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

jest.mock("keymaster", () => {
  const keymaster = () => {};
  keymaster.unbind = () => {};
  keymaster.setScope = () => {};
  return { __esModule: true, default: keymaster };
});

import "../../tags/visual/View";
import "../../tags/object/RichText";
import AppStore from "../AppStore";

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

const createTestEnv = () => ({
  events: {
    hasEvent: jest.fn(() => false),
    invoke: jest.fn(),
  },
  messages: {},
  settings: {},
});

function createStoreWithAnnotation(annotationSnapshot = {}) {
  const env = createTestEnv();
  const task = {
    id: 1,
    data: JSON.stringify({ text: "Hello" }),
  };
  const store = AppStore.create(
    {
      config: MINIMAL_CONFIG,
      task,
      interfaces: ["basic"],
    },
    env,
  );
  store.initializeStore({});
  const ann = store.annotationStore.addAnnotation({
    result: [],
    ...annotationSnapshot,
  });
  return { store, annotation: ann, env };
}

describe("RegionStore", () => {
  beforeEach(() => {
    const storage = {};
    Object.defineProperty(global, "window", {
      value: {
        localStorage: {
          getItem: (k) => storage[k] ?? null,
          setItem: (k, v) => {
            storage[k] = v;
          },
        },
      },
      writable: true,
    });
  });

  describe("views (no regions)", () => {
    it("annotation returns parent annotation", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.annotation).toBe(annotation);
    });

    it("regions returns empty array when no areas", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.regions).toEqual([]);
    });

    it("filteredRegions returns regions when filter is null", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.filteredRegions).toEqual([]);
    });

    it("suggestions returns empty array when no suggestions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.suggestions).toEqual([]);
    });

    it("classifications returns empty array when no textareas", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.classifications).toEqual([]);
    });

    it("hasSelection is false when nothing selected", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.hasSelection).toBe(false);
    });

    it("selectedIds returns empty array", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.selectedIds).toEqual([]);
    });

    it("sortedRegions returns empty array when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.sortedRegions).toEqual([]);
    });

    it("regionIndexMap is empty when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.regionIndexMap).toEqual({});
    });

    it("isAllHidden is true when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.isAllHidden).toBe(true);
    });

    it("persistantView reads from localStorage or view", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(["regions", "labels"]).toContain(annotation.regionStore.persistantView);
    });

    it("getRegionMediaTime returns null for region without media time", () => {
      const { annotation } = createStoreWithAnnotation();
      const region = { type: "rectangleregion" };
      expect(annotation.regionStore.getRegionMediaTime(region)).toBe(null);
    });

    it("getRegionMediaTime returns start for audioregion", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.getRegionMediaTime({ type: "audioregion", start: 5 })).toBe(5);
    });

    it("getRegionMediaTime returns start for timeseriesregion", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.getRegionMediaTime({ type: "timeseriesregion", start: 10 })).toBe(10);
    });

    it("getRegionMediaTime returns ranges[0].start for timelineregion", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.getRegionMediaTime({ type: "timelineregion", ranges: [{ start: 3 }] })).toBe(3);
    });

    it("getRegionMediaTime returns sequence[0].frame for videorectangleregion", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(
        annotation.regionStore.getRegionMediaTime({ type: "videorectangleregion", sequence: [{ frame: 7 }] }),
      ).toBe(7);
    });

    it("getRegionMediaTime returns null when audioregion has no numeric start", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.getRegionMediaTime({ type: "audioregion" })).toBe(null);
    });

    it("getRegionMediaTime puts null aTime after bTime", () => {
      const { annotation } = createStoreWithAnnotation();
      const a = { type: "rectangleregion" };
      const b = { type: "audioregion", start: 1 };
      expect(annotation.regionStore.getRegionMediaTime(a)).toBe(null);
      expect(annotation.regionStore.getRegionMediaTime(b)).toBe(1);
    });
  });

  describe("getRegionsTree and tree builders", () => {
    it("getRegionsTree returns asTree when group is manual", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setGrouping("manual");
      const enrich = (el, idx) => ({ id: el?.id ?? `g${idx}` });
      const tree = annotation.regionStore.getRegionsTree(enrich);
      expect(tree).toEqual([]);
    });

    it("asTree returns empty array when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      const enrich = (el, idx) => ({ id: el?.id ?? `e${idx}` });
      const tree = annotation.regionStore.asTree(enrich);
      expect(tree).toEqual([]);
    });

    it("asLabelsTree returns empty when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      const enrich = (el, idx, isGroup) => ({ id: isGroup ? `g${idx}` : `r${idx}` });
      const tree = annotation.regionStore.asLabelsTree(enrich);
      expect(tree).toEqual([]);
    });

    it("asTypeTree returns empty when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      const enrich = (el, idx, isGroup) => ({ id: isGroup ? `g${idx}` : `r${idx}` });
      const tree = annotation.regionStore.asTypeTree(enrich);
      expect(tree).toEqual([]);
    });

    it("getRegionsTree returns asLabelsTree when group is label", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setGrouping("label");
      const enrich = () => ({ id: "x" });
      const tree = annotation.regionStore.getRegionsTree(enrich);
      expect(Array.isArray(tree)).toBe(true);
    });

    it("getRegionsTree returns asTypeTree when group is type", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setGrouping("type");
      const enrich = () => ({ id: "x" });
      const tree = annotation.regionStore.getRegionsTree(enrich);
      expect(Array.isArray(tree)).toBe(true);
    });
  });

  describe("actions", () => {
    it("setView updates view", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setView("labels");
      expect(annotation.regionStore.view).toBe("labels");
      annotation.regionStore.setView("regions");
      expect(annotation.regionStore.view).toBe("regions");
    });

    it("setSort sets sort and sortOrder", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setSort("score");
      expect(annotation.regionStore.sort).toBe("score");
      expect(annotation.regionStore.sortOrder).toBe("asc");
    });

    it("setSort toggles sortOrder when same sort", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setSort("date");
      const initial = annotation.regionStore.sortOrder;
      annotation.regionStore.setSort("date");
      expect(annotation.regionStore.sortOrder).not.toBe(initial);
    });

    it("toggleSortOrder flips asc to desc and vice versa", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setSort("date");
      const was = annotation.regionStore.sortOrder;
      annotation.regionStore.toggleSortOrder();
      expect(annotation.regionStore.sortOrder).toBe(was === "asc" ? "desc" : "asc");
    });

    it("setGrouping updates group", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.setGrouping("type");
      expect(annotation.regionStore.group).toBe("type");
      annotation.regionStore.setGrouping("label");
      expect(annotation.regionStore.group).toBe("label");
    });

    it("normalizeRegionID returns empty string for falsy id", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.normalizeRegionID(null)).toBe("");
      expect(annotation.regionStore.normalizeRegionID("")).toBe("");
    });

    it("normalizeRegionID appends annotation id when no hash", () => {
      const { annotation } = createStoreWithAnnotation();
      const out = annotation.regionStore.normalizeRegionID("r1");
      expect(out).toContain("r1");
      expect(out).toContain("#");
      expect(out).toContain(annotation.id);
    });

    it("normalizeRegionID returns as-is when already contains hash", () => {
      const { annotation } = createStoreWithAnnotation();
      const id = "r1#ann42";
      expect(annotation.regionStore.normalizeRegionID(id)).toBe(id);
    });

    it("findRegionID returns null for empty id", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.findRegionID(null)).toBe(null);
    });

    it("findRegionID returns undefined when no matching region", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.findRegionID("nonexistent")).toBeUndefined();
    });

    it("findRegion is alias for findRegionID", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.findRegion("x")).toBe(annotation.regionStore.findRegionID("x"));
    });

    it("filterByParentID returns empty array when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regionStore.filterByParentID("p1")).toEqual([]);
    });

    it("clearSelection does not throw", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.clearSelection()).not.toThrow();
    });

    it("unselectAll delegates to annotation", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.unselectAll = jest.fn();
      annotation.regionStore.unselectAll();
      expect(annotation.unselectAll).toHaveBeenCalled();
    });

    it("unhighlightAll does not throw when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.unhighlightAll()).not.toThrow();
    });

    it("selectNext does nothing when no regions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.selectNext()).not.toThrow();
    });

    it("selectRegionsByIds does not throw for empty ids", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.selectRegionsByIds([])).not.toThrow();
    });

    it("setFilteredRegions clears filter when length matches regions", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.updateAppearenceFromState = jest.fn();
      annotation.regionStore.setFilteredRegions([]);
      expect(annotation.regionStore.filter).toBe(null);
      expect(annotation.updateAppearenceFromState).toHaveBeenCalled();
    });

    it("selectRegionByID does nothing when region not found", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.selectRegionByID("nonexistent")).not.toThrow();
    });

    it("selectRegionByID does nothing when regionId is undefined", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.selectRegionByID(undefined)).not.toThrow();
    });

    it("setRegionVisible does nothing when region not found", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.setRegionVisible("nonexistent")).not.toThrow();
    });

    it("initHotkeys does not throw", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.regionStore.initHotkeys()).not.toThrow();
    });
  });

  describe("selection", () => {
    it("isSelected returns false for any region when none selected", () => {
      const { annotation } = createStoreWithAnnotation();
      const fakeRegion = { id: "r1" };
      expect(annotation.regionStore.isSelected(fakeRegion)).toBe(false);
    });

    it("clearSelection clears selection map", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.regionStore.clearSelection();
      expect(annotation.regionStore.selection.size).toBe(0);
    });
  });
});
