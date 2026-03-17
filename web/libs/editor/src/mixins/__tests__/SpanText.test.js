/**
 * Unit tests for SpanText mixin (mixins/SpanText.js)
 */
import { getRoot, types } from "mobx-state-tree";

const mockSpans = () => {
  const spans = [
    { style: {}, className: "", setAttribute: jest.fn(), scrollIntoView: jest.fn(), scrollIntoViewIfNeeded: jest.fn() },
    { style: {}, className: "", setAttribute: jest.fn() },
  ];
  spans.forEach((s) => {
    s.onmouseover = null;
    s.onmouseout = null;
    s.onmousedown = null;
    s.onclick = null;
  });
  return spans;
};

jest.mock("../../utils/html", () => ({
  highlightRange: jest.fn((_self, _cssClass, _cssStyle) => mockSpans()),
}));

jest.mock("../../utils", () => ({
  __esModule: true,
  default: {
    Colors: {
      convertToRGBA: jest.fn((color, alpha) => (color ? `rgba(0,0,0,${alpha})` : null)),
      rgbaChangeAlpha: jest.fn((_color, alpha) => `rgba(0,0,0,${alpha})`),
    },
    HTML: {
      labelWithCSS: jest.fn(() => "htx-label-test"),
    },
  },
}));

import SpanTextMixin from "../SpanText";

const Base = types
  .model("SpanTextTestBase", {})
  .volatile(() => ({
    parent: {
      highlightcolor: null,
      showlabels: true,
      _currentSpan: null,
    },
    selected: false,
    style: null,
    tag: null,
    region_index: 0,
    labeling: { mainValue: ["Label1"] },
    score: 0.9,
    hidden: false,
    highlighted: false,
    annotation: { isLinkingMode: false },
    _highlighted: false,
    toggleHighlight: jest.fn(),
    setHighlight: jest.fn(),
    onClickRegion: jest.fn(),
  }))
  .actions((self) => ({
    setParent(p) {
      self.parent = { ...self.parent, ...p };
    },
    setSelected(v) {
      self.selected = v;
    },
    setStyle(s) {
      self.style = s;
    },
    setTag(t) {
      self.tag = t;
    },
    setHidden(v) {
      self.hidden = v;
    },
    setHighlighted(v) {
      self.highlighted = v;
      self._highlighted = v;
    },
    setAnnotation(a) {
      self.annotation = a;
    },
  }));

const TestModel = types.compose(Base, SpanTextMixin);

const Root = types.model("Root", {
  settings: types.optional(types.frozen({ showLabels: true }), { showLabels: true }),
  region: TestModel,
});

function getTestTree() {
  const root = Root.create({
    settings: { showLabels: true },
    region: {},
  });
  const model = root.region;
  return { model, root };
}

describe("SpanTextMixin", () => {
  describe("getLabelColor", () => {
    it("uses parent.highlightcolor when set", () => {
      const { model } = getTestTree();
      model.setParent({ highlightcolor: "#ff0000" });
      const color = model.getLabelColor();
      expect(color).toBeTruthy();
    });

    it("uses style.fillcolor when no parent highlightcolor", () => {
      const { model } = getTestTree();
      model.setParent({ highlightcolor: null });
      model.setStyle({ fillcolor: "#00ff00" });
      const color = model.getLabelColor();
      expect(color).toBeTruthy();
    });

    it("uses tag.fillcolor when no style", () => {
      const { model } = getTestTree();
      model.setParent({ highlightcolor: null });
      model.setStyle(null);
      model.setTag({ fillcolor: "#0000ff" });
      const color = model.getLabelColor();
      expect(color).toBeTruthy();
    });

    it("returns converted color when labelColor is set", () => {
      const { model } = getTestTree();
      model.setParent({ highlightcolor: "#abc" });
      const color = model.getLabelColor();
      expect(color).toBeTruthy();
    });
  });

  describe("updateSpansColor", () => {
    it("does nothing when _spans is not set", () => {
      const { model } = getTestTree();
      expect(() => model.updateSpansColor("#fff", 0.5)).not.toThrow();
    });

    it("updates span background when _spans is set", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model.updateSpansColor("rgba(1,1,1,0.5)", 0.8);
      expect(spans[0].style.backgroundColor).toBeDefined();
    });
  });

  describe("updateAppearenceFromState", () => {
    it("calls updateSpansColor and applyCSSClass when _lastSpan set", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model._lastSpan = spans[1];
      expect(() => model.updateAppearenceFromState()).not.toThrow();
    });
  });

  describe("createSpans", () => {
    it("calls highlightRange and sets _spans and _lastSpan", () => {
      const { model } = getTestTree();
      model.setParent({ highlightcolor: null });
      model.setStyle({ fillcolor: "#ccc" });
      const { highlightRange } = require("../../utils/html");
      const result = model.createSpans();
      expect(highlightRange).toHaveBeenCalled();
      expect(model._spans).toBeDefined();
      expect(model._lastSpan).toBeDefined();
      expect(result).toBeDefined();
    });

    it("returns early when highlightRange returns empty array", () => {
      const { highlightRange } = require("../../utils/html");
      highlightRange.mockReturnValueOnce([]);
      const { model } = getTestTree();
      model.setParent({ highlightcolor: null });
      model.setStyle({ fillcolor: "#ccc" });
      const result = model.createSpans();
      expect(result).toBeUndefined();
      expect(model._spans).toBeUndefined();
    });
  });

  describe("applyCSSClass", () => {
    it("does nothing when lastSpan is null", () => {
      const { model } = getTestTree();
      expect(() => model.applyCSSClass(null)).not.toThrow();
    });

    it("sets className when parent.showlabels and settings.showLabels", () => {
      const { model } = getTestTree();
      const span = { style: {}, className: "", setAttribute: jest.fn() };
      model.applyCSSClass(span);
      expect(span.className).toContain("htx-highlight");
    });

    it("adds htx-no-label when parent.showlabels and settings.showLabels are both false", () => {
      const root = Root.create({ settings: { showLabels: false }, region: {} });
      const model = root.region;
      model.setParent({ showlabels: false });
      const span = { style: {}, className: "", setAttribute: jest.fn() };
      model.applyCSSClass(span);
      expect(span.className).toContain("htx-no-label");
    });
  });

  describe("addEventsToSpans", () => {
    it("does nothing when spans is null", () => {
      const { model } = getTestTree();
      expect(() => model.addEventsToSpans(null)).not.toThrow();
    });

    it("attaches event handlers to each span", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model.addEventsToSpans(spans);
      expect(spans[0].onmouseover).toBeDefined();
      expect(spans[0].onmouseout).toBeDefined();
      expect(spans[0].onmousedown).toBeDefined();
      expect(spans[0].onclick).toBeDefined();
    });

    it("onmouseover when hidden does nothing", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model.addEventsToSpans(spans);
      model.setHidden(true);
      expect(() => spans[0].onmouseover({ stopPropagation: jest.fn() })).not.toThrow();
    });

    it("onmouseover when isLinkingMode calls toggleHighlight and stopPropagation", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model.addEventsToSpans(spans);
      model.setAnnotation({ isLinkingMode: true });
      const ev = { stopPropagation: jest.fn() };
      spans[0].onmouseover(ev);
      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(model.toggleHighlight).toHaveBeenCalled();
    });

    it("onmouseover when not linking sets pointer cursor", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model.addEventsToSpans(spans);
      spans[0].onmouseover({ stopPropagation: jest.fn() });
      expect(spans[0].style.cursor).toBeDefined();
    });

    it("onmouseout updates highlight state", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model.setHighlighted(true);
      model.addEventsToSpans(spans);
      spans[0].onmouseout();
      expect(model._highlighted).toBe(false);
    });

    it("onmouseout when hidden does not change highlight", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model.addEventsToSpans(spans);
      model.setHidden(true);
      model.setHighlighted(true);
      spans[0].onmouseout();
      expect(model._highlighted).toBe(true);
    });

    it("onmousedown when parent._currentSpan !== this sets _currentSpan and stopPropagation", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model.addEventsToSpans(spans);
      const ev = { stopPropagation: jest.fn() };
      const spanEl = spans[0];
      spanEl.onmousedown.call(spanEl, ev);
      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(model.parent._currentSpan).toBe(spanEl);
    });

    it("onclick when parent._currentSpan === this calls onClickRegion", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model.addEventsToSpans(spans);
      model.parent._currentSpan = spans[0];
      spans[0].onclick.call(spans[0]);
      expect(model.onClickRegion).toHaveBeenCalled();
    });

    it("onclick when parent._currentSpan !== this does not call onClickRegion", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model.addEventsToSpans(spans);
      model.parent._currentSpan = null;
      spans[0].onclick.call(spans[0]);
      expect(model.onClickRegion).not.toHaveBeenCalled();
    });
  });

  describe("selectRegion", () => {
    it("calls updateSpansColor with opacity 0.8", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      expect(() => model.selectRegion()).not.toThrow();
    });

    it("calls scrollIntoViewIfNeeded when available", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model.selectRegion();
      expect(spans[0].scrollIntoViewIfNeeded).toHaveBeenCalled();
    });

    it("calls scrollIntoView when scrollIntoViewIfNeeded not available", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      delete spans[0].scrollIntoViewIfNeeded;
      spans[0].scrollIntoView = jest.fn();
      model._spans = spans;
      model.selectRegion();
      expect(spans[0].scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    });
  });

  describe("afterUnselectRegion", () => {
    it("calls updateSpansColor with opacity 0.3", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      expect(() => model.afterUnselectRegion()).not.toThrow();
    });
  });

  describe("setHighlight", () => {
    it("sets _highlighted and updates span borders when _spans exists", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model.setHighlight(true);
      expect(model._highlighted).toBe(true);
      expect(spans[0].style.borderRight).toBeDefined();
    });

    it("clears borders when highlighted is false", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model.setHighlight(true);
      model.setHighlight(false);
      expect(spans[0].style.borderTop).toBeDefined();
    });
  });

  describe("toggleHidden", () => {
    it("toggles hidden and updates appearance", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      model._lastSpan = spans[0];
      expect(model.hidden).toBe(false);
      model.toggleHidden();
      expect(model.hidden).toBe(true);
      model.toggleHidden();
      expect(model.hidden).toBe(false);
    });

    it("accepts event with stopPropagation", () => {
      const { model } = getTestTree();
      const e = { stopPropagation: jest.fn() };
      model.toggleHidden(e);
      expect(e.stopPropagation).toHaveBeenCalled();
    });
  });

  describe("find", () => {
    it("returns self when span is in _spans", () => {
      const { model } = getTestTree();
      const spans = mockSpans();
      model._spans = spans;
      expect(model.find(spans[0])).toBe(model);
    });

    it("returns undefined when _spans is not set", () => {
      const { model } = getTestTree();
      expect(model.find({})).toBeUndefined();
    });

    it("returns undefined when span is not in _spans", () => {
      const { model } = getTestTree();
      model._spans = mockSpans();
      expect(model.find({})).toBeUndefined();
    });
  });
});
