/**
 * Unit tests for SeparatedControlMixin (mixins/SeparatedControlMixin.js)
 */
import { types } from "mobx-state-tree";
import SeparatedControlMixin from "../SeparatedControlMixin";

const Base = types
  .model("SeparatedControlTestBase", {
    toname: types.optional(types.maybeNull(types.string), null),
  })
  .volatile(() => ({
    annotation: null,
  }))
  .actions((self) => ({
    setAnnotation(ann) {
      self.annotation = ann;
    },
    setToname(name) {
      self.toname = name;
    },
  }));

const TestModel = types.compose(Base, SeparatedControlMixin);

describe("SeparatedControlMixin", () => {
  describe("volatile state", () => {
    it("has isSeparated true by default", () => {
      const m = TestModel.create({});
      expect(m.isSeparated).toBe(true);
    });
  });

  describe("obj view", () => {
    it("returns undefined when annotation is missing", () => {
      const m = TestModel.create({ toname: "img-1" });
      expect(m.obj).toBeUndefined();
    });

    it("returns value from annotation.names.get(toname) when present", () => {
      const targetObj = { name: "image" };
      const names = new Map([["img-1", targetObj]]);
      const m = TestModel.create({ toname: "img-1" });
      m.setAnnotation({ names });
      expect(m.obj).toBe(targetObj);
    });
  });

  describe("selectedLabels view", () => {
    it("returns empty array", () => {
      const m = TestModel.create({});
      expect(m.selectedLabels).toEqual([]);
    });
  });

  describe("selectedValues", () => {
    it("returns empty array", () => {
      const m = TestModel.create({});
      expect(m.selectedValues()).toEqual([]);
    });
  });

  describe("getResultValue", () => {
    it("returns empty object", () => {
      const m = TestModel.create({});
      expect(m.getResultValue()).toEqual({});
    });
  });
});
