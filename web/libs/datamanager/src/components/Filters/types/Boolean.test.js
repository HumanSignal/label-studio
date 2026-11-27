import { describe, expect, it } from "bun:test";
import { coerceBooleanFilterValue } from "./Boolean";

describe("coerceBooleanFilterValue", () => {
  it("keeps booleans and 0/1", () => {
    expect(coerceBooleanFilterValue(true)).toBe(true);
    expect(coerceBooleanFilterValue(false)).toBe(false);
    expect(coerceBooleanFilterValue(1)).toBe(true);
    expect(coerceBooleanFilterValue(0)).toBe(false);
    expect(coerceBooleanFilterValue("1")).toBe(true);
    expect(coerceBooleanFilterValue("0")).toBe(false);
  });

  it("mirrors cast_bool_from_str aliases", () => {
    expect(coerceBooleanFilterValue("yes")).toBe(true);
    expect(coerceBooleanFilterValue("TRUE")).toBe(true);
    expect(coerceBooleanFilterValue(" on ")).toBe(true);
    expect(coerceBooleanFilterValue("no")).toBe(false);
    expect(coerceBooleanFilterValue("False")).toBe(false);
    expect(coerceBooleanFilterValue("off")).toBe(false);
    expect(coerceBooleanFilterValue("not")).toBe(false);
  });

  it("treats unknown values as false", () => {
    expect(coerceBooleanFilterValue("maybe")).toBe(false);
    expect(coerceBooleanFilterValue(2)).toBe(false);
  });

  it("leaves null and undefined unselected", () => {
    expect(coerceBooleanFilterValue(null)).toBeUndefined();
    expect(coerceBooleanFilterValue(undefined)).toBeUndefined();
  });
});
