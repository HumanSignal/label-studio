/**
 * Unit tests for HighlightMixin (mixins/HighlightMixin.js)
 */
import { getRoot, types } from "mobx-state-tree";

const mockSpan = (overrides = {}) => {
  const span = {
    isConnected: true,
    className: "",
    setAttribute: jest.fn(),
    classList: { add: jest.fn(), remove: jest.fn() },
    prepend: jest.fn(),
    append: jest.fn(),
    getAttribute: jest.fn((name) => (name === "data-start" ? "0" : "10")),
    querySelectorAll: jest.fn(() => []),
    scrollIntoView: jest.fn(),
    scrollIntoViewIfNeeded: jest.fn(),
    ...overrides,
  };
  return span;
};

jest.mock("../../utils", () => ({
  __esModule: true,
  default: {
    Colors: {
      convertToRGBA: jest.fn((color, alpha) => (color ? `rgba(0,0,0,${alpha})` : "rgba(210,147,93,0.3)")),
      contrastColor: jest.fn(() => "#fff"),
    },
    Selection: {
      applySpanStyles: jest.fn(),
    },
  },
}));

import { HighlightMixin, STATE_CLASS_MODS } from "../HighlightMixin";

const Base = types
  .model("HighlightTestBase", {
    id: types.optional(types.string, "region-1"),
    ouid: types.optional(types.string, "ouid-1"),
  })
  .volatile(() => ({
    parent: {
      showlabels: undefined,
      highlightcolor: null,
      createSpansByGlobalOffsets: jest.fn(() => [mockSpan(), mockSpan()]),
      setStyles: jest.fn(),
      removeStyles: jest.fn(),
      removeSpansInGlobalOffsets: jest.fn(),
      getTextFromGlobalOffsets: jest.fn(() => "sample text"),
      canResizeSpans: false,
    },
    store: { settings: { showLabels: true } },
    selected: false,
    globalOffsets: { start: 0, end: 10 },
    text: null,
    region_index: 1,
    labeling: { selectedLabels: [{ value: "A" }] },
    style: null,
    tag: null,
    annotation: { setHighlightedNode: jest.fn() },
    hidden: false,
    highlighted: false,
    _highlighted: false,
  }))
  .views((self) => ({
    get highlighted() {
      return self._highlighted;
    },
  }))
  .actions((self) => ({
    setParent(p) {
      self.parent = { ...self.parent, ...p };
    },
    setStore(s) {
      self.store = s;
    },
    setSelected(v) {
      self.selected = v;
    },
    setGlobalOffsets(o) {
      self.globalOffsets = o;
    },
    setText(t) {
      self.text = t;
    },
    setLabeling(l) {
      self.labeling = l;
    },
    setRegionIndex(i) {
      self.region_index = i;
    },
    setSpans(s) {
      self._spans = s;
    },
    setHidden(v) {
      self.hidden = v;
    },
    setHighlighted(v) {
      self._highlighted = v;
    },
    setStyle(s) {
      self.style = s;
    },
    setTag(t) {
      self.tag = t;
    },
  }));

const TestModel = types.compose(Base, HighlightMixin);

const Root = types.model("Root", {
  settings: types.optional(types.frozen({ showLabels: true }), {}),
  node: TestModel,
});

function getTestTree(snap = {}) {
  const root = Root.create({
    settings: { showLabels: true },
    node: { id: "region-1", ouid: "ouid-1", ...snap },
  });
  return { model: root.node, root };
}

describe("HighlightMixin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("STATE_CLASS_MODS", () => {
    it("exports expected class name constants", () => {
      expect(STATE_CLASS_MODS.active).toBe("__active");
      expect(STATE_CLASS_MODS.highlighted).toBe("__highlighted");
      expect(STATE_CLASS_MODS.collapsed).toBe("__collapsed");
      expect(STATE_CLASS_MODS.hidden).toBe("__hidden");
      expect(STATE_CLASS_MODS.rightHandle).toBe("__resize_right");
      expect(STATE_CLASS_MODS.leftHandle).toBe("__resize_left");
      expect(STATE_CLASS_MODS.noLabel).toBe("htx-no-label");
    });
  });

  describe("_hasSpans", () => {
    it("returns false when _spans is null", () => {
      const { model } = getTestTree();
      expect(model._hasSpans).toBe(false);
    });

    it("returns true when all spans have isConnected true", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan({ isConnected: true }), mockSpan({ isConnected: true })]);
      expect(model._hasSpans).toBe(true);
    });

    it("returns false when any span has isConnected false", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan({ isConnected: true }), mockSpan({ isConnected: false })]);
      expect(model._hasSpans).toBe(false);
    });
  });

  describe("identifier", () => {
    it("returns id prefix and ouid", () => {
      const { model } = getTestTree();
      expect(model.identifier).toBe("region-1-ouid-1");
    });

    it("strips hash from id", () => {
      const root = Root.create({
        settings: {},
        node: { id: "region-1#xyz", ouid: "ouid-1" },
      });
      expect(root.node.identifier).toBe("region-1-ouid-1");
    });
  });

  describe("className", () => {
    it("returns htx-highlight-{identifier}", () => {
      const { model } = getTestTree();
      expect(model.className).toMatch(/^htx-highlight-region-1-ouid-1$/);
    });
  });

  describe("classNames", () => {
    it("includes no-label when store.settings.showLabels is false", () => {
      const { model } = getTestTree();
      model.setStore({ settings: { showLabels: false } });
      expect(model.classNames).toContain("htx-no-label");
    });

    it("includes no-label when parent.showlabels is false", () => {
      const { model } = getTestTree();
      model.setParent({ showlabels: false });
      expect(model.classNames).toContain("htx-no-label");
    });

    it("includes active when selected", () => {
      const { model } = getTestTree();
      model.setSelected(true);
      expect(model.classNames).toContain(STATE_CLASS_MODS.active);
    });

    it("includes htx-manual-label when parent.showlabels is defined", () => {
      const { model } = getTestTree();
      model.setParent({ showlabels: true });
      expect(model.classNames).toContain("htx-manual-label");
    });
  });

  describe("generateStyles", () => {
    it("returns CSS with background and active styles", () => {
      const { model } = getTestTree();
      const colors = {
        background: "rgba(0,0,0,0.3)",
        activeBackground: "rgba(0,0,0,0.8)",
        resizeBackground: "rgba(0,0,0,0.6)",
        activeText: "#fff",
      };
      const out = model.generateStyles("test-class", colors, false);
      expect(out).toContain(".test-class");
      expect(out).toContain("background-color: rgba(0,0,0,0.3)");
      expect(out).toContain("background-color: rgba(0,0,0,0.8)");
    });

    it("uses resizeBackground when resize is true", () => {
      const { model } = getTestTree();
      const colors = {
        background: "rgba(0,0,0,0.3)",
        activeBackground: "rgba(0,0,0,0.8)",
        resizeBackground: "rgba(0,0,0,0.6)",
        activeText: "#fff",
      };
      const out = model.generateStyles("test-class", colors, true);
      expect(out).toContain("rgba(0,0,0,0.6)");
    });
  });

  describe("styles and resizeStyles", () => {
    it("styles getter calls generateStyles with getColors()", () => {
      const { model } = getTestTree();
      const s = model.styles;
      expect(s).toContain(model.className);
    });

    it("resizeStyles getter passes resize true", () => {
      const { model } = getTestTree();
      const s = model.resizeStyles;
      expect(s).toContain(model.className);
    });
  });

  describe("applyHighlight", () => {
    it("creates spans and sets styles when not init", () => {
      const { model } = getTestTree();
      model.applyHighlight(false);
      expect(model.parent.createSpansByGlobalOffsets).toHaveBeenCalledWith(model.globalOffsets);
      expect(model.parent.setStyles).toHaveBeenCalled();
      expect(model._spans).toHaveLength(2);
    });

    it("does not call setStyles when init is true", () => {
      const { model } = getTestTree();
      model.applyHighlight(true);
      expect(model.parent.createSpansByGlobalOffsets).toHaveBeenCalled();
      expect(model.parent.setStyles).not.toHaveBeenCalled();
    });

    it("skips when _hasSpans is true", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan({ isConnected: true })]);
      model.applyHighlight(false);
      expect(model.parent.createSpansByGlobalOffsets).not.toHaveBeenCalled();
    });
  });

  describe("updateHighlightedText", () => {
    it("sets text from parent when text is null", () => {
      const { model } = getTestTree();
      model.updateHighlightedText();
      expect(model.parent.getTextFromGlobalOffsets).toHaveBeenCalledWith(model.globalOffsets);
      expect(model.text).toBe("sample text");
    });

    it("does not update when text is set unless force", () => {
      const { model } = getTestTree();
      model.setText("existing");
      model.updateHighlightedText();
      expect(model.text).toBe("existing");
      model.updateHighlightedText({ force: true });
      expect(model.text).toBe("sample text");
    });
  });

  describe("updateSpans", () => {
    it("calls applySpanStyles and setAttribute when _spans present", () => {
      const Utils = require("../../utils").default;
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.updateSpans();
      expect(Utils.Selection.applySpanStyles).toHaveBeenCalledWith(spans[1], expect.objectContaining({ index: 1 }));
      expect(spans[0].setAttribute).toHaveBeenCalledWith("data-start", 0);
      expect(spans[1].setAttribute).toHaveBeenCalledWith("data-end", 10);
    });

    it("does nothing when _spans is null", () => {
      const { model } = getTestTree();
      expect(() => model.updateSpans()).not.toThrow();
    });
  });

  describe("clearSpans", () => {
    it("sets _spans to null", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan()]);
      model.clearSpans();
      expect(model._spans).toBeNull();
    });
  });

  describe("removeHighlight", () => {
    it("calls parent removeSpansInGlobalOffsets and removeStyles", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.removeHighlight();
      expect(model.parent.removeSpansInGlobalOffsets).toHaveBeenCalledWith(spans, model.globalOffsets);
      expect(model.parent.removeStyles).toHaveBeenCalledWith([model.identifier]);
      expect(model._spans).toBeNull();
    });

    it("still removes styles when globalOffsets is null", () => {
      const { model } = getTestTree();
      model.setGlobalOffsets(null);
      model.setSpans([mockSpan()]);
      model.removeHighlight();
      expect(model.parent.removeStyles).toHaveBeenCalled();
    });
  });

  describe("updateAppearenceFromState", () => {
    it("returns early when no _spans", () => {
      const { model } = getTestTree();
      expect(() => model.updateAppearenceFromState()).not.toThrow();
    });

    it("adds htx-no-label to lastSpan when showLabels false", () => {
      const root = Root.create({
        settings: { showLabels: false },
        node: { id: "r1", ouid: "o1" },
      });
      const lastSpan = mockSpan();
      root.node.setSpans([mockSpan(), lastSpan]);
      root.node.setParent({ showlabels: false });
      root.node.updateAppearenceFromState();
      expect(lastSpan.classList.add).toHaveBeenCalledWith("htx-no-label");
    });

    it("removes htx-no-label when showLabels true", () => {
      const { model } = getTestTree();
      const lastSpan = mockSpan();
      model.setSpans([mockSpan(), lastSpan]);
      model.setParent({ showlabels: true });
      model.updateAppearenceFromState();
      expect(lastSpan.classList.remove).toHaveBeenCalledWith("htx-no-label");
    });

    it("recreates spans when canResizeSpans and offsets differ", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      spans[0].getAttribute = () => "0";
      spans[1].getAttribute = () => "5";
      model.setSpans(spans);
      model.setParent({
        canResizeSpans: true,
        setStyles: jest.fn(),
        removeStyles: jest.fn(),
        createSpansByGlobalOffsets: jest.fn(() => [mockSpan(), mockSpan()]),
      });
      model.setGlobalOffsets({ start: 0, end: 10 });
      model.updateAppearenceFromState();
      expect(model.parent.removeStyles).toHaveBeenCalled();
      expect(model.parent.createSpansByGlobalOffsets).toHaveBeenCalled();
    });

    it("calls setStyles when canResizeSpans and offsets match", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      spans[0].getAttribute = () => "0";
      spans[1].getAttribute = () => "10";
      model.setSpans(spans);
      model.setParent({
        canResizeSpans: true,
        setStyles: jest.fn(),
        removeStyles: jest.fn(),
        createSpansByGlobalOffsets: jest.fn(),
      });
      model.setGlobalOffsets({ start: 0, end: 10 });
      model.updateAppearenceFromState();
      expect(model.parent.setStyles).toHaveBeenCalled();
    });

    it("calls setStyles when canResizeSpans is false", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan(), mockSpan()]);
      model.setParent({ canResizeSpans: false, setStyles: jest.fn() });
      model.updateAppearenceFromState();
      expect(model.parent.setStyles).toHaveBeenCalled();
    });
  });

  describe("attachHandles", () => {
    it("prepends left handle to first span and appends right to last", () => {
      const { model } = getTestTree();
      const first = mockSpan();
      const last = mockSpan();
      model.setSpans([first, last]);
      model.attachHandles();
      expect(first.prepend).toHaveBeenCalled();
      expect(last.append).toHaveBeenCalled();
    });
  });

  describe("detachHandles", () => {
    it("removes area elements from spans", () => {
      const { model } = getTestTree();
      const span = mockSpan();
      const areas = [{ remove: jest.fn() }];
      span.querySelectorAll = () => areas;
      model.setSpans([span]);
      model.detachHandles();
      expect(areas[0].remove).toHaveBeenCalled();
    });
  });

  describe("selectRegion", () => {
    it("calls annotation.setHighlightedNode and addClass active", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.selectRegion();
      expect(model.annotation.setHighlightedNode).toHaveBeenCalledWith(model);
      expect(spans[0].classList.add).toHaveBeenCalledWith(STATE_CLASS_MODS.active);
    });

    it("attaches handles when parent.canResizeSpans", () => {
      const { model } = getTestTree();
      const first = mockSpan();
      model.setSpans([first, mockSpan()]);
      model.setParent({ canResizeSpans: true });
      model.selectRegion();
      expect(first.prepend).toHaveBeenCalled();
    });

    it("calls scrollIntoViewIfNeeded when available", () => {
      const { model } = getTestTree();
      const first = mockSpan();
      first.scrollIntoViewIfNeeded = jest.fn();
      model.setSpans([first, mockSpan()]);
      model.selectRegion();
      expect(first.scrollIntoViewIfNeeded).toHaveBeenCalled();
    });

    it("calls scrollIntoView when scrollIntoViewIfNeeded missing", () => {
      const { model } = getTestTree();
      const first = mockSpan();
      delete first.scrollIntoViewIfNeeded;
      model.setSpans([first, mockSpan()]);
      model.selectRegion();
      expect(first.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    });
  });

  describe("afterUnselectRegion", () => {
    it("removes active class and detaches handles when canResizeSpans", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.setParent({ canResizeSpans: true });
      model.afterUnselectRegion();
      expect(spans[0].classList.remove).toHaveBeenCalledWith(STATE_CLASS_MODS.active);
    });
  });

  describe("beforeDestroy", () => {
    it("calls parent removeStyles with identifier", () => {
      const { model } = getTestTree();
      model.beforeDestroy();
      expect(model.parent.removeStyles).toHaveBeenCalledWith([model.identifier]);
    });
  });

  describe("setHighlight", () => {
    it("returns early when no _spans", () => {
      const { model } = getTestTree();
      expect(() => model.setHighlight(true)).not.toThrow();
    });

    it("adds highlighted class when true", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.setHighlight(true);
      expect(model._highlighted).toBe(true);
      spans.forEach((s) => expect(s.classList.add).toHaveBeenCalledWith(STATE_CLASS_MODS.highlighted));
    });

    it("removes highlighted class when false", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.setHighlight(false);
      spans.forEach((s) => expect(s.classList.remove).toHaveBeenCalledWith(STATE_CLASS_MODS.highlighted));
    });
  });

  describe("getLabels", () => {
    it("returns index:labels when both present", () => {
      const { model } = getTestTree();
      expect(model.getLabels()).toBe("1:A");
    });

    it("filters empty index (0 is falsy)", () => {
      const { model } = getTestTree();
      model.setRegionIndex(0);
      model.setLabeling({ selectedLabels: [{ value: "X" }] });
      expect(model.getLabels()).toBe("X");
    });

    it("handles empty selectedLabels", () => {
      const { model } = getTestTree();
      model.setLabeling({ selectedLabels: [] });
      expect(model.getLabels()).toBe("1");
    });
  });

  describe("getColors", () => {
    it("uses parent.highlightcolor when set", () => {
      const Utils = require("../../utils").default;
      const { model } = getTestTree();
      model.setParent({ highlightcolor: "#abc" });
      model.getColors();
      expect(Utils.Colors.convertToRGBA).toHaveBeenCalled();
    });

    it("uses style.fillcolor when no parent highlightcolor", () => {
      const { model } = getTestTree();
      model.setParent({ highlightcolor: null });
      model.setStyle({ fillcolor: "#f00" });
      const c = model.getColors();
      expect(c.background).toBeDefined();
      expect(c.activeBackground).toBeDefined();
      expect(c.resizeBackground).toBeDefined();
      expect(c.activeText).toBeDefined();
    });

    it("uses tag.fillcolor when no style", () => {
      const { model } = getTestTree();
      model.setParent({ highlightcolor: null });
      model.setStyle(null);
      model.setTag({ fillcolor: "#0f0" });
      const c = model.getColors();
      expect(c.background).toBeDefined();
    });
  });

  describe("find", () => {
    it("returns self when span is in _spans", () => {
      const { model } = getTestTree();
      const span = mockSpan();
      model.setSpans([span, mockSpan()]);
      expect(model.find(span)).toBe(model);
    });

    it("returns undefined when span not in _spans", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan()]);
      expect(model.find(mockSpan())).toBeUndefined();
    });

    it("returns undefined when _spans is null", () => {
      const { model } = getTestTree();
      expect(model.find(mockSpan())).toBeUndefined();
    });
  });

  describe("addClass", () => {
    it("adds class to all spans", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.addClass("foo");
      spans.forEach((s) => expect(s.classList.add).toHaveBeenCalledWith("foo"));
    });

    it("accepts array", () => {
      const { model } = getTestTree();
      const spans = [mockSpan()];
      model.setSpans(spans);
      model.addClass(["a", "b"]);
      expect(spans[0].classList.add).toHaveBeenCalledWith("a", "b");
    });

    it("no-ops when _spans null", () => {
      const { model } = getTestTree();
      expect(() => model.addClass("x")).not.toThrow();
    });

    it("no-ops when classNames falsy", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan()]);
      model.addClass(null);
      expect(model._spans[0].classList.add).not.toHaveBeenCalled();
    });
  });

  describe("removeClass", () => {
    it("removes class from all spans", () => {
      const { model } = getTestTree();
      const spans = [mockSpan(), mockSpan()];
      model.setSpans(spans);
      model.removeClass("foo");
      spans.forEach((s) => expect(s.classList.remove).toHaveBeenCalledWith("foo"));
    });

    it("no-ops when _spans null", () => {
      const { model } = getTestTree();
      expect(() => model.removeClass("x")).not.toThrow();
    });
  });

  describe("toggleHidden", () => {
    it("toggles hidden and addClass __hidden when hidden", () => {
      const { model } = getTestTree();
      const spans = [mockSpan()];
      model.setSpans(spans);
      model.toggleHidden();
      expect(model.hidden).toBe(true);
      expect(spans[0].classList.add).toHaveBeenCalledWith("__hidden");
    });

    it("removeClass __hidden when unhiding", () => {
      const { model } = getTestTree();
      model.setSpans([mockSpan()]);
      model.setHidden(true);
      model.toggleHidden();
      expect(model.hidden).toBe(false);
      expect(model._spans[0].classList.remove).toHaveBeenCalledWith("__hidden");
    });

    it("stops propagation when event passed", () => {
      const { model } = getTestTree();
      const e = { stopPropagation: jest.fn() };
      model.setSpans([mockSpan()]);
      model.toggleHidden(e);
      expect(e.stopPropagation).toHaveBeenCalled();
    });
  });
});
