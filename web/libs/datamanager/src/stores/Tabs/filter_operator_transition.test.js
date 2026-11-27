import { resolveOperatorValueTransition } from "./filter_snapshot_utils";

const isListMembershipOperator = (op) => op === "in_list" || op === "not_in_list";

describe("resolveOperatorValueTransition (FIT-2275 gap 2)", () => {
  it("wraps scalar into array only for in_list / not_in_list (BROS-1203)", () => {
    const result = resolveOperatorValueTransition({
      previousOperator: "equal",
      nextOperator: "in_list",
      previousValueType: "single",
      nextValueType: "list",
      previousValue: 42,
      isListMembershipOperator,
    });

    expect(result).toEqual({ action: "set", value: [42] });
  });

  it("does not wrap scalar when next operator is TaskState-style contains (TC1792)", () => {
    const result = resolveOperatorValueTransition({
      previousOperator: null,
      nextOperator: "contains",
      previousValueType: undefined,
      nextValueType: "list",
      previousValue: "completed",
      isListMembershipOperator,
    });

    expect(result).toEqual({ action: "keep", value: "completed" });
  });

  it("unwraps array to scalar only when leaving in_list / not_in_list", () => {
    const result = resolveOperatorValueTransition({
      previousOperator: "in_list",
      nextOperator: "equal",
      previousValueType: "list",
      nextValueType: "single",
      previousValue: [7, 8, 9],
      isListMembershipOperator,
    });

    expect(result).toEqual({ action: "set", value: 7 });
  });

  it("does not unwrap UserSelect array when leaving contains (non-membership list)", () => {
    const result = resolveOperatorValueTransition({
      previousOperator: "contains",
      nextOperator: "equal",
      previousValueType: "list",
      nextValueType: "single",
      previousValue: [1, 2],
      isListMembershipOperator,
    });

    expect(result).toEqual({ action: "default" });
  });

  it("resets when crossing into range operators (Number in / not_in)", () => {
    const result = resolveOperatorValueTransition({
      previousOperator: "equal",
      nextOperator: "in",
      previousValueType: "single",
      nextValueType: "range",
      previousValue: 42,
      isListMembershipOperator,
    });

    expect(result).toEqual({ action: "default" });
  });
});
