import { validateFilterSnapshot } from "./filter_snapshot_utils";

const availableFilters = [{ id: "filter:tasks:image" }, { id: "filter:tasks:text" }, { id: "filter:tasks:created_at" }];

describe("validateFilterSnapshot", () => {
  it("returns valid items when snapshot matches available filters", () => {
    const snapshot = {
      conjunction: "and",
      items: [
        { filter: "filter:tasks:image", operator: "equal", value: "cat.jpg" },
        { filter: "filter:tasks:text", operator: "contains", value: "hello" },
      ],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result).toHaveLength(2);
    expect(result[0].filter).toBe("filter:tasks:image");
    expect(result[1].filter).toBe("filter:tasks:text");
  });

  it("filters out items whose column IDs are not in availableFilters", () => {
    const snapshot = {
      conjunction: "and",
      items: [
        { filter: "filter:tasks:image", operator: "equal", value: "cat.jpg" },
        { filter: "filter:tasks:nonexistent", operator: "equal", value: "x" },
      ],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result).toHaveLength(1);
    expect(result[0].filter).toBe("filter:tasks:image");
  });

  it("returns null when no items match available filters", () => {
    const snapshot = {
      conjunction: "and",
      items: [{ filter: "filter:tasks:unknown", operator: "equal", value: "x" }],
    };
    expect(validateFilterSnapshot(snapshot, availableFilters)).toBeNull();
  });

  it("returns null for null snapshot", () => {
    expect(validateFilterSnapshot(null, availableFilters)).toBeNull();
  });

  it("returns null for non-object snapshot", () => {
    expect(validateFilterSnapshot("string", availableFilters)).toBeNull();
    expect(validateFilterSnapshot(42, availableFilters)).toBeNull();
  });

  it("returns null when items is not an array", () => {
    expect(validateFilterSnapshot({ conjunction: "and", items: "bad" }, availableFilters)).toBeNull();
    expect(validateFilterSnapshot({ conjunction: "and" }, availableFilters)).toBeNull();
  });

  it("returns null when items array is empty", () => {
    expect(validateFilterSnapshot({ conjunction: "and", items: [] }, availableFilters)).toBeNull();
  });

  it("skips items with missing filter field", () => {
    const snapshot = {
      conjunction: "and",
      items: [
        { operator: "equal", value: "x" },
        { filter: null, operator: "equal", value: "x" },
        { filter: "filter:tasks:image", operator: "equal", value: "x" },
      ],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result).toHaveLength(1);
    expect(result[0].filter).toBe("filter:tasks:image");
  });

  it("preserves operator and value in returned items", () => {
    const snapshot = {
      conjunction: "or",
      items: [{ filter: "filter:tasks:created_at", operator: "greater", value: "2025-01-01" }],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result[0]).toEqual({
      filter: "filter:tasks:created_at",
      operator: "greater",
      value: "2025-01-01",
    });
  });

  it("works with empty availableFilters", () => {
    const snapshot = {
      conjunction: "and",
      items: [{ filter: "filter:tasks:image", operator: "equal", value: "x" }],
    };
    expect(validateFilterSnapshot(snapshot, [])).toBeNull();
  });
});
