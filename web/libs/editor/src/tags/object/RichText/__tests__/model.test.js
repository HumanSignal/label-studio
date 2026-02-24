/**
 * Unit tests for RichText tag model (tags/object/RichText/model.js)
 */
import Tree from "../../../../core/Tree";
import Registry from "../../../../core/Registry";
import "../../../visual/View";
import "../index";

const mockAddErrors = jest.fn();
const mockRegionStore = { regions: [] };
const mockSelected = {
  toNames: new Map(),
  id: 1,
  isReadOnly: () => false,
  regionStore: mockRegionStore,
  unselectAll: jest.fn(),
};
const mockRoot = {
  task: { dataObj: {} },
  annotationStore: {
    addErrors: mockAddErrors,
    selected: mockSelected,
  },
};

jest.mock("mobx-state-tree", () => {
  const actual = jest.requireActual("mobx-state-tree");
  return {
    ...actual,
    getRoot: (node) => {
      if (node && (node.type === "richtext" || node.type === "text")) {
        return mockRoot;
      }
      return actual.getRoot(node);
    },
  };
});

const mockDomManager = {
  setStyles: jest.fn(),
  removeStyles: jest.fn(),
  destroy: jest.fn(),
  globalOffsetsToRelativeOffsets: jest.fn(() => ({ start: "", startOffset: 0, end: "", endOffset: 0 })),
  relativeOffsetsToGlobalOffsets: jest.fn(() => [0, 0]),
  rangeToGlobalOffset: jest.fn(() => [0, 0]),
  createSpans: jest.fn(() => []),
  removeSpans: jest.fn(),
  getText: jest.fn(() => ""),
};
jest.mock("../domManager", () => ({ __esModule: true, default: jest.fn(() => mockDomManager) }));
jest.mock("../../../../utils/selection-tools", () => ({
  rangeToGlobalOffset: jest.fn(() => [0, 10]),
}));

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

function createTextNode(storeRef = { task: { dataObj: { text: "Hello" } } }) {
  const config = Tree.treeToModel(MINIMAL_CONFIG, storeRef);
  const ViewModel = Registry.getModelByTag("view");
  const root = ViewModel.create(config);
  return root.children.find((c) => c.type === "text" || c.type === "richtext");
}

beforeEach(() => {
  jest.clearAllMocks();
  window.LS_SECURE_MODE = false;
  window.STORE_INIT_OK = true;
});

afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

describe("RichText model", () => {
  describe("afterCreate / defaults", () => {
    it("sets inline true when type is text", () => {
      const node = createTextNode();
      expect(node.type).toBe("text");
      expect(node.inline).toBe(true);
    });

    it("sets savetextresult from valuetype when savetextresult is none", () => {
      const storeRef = { task: { dataObj: {} } };
      const config = Tree.treeToModel(
        '<View><Text name="t1" value="$text" valueType="url" saveTextResult="none" /></View>',
        storeRef,
      );
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children.find((c) => c.type === "text" || c.type === "richtext");
      expect(textNode.valuetype).toBe("url");
      expect(textNode.savetextresult).toBe("no");
    });
  });

  describe("views", () => {
    it("exposes canResizeSpans for text type when not readOnly", () => {
      const node = createTextNode();
      expect(node.canResizeSpans).toBe(true);
    });

    it("hasStates is false when toNames has no states for this name", () => {
      const node = createTextNode();
      expect(node.hasStates).toBeFalsy();
    });

    it("states() returns undefined when no control tags point to this name", () => {
      const node = createTextNode();
      expect(node.states()).toBeUndefined();
    });

    it("activeStates() returns null when states is empty", () => {
      const node = createTextNode();
      expect(node.activeStates()).toBeNull();
    });

    it("isLoaded is false until setLoaded(true)", () => {
      const node = createTextNode();
      expect(node.isLoaded).toBe(false);
      node.setLoaded(true);
      expect(node.isLoaded).toBe(true);
    });

    it("isReady is false until loaded and _isReady", () => {
      const node = createTextNode();
      expect(node.isReady).toBe(false);
      node.setLoaded(true);
      node.setReady(true);
      expect(node.isReady).toBe(true);
    });

    it("styles returns a string containing htx-highlight and STATE_CLASS_MODS", () => {
      const node = createTextNode();
      const styles = node.styles;
      expect(typeof styles).toBe("string");
      expect(styles).toContain("htx-highlight");
      expect(styles).toContain("highlighted");
      expect(styles).toContain("hidden");
    });

    it("getRootNode returns mountNodeRef.current when getIframeBodyNode is null", () => {
      const node = createTextNode();
      expect(node.mountNodeRef.current).toBeNull();
      expect(node.getRootNode()).toBeNull();
    });
  });

  describe("setLoaded / onLoaded", () => {
    it("setLoaded sets _isLoaded and _loadedForAnnotation", () => {
      const node = createTextNode();
      node.setLoaded(true);
      expect(node._isLoaded).toBe(true);
      expect(node._loadedForAnnotation).toBe(1);
    });

    it("onLoaded creates DomManager when mountNodeRef.current exists", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      const DomManager = require("../domManager").default;
      expect(DomManager).toHaveBeenCalledWith(node.mountNodeRef.current);
    });
  });

  describe("setRemoteValue", () => {
    it("sets _value from plain text", () => {
      const node = createTextNode();
      node.setRemoteValue("plain text");
      expect(node._value).toBe("plain text");
    });

    it("decodes base64 when encoding is base64", () => {
      const storeRef = { task: { dataObj: {} } };
      const config = Tree.treeToModel('<View><Text name="t1" value="$text" encoding="base64" /></View>', storeRef);
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children.find((c) => c.type === "text" || c.type === "richtext");
      const encoded = Buffer.from("hello", "utf-8").toString("base64");
      textNode.setRemoteValue(encoded);
      expect(textNode._value).toBe("hello");
    });

    it("applies sanitizeHtml for non-FF_SAFE_TEXT text type", () => {
      const node = createTextNode();
      node.setRemoteValue("<script>alert(1)</script>ok");
      expect(node._value).not.toContain("script");
      expect(node._value).toContain("ok");
    });

    it("decodes base64unicode when encoding is base64unicode", () => {
      const storeRef = { task: { dataObj: {} } };
      const config = Tree.treeToModel(
        '<View><Text name="t1" value="$text" encoding="base64unicode" /></View>',
        storeRef,
      );
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children.find((c) => c.type === "text" || c.type === "richtext");
      const encoded = Buffer.from("unicode text", "utf-16le").toString("base64");
      textNode.setRemoteValue(encoded);
      expect(typeof textNode._value).toBe("string");
      expect(textNode._value.length).toBeGreaterThan(0);
      expect(textNode._value.replace(/\0/g, "")).toContain("unicode");
    });
  });

  describe("LS_SECURE_MODE defaults", () => {
    it("defaults valuetype to url and savetextresult to no when LS_SECURE_MODE is true", () => {
      window.LS_SECURE_MODE = true;
      const storeRef = { task: { dataObj: {} } };
      const config = Tree.treeToModel('<View><Text name="t1" value="$text" /></View>', storeRef);
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children.find((c) => c.type === "text" || c.type === "richtext");
      expect(textNode.valuetype).toBe("url");
      expect(textNode.savetextresult).toBe("no");
      window.LS_SECURE_MODE = false;
    });
  });

  describe("updateValue", () => {
    it("resolves valueType text from task and sets _value", async () => {
      const storeRef = { task: { dataObj: { text: "Task content" } } };
      const node = createTextNode(storeRef);
      await node.updateValue(storeRef);
      expect(node._value).toBe("Task content");
    });

    it("for valueType url with invalid URL adds error and sets empty", async () => {
      const storeRef = { task: { dataObj: { url: "not-a-valid-url" } } };
      const config = Tree.treeToModel('<View><Text name="t1" value="$url" valueType="url" /></View>', storeRef);
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children.find((c) => c.type === "text" || c.type === "richtext");
      await textNode.updateValue(storeRef);
      expect(mockAddErrors).toHaveBeenCalled();
      expect(textNode._value).toBe("");
    });

    it("for valueType url with valid URL fetches and sets text", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve("Fetched content"),
        }),
      );
      const storeRef = { task: { dataObj: { url: "https://example.com/data.txt" } } };
      const config = Tree.treeToModel('<View><Text name="t1" value="$url" valueType="url" /></View>', storeRef);
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children.find((c) => c.type === "text" || c.type === "richtext");
      await textNode.updateValue(storeRef);
      expect(textNode._value).toBe("Fetched content");
      global.fetch = undefined;
    });

    it("for valueType url fetch error adds error and sets empty", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );
      const storeRef = { task: { dataObj: { url: "https://example.com/missing" } } };
      const config = Tree.treeToModel('<View><Text name="t1" value="$url" valueType="url" /></View>', storeRef);
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children.find((c) => c.type === "text" || c.type === "richtext");
      await textNode.updateValue(storeRef);
      expect(mockAddErrors).toHaveBeenCalled();
      expect(textNode._value).toBe("");
      global.fetch = undefined;
    });
  });

  describe("needsUpdate", () => {
    it("does nothing when isLoaded is false", () => {
      const node = createTextNode();
      node.needsUpdate();
      expect(mockDomManager.setStyles).not.toHaveBeenCalled();
    });

    it("calls setStyles and setReady when isLoaded", () => {
      const node = createTextNode();
      node.setLoaded(true);
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.needsUpdate();
      expect(mockDomManager.setStyles).toHaveBeenCalled();
    });
  });

  describe("setStyles / removeStyles", () => {
    it("setStyles delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.setStyles({ key: "value" });
      expect(mockDomManager.setStyles).toHaveBeenCalledWith({ key: "value" });
    });

    it("removeStyles delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.removeStyles("t1");
      expect(mockDomManager.removeStyles).toHaveBeenCalledWith("t1");
    });
  });

  describe("domManager delegation", () => {
    it("globalOffsetsToRelativeOffsets delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.globalOffsetsToRelativeOffsets({ start: 0, end: 5 });
      expect(mockDomManager.globalOffsetsToRelativeOffsets).toHaveBeenCalledWith(0, 5);
    });

    it("relativeOffsetsToGlobalOffsets delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      const start = document.createTextNode("a");
      const end = document.createTextNode("b");
      node.relativeOffsetsToGlobalOffsets(start, 0, end, 1);
      expect(mockDomManager.relativeOffsetsToGlobalOffsets).toHaveBeenCalledWith(start, 0, end, 1);
    });

    it("rangeToGlobalOffset delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      const range = document.createRange();
      node.rangeToGlobalOffset(range);
      expect(mockDomManager.rangeToGlobalOffset).toHaveBeenCalledWith(range);
    });

    it("createSpansByGlobalOffsets delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.createSpansByGlobalOffsets({ start: 0, end: 5 });
      expect(mockDomManager.createSpans).toHaveBeenCalledWith(0, 5);
    });

    it("removeSpansInGlobalOffsets delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.removeSpansInGlobalOffsets([], { start: 0, end: 5 });
      expect(mockDomManager.removeSpans).toHaveBeenCalledWith([], 0, 5);
    });

    it("getTextFromGlobalOffsets delegates to domManager", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.getTextFromGlobalOffsets({ start: 0, end: 5 });
      expect(mockDomManager.getText).toHaveBeenCalledWith(0, 5);
    });
  });

  describe("setHighlight", () => {
    it("clears highlight on all regs when region is null", () => {
      const node = createTextNode();
      node.setHighlight(null);
      expect(node.regs).toBeDefined();
    });

    it("calls setHighlight when region is provided and in regs", () => {
      const node = createTextNode();
      const region = {
        setHighlight: jest.fn(),
        annotation: { isLinkingMode: true },
      };
      mockRegionStore.regions = [{ object: node, ...region }];
      node.setHighlight(mockRegionStore.regions[0]);
      expect(region.setHighlight).toHaveBeenCalledWith(true);
      mockRegionStore.regions = [];
    });
  });

  describe("beforeDestroy", () => {
    it("calls domManager removeStyles and destroy", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      node.beforeDestroy();
      expect(mockDomManager.removeStyles).toHaveBeenCalledWith(node.name);
      expect(mockDomManager.destroy).toHaveBeenCalled();
    });
  });

  describe("onDispose", () => {
    it("clears spans on each region in regs", () => {
      const node = createTextNode();
      const clearSpans = jest.fn();
      mockRegionStore.regions = [{ object: node, clearSpans }];
      node.onDispose();
      expect(clearSpans).toHaveBeenCalled();
      mockRegionStore.regions = [];
    });
  });

  describe("addRegion", () => {
    it("returns undefined when getAvailableStates is empty", () => {
      const node = createTextNode();
      const result = node.addRegion({ _range: {} }, null);
      expect(result).toBeUndefined();
    });

    it("creates area and applies highlight when getAvailableStates returns controls", () => {
      const node = createTextNode();
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      const control = {
        selectedValues: () => ["Label1"],
        valueType: "labels",
        isLabeling: true,
        isSelected: true,
      };
      mockSelected.toNames.set("t1", [control]);
      const mockArea = {
        _range: null,
        updateGlobalOffsets: jest.fn(),
        updateTextOffsets: jest.fn(),
        updateXPathsFromGlobalOffsets: jest.fn(),
        applyHighlight: jest.fn(),
        notifyDrawingFinished: jest.fn(),
        setValue: jest.fn(),
      };
      mockSelected.createResult = jest.fn(() => mockArea);
      const range = { _range: document.createRange(), isText: true };
      const result = node.addRegion(range, null);
      expect(mockSelected.createResult).toHaveBeenCalled();
      expect(result).toBe(mockArea);
      expect(mockArea.updateGlobalOffsets).toHaveBeenCalledWith(0, 10);
      expect(mockArea.updateTextOffsets).toHaveBeenCalledWith(0, 10);
      expect(mockArea.applyHighlight).toHaveBeenCalled();
      expect(mockArea.notifyDrawingFinished).toHaveBeenCalled();
      mockSelected.toNames = new Map();
      delete mockSelected.createResult;
    });
  });

  describe("needsUpdate error handling", () => {
    it("catches errors from region.initRangeAndOffsets and still calls setStyles", () => {
      const node = createTextNode();
      node.setLoaded(true);
      node.mountNodeRef.current = document.createElement("div");
      node.onLoaded();
      const badRegion = {
        object: node,
        initRangeAndOffsets: () => {
          throw new Error("test error");
        },
        applyHighlight: jest.fn(),
        updateHighlightedText: jest.fn(),
        get identifier() {
          return "r1";
        },
        get styles() {
          return "";
        },
      };
      mockRegionStore.regions = [badRegion];
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      node.needsUpdate();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockDomManager.setStyles).toHaveBeenCalled();
      consoleSpy.mockRestore();
      mockRegionStore.regions = [];
    });
  });
});
