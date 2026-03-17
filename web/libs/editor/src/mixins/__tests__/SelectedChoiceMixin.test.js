/**
 * Unit tests for SelectedChoiceMixin (mixins/SelectedChoiceMixin.js)
 */
import { types } from "mobx-state-tree";
import SelectedChoiceMixin from "../SelectedChoiceMixin";

const Base = types
  .model("SelectedChoiceTestBase", {})
  .volatile(() => ({
    findLabel: null,
    findItemByValueOrAlias: null,
    selectedValues: () => [],
    isSelected: false,
    type: "choice",
  }))
  .actions((self) => ({
    setFindLabel(fn) {
      self.findLabel = fn;
    },
    setFindItemByValueOrAlias(fn) {
      self.findItemByValueOrAlias = fn;
    },
    setSelectedValues(fnOrArr) {
      self.selectedValues = typeof fnOrArr === "function" ? fnOrArr : () => fnOrArr;
    },
    setIsSelected(v) {
      self.isSelected = v;
    },
    setType(t) {
      self.type = t;
    },
  }));

const TestModel = types.compose(Base, SelectedChoiceMixin);

describe("SelectedChoiceMixin", () => {
  describe("findSelectedChoice", () => {
    it("returns item.alias when findLabel returns item with alias", () => {
      const m = TestModel.create({});
      m.setFindLabel(() => ({ alias: "a1", value: "v1" }));
      expect(m.findSelectedChoice("x")).toBe("a1");
    });

    it("returns item.value when findLabel returns item without alias", () => {
      const m = TestModel.create({});
      m.setFindLabel(() => ({ value: "v1" }));
      expect(m.findSelectedChoice("x")).toBe("v1");
    });

    it("returns item.alias when findItemByValueOrAlias returns item with alias", () => {
      const m = TestModel.create({});
      m.setFindItemByValueOrAlias(() => ({ alias: "a2", value: "v2" }));
      expect(m.findSelectedChoice("y")).toBe("a2");
    });

    it("returns undefined when neither findLabel nor findItemByValueOrAlias returns", () => {
      const m = TestModel.create({});
      expect(m.findSelectedChoice("z")).toBeUndefined();
    });

    it("returns undefined when findLabel returns undefined", () => {
      const m = TestModel.create({});
      m.setFindLabel(() => undefined);
      expect(m.findSelectedChoice("z")).toBeUndefined();
    });
  });

  describe("selectedChoicesMatch", () => {
    it("returns true when both choices resolve to the same value", () => {
      const m = TestModel.create({});
      m.setFindLabel((v) => (v === "a" ? { value: "same" } : v === "b" ? { value: "same" } : undefined));
      expect(m.selectedChoicesMatch("a", "b")).toBe(true);
    });

    it("returns false when choices resolve to different values", () => {
      const m = TestModel.create({});
      m.setFindLabel((v) => (v === "a" ? { value: "v1" } : v === "b" ? { value: "v2" } : undefined));
      expect(m.selectedChoicesMatch("a", "b")).toBe(false);
    });

    it("returns false when one choice is undefined", () => {
      const m = TestModel.create({});
      m.setFindLabel((v) => (v === "a" ? { value: "v1" } : undefined));
      expect(m.selectedChoicesMatch("a", "b")).toBe(false);
    });
  });

  describe("hasChoiceSelectionSimple", () => {
    it("returns true when choiceValue array includes a selected value", () => {
      const m = TestModel.create({});
      m.setSelectedValues(["x", "y"]);
      expect(m.hasChoiceSelectionSimple(["a", "x"])).toBe(true);
    });

    it("returns false when choiceValue array includes no selected value", () => {
      const m = TestModel.create({});
      m.setSelectedValues(["x", "y"]);
      expect(m.hasChoiceSelectionSimple(["a", "b"])).toBe(false);
    });

    it("uses last element of array selected values for comparison", () => {
      const m = TestModel.create({});
      m.setSelectedValues([["p", "q"], "r"]);
      expect(m.hasChoiceSelectionSimple(["q"])).toBe(true);
      expect(m.hasChoiceSelectionSimple(["r"])).toBe(true);
    });

    it("returns isSelected when choiceValue has no length", () => {
      const m = TestModel.create({});
      m.setIsSelected(true);
      expect(m.hasChoiceSelectionSimple([])).toBe(true);
      m.setIsSelected(false);
      expect(m.hasChoiceSelectionSimple([])).toBe(false);
    });

    it("returns isSelected when choiceValue is null/undefined", () => {
      const m = TestModel.create({});
      m.setIsSelected(true);
      expect(m.hasChoiceSelectionSimple(null)).toBe(true);
      expect(m.hasChoiceSelectionSimple(undefined)).toBe(true);
    });
  });

  describe("hasChoiceSelection", () => {
    it("returns true when findLabel exists, type is not taxonomy, and choice is selected (sel)", () => {
      const m = TestModel.create({});
      m.setFindLabel((v) => (v === "a" ? { sel: true } : { sel: false }));
      m.setType("choice");
      expect(m.hasChoiceSelection(["a"])).toBe(true);
      expect(m.hasChoiceSelection(["b"])).toBe(false);
    });

    it("uses selectedValues when provided and findItemByValueOrAlias exists", () => {
      const m = TestModel.create({});
      m.setFindLabel(null);
      m.setFindItemByValueOrAlias((v) => (v === "x" ? { alias: "ax", value: "vx" } : undefined));
      expect(m.hasChoiceSelection(["x"], ["ax"])).toBe(true);
      expect(m.hasChoiceSelection(["x"], ["other"])).toBe(false);
    });

    it("uses selectedValues when findItemByValueOrAlias returns value only (no alias)", () => {
      const m = TestModel.create({});
      m.setFindLabel(null);
      m.setFindItemByValueOrAlias((v) => (v === "x" ? { value: "vx" } : undefined));
      expect(m.hasChoiceSelection(["x"], ["vx"])).toBe(true);
    });

    it("uses selectedValues when provided and normalizes array selected values with .at(-1)", () => {
      const m = TestModel.create({});
      m.setFindLabel(null);
      m.setFindItemByValueOrAlias((v) => (v === "k" ? { value: "last" } : undefined));
      expect(m.hasChoiceSelection(["k"], [["a", "last"]])).toBe(true);
    });

    it("returns false when choiceValue has length but selectedValues empty and not findLabel/sel path", () => {
      const m = TestModel.create({});
      m.setType("taxonomy");
      m.setFindLabel(() => ({ sel: true }));
      expect(m.hasChoiceSelection(["a"], [])).toBe(false);
    });

    it("returns isSelected when choiceValue has no length", () => {
      const m = TestModel.create({});
      m.setIsSelected(true);
      expect(m.hasChoiceSelection([])).toBe(true);
      m.setIsSelected(false);
      expect(m.hasChoiceSelection([])).toBe(false);
    });
  });
});
