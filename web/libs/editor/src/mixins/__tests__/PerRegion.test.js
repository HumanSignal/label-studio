/**
 * Unit tests for PerRegion mixin (mixins/PerRegion.js)
 */
import { types } from "mobx-state-tree";
import PerRegionMixin, { PER_REGION_MODES } from "../PerRegion";

const createMinimalBase = () =>
  types
    .model({
      toname: types.optional(types.string, "obj"),
      isControlTag: true,
      isClassificationTag: true,
    })
    .volatile(() => ({ annotation: null, toNameTag: null }))
    .views(() => ({
      selectedValues() {
        return [];
      },
    }))
    .actions((self) => ({
      validateValue() {
        return true;
      },
      setAnnotation(ann) {
        self.annotation = ann;
      },
      setToNameTag(tag) {
        self.toNameTag = tag;
      },
    }));

const TestModel = types.compose(createMinimalBase(), PerRegionMixin);

const createBaseWithValidation = (validateFn) =>
  types
    .model({
      toname: types.optional(types.string, "obj"),
      isControlTag: true,
      isClassificationTag: true,
    })
    .volatile(() => ({ annotation: null, toNameTag: null }))
    .views(() => ({
      selectedValues() {
        return [];
      },
    }))
    .actions((self) => ({
      validateValue: validateFn,
      setAnnotation(ann) {
        self.annotation = ann;
      },
      setToNameTag(tag) {
        self.toNameTag = tag;
      },
    }));

const TestModelWithValidation = types.compose(
  createBaseWithValidation((value) => value !== "bad"),
  PerRegionMixin,
);

describe("PerRegion mixin", () => {
  describe("validation", () => {
    it("throws when used without ClassificationBase (isClassificationTag !== true)", () => {
      const NotClassification = types
        .model({ toname: "x", isControlTag: true, isClassificationTag: false })
        .volatile(() => ({}));
      const BadComposition = types.compose(NotClassification, PerRegionMixin);
      expect(() => BadComposition.create({})).toThrow(
        "The PerRegionMixin mixin should be used only for classification control-tags",
      );
    });
  });

  describe("volatile state", () => {
    it("has focusable false", () => {
      const m = TestModel.create({ toname: "obj" });
      expect(m.focusable).toBe(false);
    });
  });

  describe("perRegionArea view", () => {
    it("returns null when perregion is false", () => {
      const m = TestModel.create({ perregion: false });
      expect(m.perRegionArea).toBeNull();
    });

    it("returns annotation.highlightedNode when perregion is true", () => {
      const highlighted = { id: "r1" };
      const m = TestModel.create({ perregion: true });
      m.setAnnotation({ highlightedNode: highlighted });
      expect(m.perRegionArea).toBe(highlighted);
    });
  });

  describe("_perRegionResult view", () => {
    it("returns null when perRegionArea is null", () => {
      const m = TestModel.create({ perregion: false });
      expect(m._perRegionResult).toBeNull();
    });

    it("returns null when annotation has no matching result for this tag and area", () => {
      const area = { id: "a1" };
      const m = TestModel.create({ perregion: true });
      m.setAnnotation({
        highlightedNode: area,
        results: [
          { from_name: "other", area: area },
          { from_name: m, area: { id: "other" } },
        ],
      });
      expect(m._perRegionResult).toBeUndefined();
    });

    it("returns result when annotation has result with from_name === self and area === perRegionArea", () => {
      const area = { id: "a1" };
      const m = TestModel.create({ perregion: true });
      const result = { from_name: m, area };
      m.setAnnotation({
        highlightedNode: area,
        results: [result, { from_name: "other", area }],
      });
      expect(m._perRegionResult).toBe(result);
    });
  });

  describe("perRegionVisible view", () => {
    it("returns true when perregion is false", () => {
      const m = TestModel.create({ perregion: false });
      expect(m.perRegionVisible()).toBe(true);
    });

    it("returns false when perregion is true and no region selected", () => {
      const m = TestModel.create({ perregion: true });
      m.setAnnotation({ highlightedNode: null });
      expect(m.perRegionVisible()).toBe(false);
    });

    it("returns false when perregion is true and region.parent.name !== toname", () => {
      const m = TestModel.create({ perregion: true, toname: "img1" });
      m.setAnnotation({
        highlightedNode: { parent: { name: "other" } },
      });
      expect(m.perRegionVisible()).toBe(false);
    });

    it("returns true when perregion is true, region matches toname, and whenlabelvalue not set", () => {
      const m = TestModel.create({ perregion: true, toname: "img1" });
      m.setAnnotation({
        highlightedNode: { parent: { name: "img1" } },
      });
      expect(m.perRegionVisible()).toBe(true);
    });

    it("returns true when whenlabelvalue is set and region has that label", () => {
      const m = TestModel.create({
        perregion: true,
        toname: "img1",
        whenlabelvalue: "A",
      });
      m.setAnnotation({
        highlightedNode: {
          parent: { name: "img1" },
          hasLabel: (v) => v === "A",
        },
      });
      expect(m.perRegionVisible()).toBe(true);
    });

    it("returns false when whenlabelvalue is set and region does not have that label", () => {
      const m = TestModel.create({
        perregion: true,
        toname: "img1",
        whenlabelvalue: "A",
      });
      m.setAnnotation({
        highlightedNode: {
          parent: { name: "img1" },
          hasLabel: () => false,
        },
      });
      expect(m.perRegionVisible()).toBe(false);
    });
  });

  describe("_validatePerRegion action", () => {
    it("returns true when all regions have valid values", () => {
      const m = TestModel.create({ perregion: true });
      const reg1 = { results: [{ from_name: m, mainValue: "v1" }] };
      const reg2 = { results: [{ from_name: m, mainValue: "v2" }] };
      m.setToNameTag({ allRegs: [reg1, reg2] });
      m.setAnnotation({ selectArea: () => {} });
      expect(m._validatePerRegion()).toBe(true);
    });

    it("returns false and calls annotation.selectArea when a region has invalid value", () => {
      const selectArea = jest.fn();
      const invalidReg = { results: [] };
      const validReg = { results: [] };
      const store = TestModelWithValidation.create({ perregion: true });
      store.setAnnotation({ selectArea });
      invalidReg.results = [{ from_name: store, mainValue: "bad" }];
      validReg.results = [{ from_name: store, mainValue: "ok" }];
      store.setToNameTag({ allRegs: [validReg, invalidReg] });
      expect(store._validatePerRegion()).toBe(false);
      expect(selectArea).toHaveBeenCalledWith(invalidReg);
    });

    it("skips regions with no result from this tag (mainValue undefined)", () => {
      const m = TestModel.create({ perregion: true });
      const regNoResult = { results: [] };
      m.setToNameTag({ allRegs: [regNoResult] });
      m.setAnnotation({ selectArea: () => {} });
      expect(m._validatePerRegion()).toBe(true);
    });
  });

  describe("createPerRegionResult action", () => {
    it("calls setValue on perRegionArea when area is set", () => {
      const setValue = jest.fn();
      const area = { setValue };
      const m = TestModel.create({ perregion: true });
      m.setAnnotation({ highlightedNode: area });
      m.createPerRegionResult();
      expect(setValue).toHaveBeenCalledWith(m);
    });

    it("does nothing when perRegionArea is null", () => {
      const m = TestModel.create({ perregion: false });
      expect(() => m.createPerRegionResult()).not.toThrow();
    });
  });

  describe("PER_REGION_MODES export", () => {
    it("exports TAG and REGION_LIST", () => {
      expect(PER_REGION_MODES.TAG).toBe("tag");
      expect(PER_REGION_MODES.REGION_LIST).toBe("region-list");
    });
  });

  describe("displaymode default", () => {
    it("defaults to PER_REGION_MODES.TAG", () => {
      const m = TestModel.create({});
      expect(m.displaymode).toBe(PER_REGION_MODES.TAG);
    });
  });
});
