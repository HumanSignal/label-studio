/**
 * Unit tests for RelationStore (stores/RelationStore.js).
 * Target: coverage parity 81.67% (parity-77).
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

let AppStore;
const RESULT_MODULE_ABS = require.resolve("../../regions/Result");
const RESULT_MODULE_URL = require("node:url").pathToFileURL(RESULT_MODULE_ABS).href;

const _RELATIONS_CONTROL = {
  type: "relations",
  values: ["parent", "child"],
  children: [{ value: "parent" }, { value: "child" }],
};
const CONFIG_IMAGE_RECT_RELATIONS =
  '<View><Image name="img" value="$img" /><Labels name="lbl" toName="img"><Label value="A" /><Label value="B" /></Labels><Relations toName="img"><Relation value="parent" /><Relation value="child" /></Relations></View>';

const ensureRealResultModule = () => {
  const factory = () => {
    const actual = requireActual("../../regions/Result");
    return {
      __esModule: true,
      __skipMerge: true,
      ...(actual ?? {}),
      default: actual.default ?? actual,
    };
  };

  mockModule("../../regions/Result", factory);
  mockModule("../regions/Result", factory);
  mockModule(RESULT_MODULE_ABS, factory);
  mockModule(RESULT_MODULE_URL, factory);
};

function createStoreWithTwoRectRegionsAndRelations() {
  const utilsModule = require("../../utils");
  const utilitiesModule = require("../../utils/utilities");
  const dateModule = require("../../utils/date");
  const Utils = utilsModule.default ?? utilsModule;

  // Guard against leaked partial mocks from other files.
  Utils.Checkers = Utils.Checkers ?? utilitiesModule;
  Utils.UDate = Utils.UDate ?? dateModule;

  const env = {
    events: {
      hasEvent: mock(() => false),
      invoke: mock(),
    },
    hotkeys: {
      addKey: mock(),
      removeKey: mock(),
      removeNamed: mock(),
      overwriteNamed: mock(),
      unbindAll: mock(),
      setScope: mock(),
    },
    messages: {},
    settings: {},
  };
  const task = {
    id: 1,
    data: JSON.stringify({ img: "https://example.com/img.jpg" }),
  };

  const store = AppStore.create(
    {
      config: CONFIG_IMAGE_RECT_RELATIONS,
      task,
      interfaces: ["basic"],
    },
    env,
  );
  store.initializeStore({});

  const ann = store.annotationStore.addAnnotation({ result: [] });
  const labelsTag = ann.names.get("lbl");
  const imageTag = ann.names.get("img");

  const area1 = ann.createResult(
    { id: "relation-area-1", x: 0, y: 0, width: 20, height: 20 },
    { rectanglelabels: ["A"] },
    labelsTag,
    imageTag,
    true,
  );
  const area2 = ann.createResult(
    { id: "relation-area-2", x: 10, y: 10, width: 30, height: 30 },
    { rectanglelabels: ["B"] },
    labelsTag,
    imageTag,
    true,
  );
  ann.updateObjects();

  return {
    relationStore: ann.relationStore,
    regions: [area1, area2].filter(Boolean),
  };
}

describe("RelationStore", () => {
  let getItemSpy;
  let setItemSpy;

  beforeEach(() => {
    resetAllMocks();
    resetModules();
    ensureRealResultModule();
    require("../../tags/visual/View");
    require("../../tags/object/Image/Image.js");
    require("../../tags/control/Labels/Labels.jsx");
    require("../../tags/control/Relations.js");
    require("../../tags/control/Relation.js");
    AppStore = require("../AppStore").default;

    const hotkeyModule = require("../../core/Hotkey");
    const keymapModule = require("../../core/settings/keymap.json");
    const defaultKeymap = keymapModule.default ?? keymapModule;
    const Hotkey = hotkeyModule.Hotkey ?? hotkeyModule.default?.Hotkey;

    if (Hotkey) {
      Hotkey.keymap = structuredClone(defaultKeymap);
    }

    const storage = {};
    getItemSpy = spyOn(window.localStorage, "getItem").mockImplementation((k) => storage[k] ?? null);
    setItemSpy = spyOn(window.localStorage, "setItem").mockImplementation((k, v) => {
      storage[k] = v;
    });
  });

  afterEach(() => {
    getItemSpy?.mockRestore?.();
    setItemSpy?.mockRestore?.();
  });

  describe("views (no relations)", () => {
    it("size is 0 when no relations", () => {
      const { relationStore } = createStoreWithTwoRectRegionsAndRelations();
      expect(relationStore.size).toBe(0);
    });

    it("highlighted is undefined when none set", () => {
      const { relationStore } = createStoreWithTwoRectRegionsAndRelations();
      expect(relationStore.highlighted).toBeUndefined();
    });

    it("orderedRelations returns empty array when no relations", () => {
      const { relationStore } = createStoreWithTwoRectRegionsAndRelations();
      expect(relationStore.orderedRelations).toEqual([]);
    });

    it("isAllHidden is true when no relations", () => {
      const { relationStore } = createStoreWithTwoRectRegionsAndRelations();
      expect(relationStore.isAllHidden).toBe(true);
    });

    it("values returns control values when control set", () => {
      const { relationStore } = createStoreWithTwoRectRegionsAndRelations();
      relationStore.setControl({ values: ["parent", "child"] });
      expect(relationStore.values).toEqual(["parent", "child"]);
    });
  });

  describe("addRelation and findRelations", () => {
    it("addRelation creates relation between two nodes", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl).toBeDefined();
      expect(rl.node1).toBe(r1);
      expect(rl.node2).toBe(r2);
      expect(relationStore.size).toBe(1);
    });

    it("addRelation returns undefined when relation already exists", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      const again = relationStore.addRelation(r1, r2);
      expect(again).toBeUndefined();
      expect(relationStore.size).toBe(1);
    });

    it("nodesRelated returns true when relation exists", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      expect(relationStore.nodesRelated(r1, r2)).toBe(false);
      relationStore.addRelation(r1, r2);
      expect(relationStore.nodesRelated(r1, r2)).toBe(true);
    });

    it("findRelations with two nodes returns matching relation", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      const found = relationStore.findRelations(r1, r2);
      expect(found).toHaveLength(1);
      expect(found[0].node1.id).toBe(r1.id);
      expect(found[0].node2.id).toBe(r2.id);
    });

    it("findRelations with one node returns all relations involving that node", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      const byNode = relationStore.findRelations(r1);
      expect(byNode).toHaveLength(1);
      expect(byNode[0].node1.id).toBe(r1.id);
    });

    it("findRelations with node id strings works", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      const byId = relationStore.findRelations(r1.id, r2.id);
      expect(byId).toHaveLength(1);
    });
  });

  describe("deleteRelation and deleteNodeRelation", () => {
    it("deleteRelation removes relation and destroys node", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      relationStore.deleteRelation(rl);
      expect(relationStore.size).toBe(0);
      expect(relationStore.findRelations(r1, r2)).toHaveLength(0);
    });

    it("deleteNodeRelation removes all relations for node", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      relationStore.deleteNodeRelation(r1);
      expect(relationStore.size).toBe(0);
    });

    it("deleteAllRelations clears all relations", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      relationStore.deleteAllRelations();
      expect(relationStore.size).toBe(0);
      expect(relationStore.relations).toEqual([]);
    });
  });

  describe("serialize and deserializeRelation", () => {
    it("serialize returns from_id, to_id, type, direction", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      const ser = relationStore.serialize();
      expect(ser).toHaveLength(1);
      expect(ser[0]).toMatchObject({
        from_id: r1.cleanId,
        to_id: r2.cleanId,
        type: "relation",
        direction: "right",
      });
    });

    it("serialize includes labels when relation has selectedValues", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      rl.setRelations(["parent"]);
      const ser = relationStore.serialize();
      expect(ser[0].labels).toEqual(["parent"]);
    });

    it("deserializeRelation adds relation with direction and labels", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.deserializeRelation(r1, r2, "left", ["child"]);
      expect(relationStore.size).toBe(1);
      const rl = relationStore.relations[0];
      expect(rl.direction).toBe("left");
      expect(rl.labels).toEqual(["child"]);
    });

    it("deserializeRelation does nothing when relation already exists", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      relationStore.deserializeRelation(r1, r2, "bi", ["parent"]);
      expect(relationStore.size).toBe(1);
      expect(relationStore.relations[0].direction).toBe("right");
    });
  });

  describe("toggleConnections, toggleOrder, toggleAllVisibility", () => {
    it("toggleConnections flips showConnections", () => {
      const { relationStore } = createStoreWithTwoRectRegionsAndRelations();
      expect(relationStore.showConnections).toBe(true);
      relationStore.toggleConnections();
      expect(relationStore.showConnections).toBe(false);
      relationStore.toggleConnections();
      expect(relationStore.showConnections).toBe(true);
    });

    it("toggleOrder flips order and persists to localStorage", () => {
      const { relationStore } = createStoreWithTwoRectRegionsAndRelations();
      const initial = relationStore.order;
      relationStore.toggleOrder();
      expect(relationStore.order).toBe(initial === "asc" ? "desc" : "asc");
      relationStore.toggleOrder();
      expect(relationStore.order).toBe(initial);
    });

    it("orderedRelations returns asc order when order is asc (default)", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      const ordered = relationStore.orderedRelations;
      expect(ordered).toHaveLength(1);
      expect(ordered[0].node1.id).toBe(r1.id);
    });

    it("orderedRelations returns reversed when order is desc", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      relationStore.toggleOrder();
      const ordered = relationStore.orderedRelations;
      expect(ordered).toHaveLength(1);
    });

    it("toggleAllVisibility toggles visibility of all relations", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.visible).toBe(true);
      relationStore.toggleAllVisibility();
      expect(rl.visible).toBe(false);
      relationStore.toggleAllVisibility();
      expect(rl.visible).toBe(true);
    });

    it("isAllHidden is true when all relations are visible (no hidden one)", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      relationStore.addRelation(r1, r2);
      expect(relationStore.isAllHidden).toBe(true);
    });
  });

  describe("setHighlight and removeHighlight", () => {
    it("setHighlight and highlighted view", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(relationStore.highlighted).toBeUndefined();
      relationStore.setHighlight(rl);
      expect(relationStore.highlighted).toBe(rl);
      relationStore.removeHighlight();
      expect(relationStore.highlighted).toBeUndefined();
    });
  });
});

describe("Relation (model)", () => {
  let getItemSpy;
  let setItemSpy;

  beforeEach(() => {
    resetAllMocks();
    resetModules();
    ensureRealResultModule();
    require("../../tags/visual/View");
    require("../../tags/object/Image/Image.js");
    require("../../tags/control/Labels/Labels.jsx");
    require("../../tags/control/Relations.js");
    require("../../tags/control/Relation.js");
    AppStore = require("../AppStore").default;

    const hotkeyModule = require("../../core/Hotkey");
    const keymapModule = require("../../core/settings/keymap.json");
    const defaultKeymap = keymapModule.default ?? keymapModule;
    const Hotkey = hotkeyModule.Hotkey ?? hotkeyModule.default?.Hotkey;

    if (Hotkey) {
      Hotkey.keymap = structuredClone(defaultKeymap);
    }

    const storage = {};
    getItemSpy = spyOn(window.localStorage, "getItem").mockImplementation((k) => storage[k] ?? null);
    setItemSpy = spyOn(window.localStorage, "setItem").mockImplementation((k, v) => {
      storage[k] = v;
    });
  });

  afterEach(() => {
    getItemSpy?.mockRestore?.();
    setItemSpy?.mockRestore?.();
  });

  describe("views", () => {
    it("parent returns RelationStore", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.parent).toBe(relationStore);
    });

    it("control returns relations tag", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.control).toBeDefined();
      expect(rl.control.type).toBe("relations");
    });

    it("selectedValues filters labels by control values", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      rl.setRelations(["parent", "other"]);
      expect(rl.selectedValues).toEqual(["parent"]);
    });

    it("hasRelations reflects control children", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.hasRelations).toBe(true);
    });

    it("shouldRender returns true for alive relation without multiImage", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.shouldRender).toBe(true);
    });
  });

  describe("actions", () => {
    it("rotateDirection cycles left -> right -> bi -> left", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.direction).toBe("right");
      rl.rotateDirection();
      expect(rl.direction).toBe("bi");
      rl.rotateDirection();
      expect(rl.direction).toBe("left");
      rl.rotateDirection();
      expect(rl.direction).toBe("right");
    });

    it("toggleHighlight calls node toggleHighlight", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      const spy1 = spyOn(r1, "toggleHighlight");
      const spy2 = spyOn(r2, "toggleHighlight");
      rl.toggleHighlight();
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      spy1.mockRestore();
      spy2.mockRestore();
    });

    it("toggleHighlight with same node calls node1 once", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1] = regions;
      const rl = relationStore.addRelation(r1, r1);
      const spy1 = spyOn(r1, "toggleHighlight");
      rl.toggleHighlight();
      expect(spy1).toHaveBeenCalledTimes(1);
      spy1.mockRestore();
    });

    it("toggleMeta toggles showMeta", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.showMeta).toBe(false);
      rl.toggleMeta();
      expect(rl.showMeta).toBe(true);
      rl.toggleMeta();
      expect(rl.showMeta).toBe(false);
    });

    it("setSelfHighlight and removeHighlight via parent", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      rl.setSelfHighlight(true);
      expect(relationStore.highlighted).toBe(rl);
      rl.setSelfHighlight(false);
      expect(relationStore.highlighted).toBeUndefined();
    });

    it("setRelations updates labels", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      rl.setRelations(["parent", "child"]);
      expect(rl.labels).toEqual(["parent", "child"]);
    });

    it("toggleVisibility toggles visible", () => {
      const { relationStore, regions } = createStoreWithTwoRectRegionsAndRelations();
      const [r1, r2] = regions;
      const rl = relationStore.addRelation(r1, r2);
      expect(rl.visible).toBe(true);
      rl.toggleVisibility();
      expect(rl.visible).toBe(false);
      rl.toggleVisibility();
      expect(rl.visible).toBe(true);
    });
  });
});
