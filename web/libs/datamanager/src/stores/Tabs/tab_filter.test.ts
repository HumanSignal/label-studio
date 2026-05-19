import { isListMembershipOperator, LIST_MEMBERSHIP_OPERATORS, recoverFilterSnapshot } from "./tab_filter";

// `recoverFilterSnapshot` runs in TabFilter.preProcessSnapshot on every view load.
// Its job: heal views that were saved with bad shape for `in_list` / `not_in_list`
// (scalar instead of array). Without recovery, the BE 400s every subsequent
// view-save and the user can't escape the bad state.
//
// These tests pin the exact contract — any drift could quietly re-introduce the
// unrecoverable 400-loop.

describe("recoverFilterSnapshot (BROS-1203 legacy view recovery)", () => {
  it("returns the snapshot untouched when not in_list / not_in_list", () => {
    const sn = { filter: "filter:tasks:id", operator: "equal", value: 42 };
    expect(recoverFilterSnapshot(sn)).toEqual(sn);
  });

  it("wraps a scalar number into a one-element array for in_list", () => {
    const sn = { filter: "filter:tasks:id", operator: "in_list", value: 12 };
    expect(recoverFilterSnapshot(sn).value).toEqual([12]);
  });

  it("wraps a scalar string into a one-element array for in_list", () => {
    const sn = { filter: "filter:tasks:data.tag", operator: "in_list", value: "alpha" };
    expect(recoverFilterSnapshot(sn).value).toEqual(["alpha"]);
  });

  it("wraps a scalar for not_in_list too", () => {
    const sn = { filter: "filter:tasks:id", operator: "not_in_list", value: 7 };
    expect(recoverFilterSnapshot(sn).value).toEqual([7]);
  });

  it("leaves an already-array value alone for in_list", () => {
    const sn = { filter: "filter:tasks:id", operator: "in_list", value: [1, 2, 3] };
    expect(recoverFilterSnapshot(sn).value).toEqual([1, 2, 3]);
  });

  it("leaves null value alone for in_list (null is the legitimate default)", () => {
    const sn = { filter: "filter:tasks:id", operator: "in_list", value: null };
    expect(recoverFilterSnapshot(sn).value).toBeNull();
  });

  it("normalizes missing value to null (preserving the pre-existing contract)", () => {
    const sn = { filter: "filter:tasks:id", operator: "equal" };
    expect(recoverFilterSnapshot(sn).value).toBeNull();
  });

  it("returns the input as-is when snapshot itself is null/undefined", () => {
    expect(recoverFilterSnapshot(null)).toBeNull();
    expect(recoverFilterSnapshot(undefined)).toBeUndefined();
  });

  it("does not mutate the input snapshot", () => {
    const sn = { filter: "filter:tasks:id", operator: "in_list", value: 5 };
    const before = JSON.stringify(sn);
    recoverFilterSnapshot(sn);
    expect(JSON.stringify(sn)).toBe(before);
  });

  it("preserves child_filter and other unrelated keys", () => {
    const sn = {
      filter: "filter:tasks:id",
      operator: "in_list",
      value: 99,
      child_filter: { filter: "filter:tasks:data.x", operator: "equal", value: "y" },
    };
    const out = recoverFilterSnapshot(sn);
    expect(out.value).toEqual([99]);
    expect(out.child_filter).toEqual(sn.child_filter);
  });
});

// The list-membership predicate is the linchpin of three defensive paths
// (setValue array-coercion, isValidFilter empty-array guard, and snapshot
// recovery). TC1792 (Task State filter returning zero rows) was a direct
// consequence of widening this scope from `in_list`/`not_in_list` to "any
// `valueType: "list"` filter" — TaskState's `contains` declares
// `valueType: "list"` but its value is a single state string and the BE
// applies `state__icontains=<value>`. Lock the contract so the next
// well-meaning refactor can't broaden the scope again.
describe("isListMembershipOperator (BROS-1203 / TC1792 scope guard)", () => {
  it("returns true for the two list-membership operators", () => {
    expect(isListMembershipOperator("in_list")).toBe(true);
    expect(isListMembershipOperator("not_in_list")).toBe(true);
  });

  it("does NOT match `contains` / `not_contains` (TaskState filter operators)", () => {
    // TaskState `contains` declares `valueType: "list"` but expects a scalar
    // state string on the wire — coercing it to an array breaks state filters.
    expect(isListMembershipOperator("contains")).toBe(false);
    expect(isListMembershipOperator("not_contains")).toBe(false);
  });

  it("does NOT match other operators", () => {
    for (const op of ["equal", "not_equal", "less", "greater", "in", "not_in", "empty", "regex"]) {
      expect(isListMembershipOperator(op)).toBe(false);
    }
  });

  it("does NOT match null / undefined / random strings", () => {
    expect(isListMembershipOperator(null as unknown as string)).toBe(false);
    expect(isListMembershipOperator(undefined as unknown as string)).toBe(false);
    expect(isListMembershipOperator("")).toBe(false);
    expect(isListMembershipOperator("in_list_something")).toBe(false);
  });

  it("exposes the exact two-operator set (any addition is intentional, not accidental)", () => {
    expect(LIST_MEMBERSHIP_OPERATORS.size).toBe(2);
    expect(LIST_MEMBERSHIP_OPERATORS.has("in_list")).toBe(true);
    expect(LIST_MEMBERSHIP_OPERATORS.has("not_in_list")).toBe(true);
  });
});
