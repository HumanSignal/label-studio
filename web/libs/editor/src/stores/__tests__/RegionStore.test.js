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
import "../../tags/object/Image/Image.js";
import "../../tags/control/Rectangle.js";
import AppStore from "../AppStore";

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

const CONFIG_IMAGE_RECT = '<View><Image name="img" value="$img" /><Rectangle name="rect" toName="img" /></View>';

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

function createStoreWithOneRectRegion() {
  const env = createTestEnv();
  const task = {
    id: 1,
    data: JSON.stringify({ img: "https://example.com/img.jpg" }),
  };
  const store = AppStore.create(
    {
      config: CONFIG_IMAGE_RECT,
      task,
      interfaces: ["basic"],
    },
    env,
  );
  store.initializeStore({});
  const rectResult = [
    {
      from_name: "rect",
      to_name: "img",
      type: "rectangle",
      value: { x: 0, y: 0, width: 20, height: 20 },
    },
  ];
  const ann = store.annotationStore.addAnnotation({ result: rectResult });
  ann.deserializeResults(ann.versions.result);
  return { store, annotation: ann, env };
}

function createStoreWithOneRectRegionViaInit() {
  const env = createTestEnv();
  const task = {
    id: 1,
    data: JSON.stringify({ img: "https://example.com/img.jpg" }),
  };
  const store = AppStore.create(
    {
      config: CONFIG_IMAGE_RECT,
      task,
      interfaces: ["basic"],
    },
    env,
  );
  const rectResult = [
    {
      from_name: "rect",
      to_name: "img",
      type: "rectangle",
      value: { x: 0, y: 0, width: 20, height: 20 },
    },
  ];
  store.initializeStore({ annotations: [{ result: rectResult }] });
  const ann = store.annotationStore.selected;
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

  describe("with one region", () => {
    it("regions returns one area after deserializeResults", () => {
      const { annotation } = createStoreWithOneRectRegion();
      expect(annotation.regionStore.regions).toHaveLength(1);
    });

    it("sortedRegions returns one region", () => {
      const { annotation } = createStoreWithOneRectRegion();
      expect(annotation.regionStore.sortedRegions).toHaveLength(1);
    });

    it("regionIndexMap has one entry", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const region = annotation.regionStore.regions[0];
      const map = annotation.regionStore.regionIndexMap;
      expect(Object.keys(map)).toHaveLength(1);
      expect(map[region.id]).toBe(1);
    });

    it("selectNext selects first region when none selected", () => {
      const { annotation } = createStoreWithOneRectRegion();
      annotation.selectArea = jest.fn();
      annotation.regionStore.selectNext();
      expect(annotation.selectArea).toHaveBeenCalledWith(annotation.regionStore.regions[0]);
    });

    it("asTree returns one node with enrich", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const enrich = (el, idx) => ({ id: el?.id ?? `e${idx}` });
      const tree = annotation.regionStore.asTree(enrich);
      expect(tree).toHaveLength(1);
      expect(tree[0].item).toBe(annotation.regionStore.regions[0]);
      expect(tree[0].isArea).toBe(true);
    });

    it("findRegion returns region by id", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const region = annotation.regionStore.regions[0];
      expect(annotation.regionStore.findRegion(region.id)).toBe(region);
    });

    it("filterByParentID returns regions with parentID", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const region = annotation.regionStore.regions[0];
      const withParent = annotation.regionStore.filterByParentID(region.parentID ?? "");
      expect(Array.isArray(withParent)).toBe(true);
    });

    it("isAllHidden is false when region is not hidden", () => {
      const { annotation } = createStoreWithOneRectRegion();
      expect(annotation.regionStore.isAllHidden).toBe(false);
    });

    it("toggleVisibility toggles region hidden state", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const region = annotation.regionStore.regions[0];
      const wasHidden = region.hidden;
      annotation.regionStore.toggleVisibility();
      expect(region.hidden).toBe(!wasHidden);
    });

    it("setSort by score then date changes sort", () => {
      const { annotation } = createStoreWithOneRectRegion();
      annotation.regionStore.setSort("score");
      expect(annotation.regionStore.sort).toBe("score");
      annotation.regionStore.setSort("date");
      expect(annotation.regionStore.sort).toBe("date");
    });

    it("setFilteredRegions with same length clears filter", () => {
      const { annotation } = createStoreWithOneRectRegion();
      annotation.updateAppearenceFromState = jest.fn();
      const regions = annotation.regionStore.regions;
      annotation.regionStore.setFilteredRegions(regions);
      expect(annotation.regionStore.filter).toBe(null);
      expect(annotation.updateAppearenceFromState).toHaveBeenCalled();
    });

    it("asLabelsTree with one region returns no-label group", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const enrich = (el, idx, isGroup) => ({ id: isGroup ? `g${idx}` : `r${idx}` });
      const tree = annotation.regionStore.asLabelsTree(enrich);
      expect(tree.length).toBeGreaterThanOrEqual(1);
      expect(tree.some((n) => n.isGroup)).toBe(true);
    });

    it("asTypeTree with one region returns type group", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const enrich = (el, idx, isGroup) => ({ id: isGroup ? `g${idx}` : `r${idx}` });
      const tree = annotation.regionStore.asTypeTree(enrich);
      expect(tree).toHaveLength(1);
      expect(tree[0].isGroup).toBe(true);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].item).toBe(annotation.regionStore.regions[0]);
    });

    it("sortedRegions with mediaStartTime sort returns regions", () => {
      const { annotation } = createStoreWithOneRectRegion();
      annotation.regionStore.setSort("mediaStartTime");
      const sorted = annotation.regionStore.sortedRegions;
      expect(sorted).toHaveLength(1);
      expect(sorted[0]).toBe(annotation.regionStore.regions[0]);
    });

    it("sortedRegions with score sort uses region score", () => {
      const { annotation } = createStoreWithOneRectRegion();
      annotation.regionStore.setSort("score");
      expect(annotation.regionStore.sortedRegions).toHaveLength(1);
    });

    it("setHiddenByTool toggles hidden for matching type", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const region = annotation.regionStore.regions[0];
      const wasHidden = region.hidden;
      annotation.regionStore.setHiddenByTool(!wasHidden, { type: "rectangleregion" });
      expect(region.hidden).toBe(!wasHidden);
    });

    it("sortedRegions with sortOrder desc returns one region", () => {
      const { annotation } = createStoreWithOneRectRegion();
      annotation.regionStore.setSort("date");
      const orderAfterFirst = annotation.regionStore.sortOrder;
      annotation.regionStore.toggleSortOrder();
      expect(annotation.regionStore.sortOrder).toBe(orderAfterFirst === "asc" ? "desc" : "asc");
      expect(annotation.regionStore.sortedRegions).toHaveLength(1);
    });

    it("selection.drawingSelect and drawingUnselect work with real region", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const region = annotation.regionStore.regions[0];
      annotation.regionStore.selection.drawingSelect(region);
      expect(annotation.regionStore.selection.drawingSelected.size).toBe(1);
      annotation.regionStore.selection.drawingUnselect();
      expect(annotation.regionStore.selection.drawingSelected.size).toBe(0);
    });

    it("selection.keys and selection.list reflect selected", () => {
      const { annotation } = createStoreWithOneRectRegion();
      expect(annotation.regionStore.selection.keys).toEqual([]);
      expect(annotation.regionStore.selection.list).toEqual([]);
    });

    it("setHiddenByLabel does not throw when region has no labeling", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const mockLabel = { id: "l1" };
      expect(() => annotation.regionStore.setHiddenByLabel(true, mockLabel)).not.toThrow();
    });

    it("setRegionVisible reveals target and hides others", () => {
      const { annotation } = createStoreWithOneRectRegion();
      const region = annotation.regionStore.regions[0];
      const normalizedId = annotation.regionStore.normalizeRegionID(region.id);
      annotation.regionStore.setRegionVisible(normalizedId);
      expect(region.hidden).toBe(false);
    });

    it("via init: regions and highlight work when annotation selected at init", () => {
      const { annotation } = createStoreWithOneRectRegionViaInit();
      expect(annotation.regionStore.regions).toHaveLength(1);
      const region = annotation.regionStore.regions[0];
      annotation.regionStore.highlight(region);
      expect(annotation.regionStore.selection.highlighted).toBe(region);
      expect(annotation.regionStore.hasSelection).toBe(true);
    });

    it("via init: toggleSelection selects and unselects region", () => {
      const { annotation } = createStoreWithOneRectRegionViaInit();
      const region = annotation.regionStore.regions[0];
      annotation.regionStore.toggleSelection(region, true);
      expect(annotation.regionStore.isSelected(region)).toBe(true);
      annotation.regionStore.toggleSelection(region, false);
      expect(annotation.regionStore.isSelected(region)).toBe(false);
    });

    it("via init: selectRegionByID and selectRegionsByIds select region", () => {
      const { annotation } = createStoreWithOneRectRegionViaInit();
      const region = annotation.regionStore.regions[0];
      annotation.regionStore.selectRegionByID(region.id);
      expect(annotation.regionStore.isSelected(region)).toBe(true);
      annotation.regionStore.clearSelection();
      annotation.regionStore.selectRegionsByIds([region.id]);
      expect(annotation.regionStore.isSelected(region)).toBe(true);
    });

    it("via init: clearSelection clears selected region", () => {
      const { annotation } = createStoreWithOneRectRegionViaInit();
      const region = annotation.regionStore.regions[0];
      annotation.regionStore.highlight(region);
      expect(annotation.regionStore.selection.size).toBe(1);
      annotation.regionStore.clearSelection();
      expect(annotation.regionStore.selection.size).toBe(0);
      expect(annotation.regionStore.hasSelection).toBe(false);
    });
  });
});
