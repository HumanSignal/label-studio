import { renderHook, act } from "@testing-library/react";
import { useRecentFilters, RECENT_VALUE_PREFIX } from "./useRecentFilters";

const projectId = 99;
const storageKey = `dm:recentFilterFields:${projectId}`;

const makeFilter = (id: string, title: string, target = "tasks") => ({
  id,
  field: { title, target, disabled: false },
});

const availableFilters = [
  makeFilter("filter:tasks:image", "Image", "data"),
  makeFilter("filter:tasks:text", "Text", "data"),
  makeFilter("filter:tasks:created_at", "Created at"),
  makeFilter("filter:tasks:updated_at", "Updated at"),
];

describe("useRecentFilters", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns grouped fields when no recents exist", () => {
    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    const groupTitles = (result.current.fields as Array<{ title?: string }>).map((g) => g.title);
    expect(groupTitles).toContain("Data");
    expect(groupTitles).toContain("Tasks");
    expect(groupTitles).not.toContain("Recent");
  });

  it("prepends recents when localStorage has entries", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([{ id: "filter:tasks:image", operator: "equal", value: "cat.jpg" }]),
    );

    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    const values = (result.current.fields as Array<{ value?: string; title?: string }>).map((f) => f.value ?? f.title);
    expect(values[0]).toBe("__recent_header__");
    expect(values[1]).toBe(RECENT_VALUE_PREFIX + "filter:tasks:image");
    expect(values[2]).toBe("__all_fields_header__");
  });

  it("recent items carry _recentOperator and _recentValue", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([{ id: "filter:tasks:image", operator: "contains", value: "dog" }]),
    );

    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    const recentItem = (result.current.fields as Array<Record<string, unknown>>).find((f) => f._isRecent);
    expect(recentItem?._recentOperator).toBe("contains");
    expect(recentItem?._recentValue).toBe("dog");
  });

  it("saveOnSwitch adds entry to front and updates fields", () => {
    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    act(() => {
      result.current.saveOnSwitch("filter:tasks:created_at", "greater", "2025-01-01");
    });

    const recentItems = (result.current.fields as Array<Record<string, unknown>>).filter((f) => f._isRecent);
    expect(recentItems).toHaveLength(1);
    expect(recentItems[0].value).toBe(RECENT_VALUE_PREFIX + "filter:tasks:created_at");
    expect(recentItems[0]._recentOperator).toBe("greater");
    expect(recentItems[0]._recentValue).toBe("2025-01-01");
  });

  it("saveInPlace updates existing entry without reordering", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        { id: "filter:tasks:image", operator: "equal", value: "old" },
        { id: "filter:tasks:text", operator: "contains", value: "hello" },
      ]),
    );

    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    act(() => {
      result.current.saveInPlace("filter:tasks:text", "regex", "new.*");
    });

    const recentItems = (result.current.fields as Array<Record<string, unknown>>).filter((f) => f._isRecent);
    expect(recentItems[0].value).toBe(RECENT_VALUE_PREFIX + "filter:tasks:image");
    expect(recentItems[1].value).toBe(RECENT_VALUE_PREFIX + "filter:tasks:text");
    expect(recentItems[1]._recentOperator).toBe("regex");
    expect(recentItems[1]._recentValue).toBe("new.*");
  });

  it("saveOnSwitch followed by saveOnSwitch reorders correctly", () => {
    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    act(() => {
      result.current.saveOnSwitch("filter:tasks:image", "equal", "a");
    });
    act(() => {
      result.current.saveOnSwitch("filter:tasks:text", "contains", "b");
    });

    const recentItems = (result.current.fields as Array<Record<string, unknown>>).filter((f) => f._isRecent);
    expect(recentItems[0].value).toBe(RECENT_VALUE_PREFIX + "filter:tasks:text");
    expect(recentItems[1].value).toBe(RECENT_VALUE_PREFIX + "filter:tasks:image");
  });

  it("filters out recents that no longer exist in availableFilters", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([{ id: "filter:tasks:deleted_column", operator: "equal", value: "x" }]),
    );

    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    const recentItems = (result.current.fields as Array<Record<string, unknown>>).filter((f) => f._isRecent);
    expect(recentItems).toHaveLength(0);
  });

  it("decorative items have correct heights", () => {
    localStorage.setItem(storageKey, JSON.stringify([{ id: "filter:tasks:image", operator: "equal", value: "x" }]));

    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    const fields = result.current.fields as Array<Record<string, unknown>>;
    const header = fields.find((f) => f.value === "__recent_header__");
    const allFields = fields.find((f) => f.value === "__all_fields_header__");
    expect(header?.height).toBe(34);
    expect(allFields?.height).toBe(34);
  });

  it("exposes recentEntries with raw stored data", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([{ id: "filter:tasks:image", operator: "equal", value: "cat.jpg" }]),
    );

    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));

    expect(result.current.recentEntries).toHaveLength(1);
    expect(result.current.recentEntries[0].id).toBe("filter:tasks:image");
    expect(result.current.recentEntries[0].operator).toBe("equal");
    expect(result.current.recentEntries[0].value).toBe("cat.jpg");
  });

  it("recentEntries is empty when no recents stored", () => {
    const { result } = renderHook(() => useRecentFilters(projectId, availableFilters));
    expect(result.current.recentEntries).toHaveLength(0);
  });
});
