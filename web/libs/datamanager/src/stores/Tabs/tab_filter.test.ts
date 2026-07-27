import { isListMembershipOperator, LIST_MEMBERSHIP_OPERATORS, recoverFilterSnapshot } from "./tab_filter";
import { fieldAliasFromFilterId, sanitizeIntegerUserListValue } from "./filter_snapshot_utils";

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

  it("FIT-2275 gap 4: resets annotators filter with model-version strings on load", () => {
    const sn = {
      filter: "filter:tasks:annotators",
      operator: "contains",
      value: ["gpt-4"],
    };
    const out = recoverFilterSnapshot(sn);
    expect(out.value).toEqual([]);
  });

  it("FIT-2275 gap 4: keeps valid integer annotators ids on load", () => {
    const sn = {
      filter: "filter:tasks:annotators",
      operator: "contains",
      value: [1, 2],
    };
    const out = recoverFilterSnapshot(sn);
    expect(out.value).toEqual([1, 2]);
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

describe("sanitizeIntegerUserListValue (FIT-2275 gap 3)", () => {
  it("returns an empty selection for annotators with model-version strings (recent-restore shape)", () => {
    const result = sanitizeIntegerUserListValue(["gpt-4"], {
      fieldAlias: "annotators",
      operator: "contains",
    });
    expect(result).toEqual([]);
  });

  it("passes through valid integer user id arrays", () => {
    expect(
      sanitizeIntegerUserListValue([1, 2], {
        fieldAlias: "annotators",
        operator: "contains",
      }),
    ).toEqual([1, 2]);
  });

  it("does not touch non-user-list columns (model versions keep strings)", () => {
    expect(
      sanitizeIntegerUserListValue(["gpt-4"], {
        fieldAlias: "model_versions",
        operator: "contains",
      }),
    ).toEqual(["gpt-4"]);
  });

  it("covers every integer user-list field and recovers historical scalar/object shapes", () => {
    for (const fieldAlias of ["annotators", "updated_by", "reviewers", "comment_authors", "skipped_by_annotator"]) {
      expect(
        sanitizeIntegerUserListValue(
          [1, "2", 3.0, { id: "4", email: "deleted@example.com" }, { value: 5, label: "Former user" }, ["6"]],
          { fieldAlias, operator: "contains" },
        ),
      ).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("resets booleans, fractional numbers, labels, and unsupported operators", () => {
    for (const value of [["yes"], "", false, 1.5, { label: "Matt" }]) {
      expect(sanitizeIntegerUserListValue(value, { fieldAlias: "annotators", operator: "contains" })).toEqual([]);
    }
    expect(sanitizeIntegerUserListValue([7], { fieldAlias: "annotators", operator: "regex" })).toEqual([]);
  });

  it("bounds recovered virtual/recent selections to the server-advertised maximum", () => {
    const originalSettings = window.APP_SETTINGS;
    window.APP_SETTINGS = {
      ...originalSettings,
      data_manager: {
        ...originalSettings?.data_manager,
        list_filter_max_values: 2,
      },
    };
    try {
      expect(
        sanitizeIntegerUserListValue([1, 2, 3], {
          fieldAlias: "annotators",
          operator: "contains",
        }),
      ).toEqual([1, 2]);
    } finally {
      window.APP_SETTINGS = originalSettings;
    }
  });
});

describe("recoverFilterSnapshot user-filter compatibility", () => {
  it("maps unambiguous legacy operators to current user-filter operators", () => {
    expect(
      recoverFilterSnapshot({
        filter: "filter:tasks:updated_by",
        operator: "equal",
        value: { id: "7" },
      }),
    ).toMatchObject({ operator: "contains", value: 7 });
    expect(
      recoverFilterSnapshot({
        filter: "filter:tasks:skipped_by_annotator",
        operator: "not_equal",
        value: { value: 8 },
      }),
    ).toMatchObject({ operator: "not_contains", value: 8 });
  });

  it("resets unsupported legacy operators without affecting empty checks", () => {
    expect(
      recoverFilterSnapshot({
        filter: "filter:tasks:annotators",
        operator: "regex",
        value: "7",
      }),
    ).toMatchObject({ operator: "contains", value: [] });
    expect(
      recoverFilterSnapshot({
        filter: "filter:tasks:annotators",
        operator: "empty",
        value: "yes",
      }),
    ).toMatchObject({ operator: "empty", value: true });
    expect(
      recoverFilterSnapshot({
        filter: "filter:tasks:annotators",
        operator: "empty",
        value: "O",
      }),
    ).toMatchObject({ operator: "contains", value: [] });
  });
});

describe("fieldAliasFromFilterId", () => {
  it("extracts annotators alias from filter id", () => {
    expect(fieldAliasFromFilterId("filter:tasks:annotators")).toBe("annotators");
  });
});
