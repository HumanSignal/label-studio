/**
 * Unit tests for ParagraphsRegion (model views and actions).
 * Covers serialize, setText, fixOffsets, parent view, beforeDestroy, and savetextresult branch.
 */
import { types } from "mobx-state-tree";

const mockRemoveSpans = jest.fn();
jest.mock("../../utils", () => ({
  __esModule: true,
  default: {
    HTML: {
      removeSpans: (...args) => mockRemoveSpans(...args),
    },
  },
}));

jest.mock("../../tags/object/Paragraphs", () => {
  const { types: t } = require("mobx-state-tree");
  return {
    ParagraphsModel: t.model("ParagraphsModel", {
      name: t.identifier,
      savetextresult: t.optional(t.enumeration(["none", "no", "yes"]), "no"),
    }),
  };
});

import { ParagraphsRegionModel } from "../ParagraphsRegion";
import { ParagraphsModel } from "../../tags/object/Paragraphs";

const TestRoot = types
  .model("TestRoot", {
    paragraphs: types.optional(ParagraphsModel, { name: "para1", savetextresult: "no" }),
    region: types.optional(ParagraphsRegionModel, {
      id: "r1",
      pid: "p1",
      object: "para1",
      startOffset: 0,
      start: "0",
      endOffset: 10,
      end: "0",
      results: [],
    }),
  })
  .actions((self) => ({
    createSerializedResult(region, value) {
      return { value: { ...value }, original_width: 100, original_height: 100, image_rotation: 0 };
    },
  }));

describe("ParagraphsRegion", () => {
  describe("ParagraphsRegionModel", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        paragraphs: { name: "para1", savetextresult: "no" },
        region: {
          id: "r1",
          pid: "p1",
          object: "para1",
          startOffset: 0,
          start: "0",
          endOffset: 10,
          end: "0",
          results: [],
        },
      });
      region = root.region;
    });

    it("parent view returns object when alive", () => {
      expect(region.parent).toBe(root.paragraphs);
    });

    it("serialize returns value with start, end, startOffset, endOffset", () => {
      const result = region.serialize();
      expect(result.value).toEqual({
        start: "0",
        end: "0",
        startOffset: 0,
        endOffset: 10,
      });
      expect(result.value.text).toBeUndefined();
    });

    it("serialize includes text when object.savetextresult is yes", () => {
      root = TestRoot.create({
        paragraphs: { name: "para1", savetextresult: "yes" },
        region: {
          id: "r1",
          pid: "p1",
          object: "para1",
          startOffset: 0,
          start: "0",
          endOffset: 10,
          end: "0",
          results: [],
        },
      });
      region = root.region;
      region.setText("selected text");
      const result = region.serialize();
      expect(result.value.text).toBe("selected text");
      expect(result.value.startOffset).toBe(0);
      expect(result.value.endOffset).toBe(10);
    });

    it("setText updates volatile text", () => {
      region.setText("hello");
      expect(region.text).toBe("hello");
    });

    it("fixOffsets updates startOffset and endOffset", () => {
      region.fixOffsets(5, 15);
      expect(region.startOffset).toBe(5);
      expect(region.endOffset).toBe(15);
    });

    it("getRegionElement returns first span when _spans set", () => {
      const span = document.createElement("span");
      region._spans = [span];
      expect(region.getRegionElement()).toBe(span);
    });

    it("getRegionElement returns undefined when _spans empty or missing", () => {
      region._spans = [];
      expect(region.getRegionElement()).toBeUndefined();
      region._spans = undefined;
      expect(region.getRegionElement()).toBeUndefined();
    });

    it("beforeDestroy calls Utils.HTML.removeSpans with _spans", () => {
      mockRemoveSpans.mockClear();
      const spans = [document.createElement("span")];
      region._spans = spans;
      region.beforeDestroy();
      expect(mockRemoveSpans).toHaveBeenCalledWith(spans);
    });
  });
});
