import { normalizeFilterValue } from "./filter_utils";

describe("normalizeFilterValue", () => {
  describe("Number type", () => {
    it("coerces scalar to Number for single-value operators", () => {
      expect(normalizeFilterValue("Number", "equal", "42")).toBe(42);
      expect(normalizeFilterValue("Number", "greater", "3.5")).toBe(3.5);
    });

    it("coerces {min, max} for range operators (in / not_in)", () => {
      expect(normalizeFilterValue("Number", "in", { min: "1", max: "10" })).toEqual({ min: 1, max: 10 });
      expect(normalizeFilterValue("Number", "not_in", { min: "5", max: "20" })).toEqual({ min: 5, max: 20 });
    });

    it("preserves arrays for list-membership operators (in_list / not_in_list) — BROS-1203", () => {
      // The earlier regex `/^in|not_in$/` matched `in_list` (it starts with `in`),
      // so `Object.entries([12])` was returning `{0: 12}` — a non-list payload that
      // the FilterSerializer rejects with HTTP 400.
      expect(normalizeFilterValue("Number", "in_list", [1, 2, 3])).toEqual([1, 2, 3]);
      expect(normalizeFilterValue("Number", "not_in_list", [1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("coerces string elements inside an in_list array to Number", () => {
      expect(normalizeFilterValue("Number", "in_list", ["12", "13"])).toEqual([12, 13]);
    });

    it("drops non-finite elements inside an in_list array", () => {
      expect(normalizeFilterValue("Number", "in_list", [1, "abc", 2])).toEqual([1, 2]);
    });
  });

  describe("String type", () => {
    it("coerces scalar to String for single-value operators", () => {
      expect(normalizeFilterValue("String", "contains", 42)).toBe("42");
    });

    it("preserves arrays for list-membership operators — BROS-1203", () => {
      expect(normalizeFilterValue("String", "in_list", ["a", "b"])).toEqual(["a", "b"]);
      expect(normalizeFilterValue("String", "not_in_list", ["a", "b"])).toEqual(["a", "b"]);
    });

    it("coerces non-string elements inside an in_list array to String", () => {
      expect(normalizeFilterValue("String", "in_list", [1, 2])).toEqual(["1", "2"]);
    });
  });

  describe("Unknown type", () => {
    it("passes value through unchanged", () => {
      expect(normalizeFilterValue("Boolean", "equal", true)).toBe(true);
      expect(normalizeFilterValue("Datetime", "equal", "2026-01-01")).toBe("2026-01-01");
    });
  });
});
