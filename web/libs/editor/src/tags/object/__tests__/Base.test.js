/**
 * Unit tests for object Base (tags/object/Base.js) — ObjectBase + BaseTag + AnnotationMixin.
 */
import { types } from "mobx-state-tree";
import ObjectTag from "../Base";
import InfoModal from "../../../components/Infomodal/Infomodal";

const mockUnselectAll = jest.fn();
const mockRegionStore = { regions: [] };
const mockAnnotation = {
  regionStore: mockRegionStore,
  unselectAll: mockUnselectAll,
};
const mockAnnotationStore = {
  selected: mockAnnotation,
  selectedHistory: mockAnnotation,
};

jest.mock("../../../utils/feature-flags", () => ({
  FF_DEV_3391: "FF_DEV_3391",
  isFF: jest.fn(() => false),
}));

jest.mock("../../../components/Infomodal/Infomodal", () => ({
  __esModule: true,
  default: { warning: jest.fn() },
}));

// Extended model so we have .regions and .states()/.activeStates() (required by findRegion and getAvailableStates)
const ObjectTagWithRegions = types
  .compose(
    ObjectTag,
    types.model({
      regions: types.optional(types.array(types.frozen()), []),
    }),
  )
  .views((self) => ({
    states() {
      return [];
    },
    activeStates() {
      return [];
    },
  }));

const Root = types
  .model({
    child: ObjectTagWithRegions,
  })
  .volatile(() => ({
    annotationStore: mockAnnotationStore,
  }));

function createNode(snapshot = {}) {
  const root = Root.create({
    child: {
      name: "obj1",
      regions: [],
      ...snapshot,
    },
  });
  return root.child;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRegionStore.regions = [];
});

describe("Object Base (tags/object/Base.js)", () => {
  describe("volatile", () => {
    it("has isObjectTag true and supportSuggestions false", () => {
      const node = createNode();
      expect(node.isObjectTag).toBe(true);
      expect(node.supportSuggestions).toBe(false);
    });
  });

  describe("addProp / getProps", () => {
    it("addProp stores props and increments _needsUpdate", () => {
      const node = createNode();
      expect(node._needsUpdate).toBe(0);
      node.addProp("foo", "bar");
      expect(node.getProps()).toEqual({ foo: "bar" });
      expect(node._needsUpdate).toBe(1);
      node.addProp("baz", 42);
      expect(node.getProps()).toEqual({ foo: "bar", baz: 42 });
      expect(node._needsUpdate).toBe(2);
    });
  });

  describe("allRegs / regs", () => {
    it("allRegs returns regions from annotation.regionStore where r.object === self", () => {
      const node = createNode();
      const other = {};
      mockRegionStore.regions = [
        { object: node, id: "r1" },
        { object: other, id: "r2" },
        { object: node, id: "r3" },
      ];
      expect(node.allRegs).toHaveLength(2);
      expect(node.allRegs.map((r) => r.id)).toEqual(["r1", "r3"]);
      expect(node.regs).toEqual(node.allRegs);
    });

    it("allRegs returns empty array when annotation or regionStore missing", () => {
      mockAnnotationStore.selected = null;
      mockAnnotationStore.selectedHistory = null;
      const node = createNode();
      expect(node.allRegs).toEqual([]);
      mockAnnotationStore.selected = mockAnnotation;
      mockAnnotationStore.selectedHistory = mockAnnotation;
    });
  });

  describe("findRegion", () => {
    it("finds region by params in self.regions via isMatch", () => {
      const node = createNode({
        regions: [
          { id: "a", type: "rect" },
          { id: "b", type: "ellipse" },
        ],
      });
      const r1 = node.regions[0];
      const r2 = node.regions[1];
      expect(node.findRegion({ id: "a" })).toBe(r1);
      expect(node.findRegion({ type: "ellipse" })).toBe(r2);
      expect(node.findRegion({ id: "c" })).toBeUndefined();
    });

    it("uses _regionsCache when present and finds match", () => {
      const region = { id: "x" };
      const node = createNode({ regions: [{ id: "y" }] });
      node._regionsCache = [{ region }];
      expect(node.findRegion({ id: "x" })).toEqual({ region });
    });

    it("falls back to self.regions when _regionsCache has no match", () => {
      const node = createNode({
        regions: [{ id: "other" }, { id: "target" }],
      });
      node._regionsCache = [{ region: { id: "other" } }];
      expect(node.findRegion({ id: "target" })).toBe(node.regions[1]);
    });
  });

  describe("isReady", () => {
    it("returns true", () => {
      const node = createNode();
      expect(node.isReady).toBe(true);
    });
  });

  describe("getAvailableStates", () => {
    it("returns activeStates when states exist and none exceeded", () => {
      const active = [{ value: "A" }];
      const WithStates = types
        .compose(ObjectTag, types.model({ regions: types.optional(types.array(types.frozen()), []) }))
        .views((self) => ({
          states() {
            return [{ value: "A", selected: false, setSelected: jest.fn(), checkMaxUsages: undefined }];
          },
          activeStates() {
            return active;
          },
        }));
      const Root2 = types.model({ child: WithStates }).volatile(() => ({ annotationStore: mockAnnotationStore }));
      const root = Root2.create({ child: { name: "x", regions: [] } });
      expect(root.child.getAvailableStates()).toEqual(active);
    });

    it("calls unselectAll and returns [] when activeStates is empty", () => {
      const node = createNode();
      expect(node.getAvailableStates()).toEqual([]);
      expect(mockUnselectAll).toHaveBeenCalled();
    });

    it("shows InfoModal.warning and unselects when maxUsages exceeded", () => {
      const setSelected = jest.fn();
      const exceededItem = { value: "L1", maxUsages: 1, selected: true, setSelected };
      const ExceededState = types
        .compose(ObjectTag, types.model({ regions: types.optional(types.array(types.frozen()), []) }))
        .views((self) => ({
          states() {
            return [{ ...exceededItem, checkMaxUsages: () => [exceededItem] }];
          },
          activeStates() {
            return [];
          },
        }));
      const RootExceeded = types
        .model({ child: ExceededState })
        .volatile(() => ({ annotationStore: mockAnnotationStore }));
      const root = RootExceeded.create({ child: { name: "x", regions: [] } });
      root.child.getAvailableStates();
      expect(setSelected).toHaveBeenCalledWith(false);
      expect(InfoModal.warning).toHaveBeenCalledWith("You can't use L1 more than 1 time(s)");
      expect(mockUnselectAll).toHaveBeenCalled();
    });
  });
});
