import { renderHook, act } from "@testing-library/react";
import { useRecentFilters } from "./useRecentFilters";

const projectId = 99;
const storageKey = `dm:recentFilterFields:${projectId}`;

describe("useRecentFilters", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exposes recentEntries with raw stored data", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([{ id: "filter:tasks:image", operator: "equal", value: "cat.jpg" }]),
    );

    const { result } = renderHook(() => useRecentFilters(projectId));

    expect(result.current.recentEntries).toHaveLength(1);
    expect(result.current.recentEntries[0].id).toBe("filter:tasks:image");
    expect(result.current.recentEntries[0].operator).toBe("equal");
    expect(result.current.recentEntries[0].value).toBe("cat.jpg");
  });

  it("recentEntries is empty when no recents stored", () => {
    const { result } = renderHook(() => useRecentFilters(projectId));
    expect(result.current.recentEntries).toHaveLength(0);
  });

  it("saveOnSwitch adds entry to front of recentEntries", () => {
    const { result } = renderHook(() => useRecentFilters(projectId));

    act(() => {
      result.current.saveOnSwitch("filter:tasks:created_at", "greater", "2025-01-01");
    });

    expect(result.current.recentEntries).toHaveLength(1);
    expect(result.current.recentEntries[0].id).toBe("filter:tasks:created_at");
    expect(result.current.recentEntries[0].operator).toBe("greater");
    expect(result.current.recentEntries[0].value).toBe("2025-01-01");
  });

  it("saveInPlace updates existing entry without reordering", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        { id: "filter:tasks:image", operator: "equal", value: "old" },
        { id: "filter:tasks:text", operator: "contains", value: "hello" },
      ]),
    );

    const { result } = renderHook(() => useRecentFilters(projectId));

    act(() => {
      result.current.saveInPlace("filter:tasks:text", "regex", "new.*");
    });

    expect(result.current.recentEntries[0].id).toBe("filter:tasks:image");
    expect(result.current.recentEntries[1].id).toBe("filter:tasks:text");
    expect(result.current.recentEntries[1].operator).toBe("regex");
    expect(result.current.recentEntries[1].value).toBe("new.*");
  });

  it("saveOnSwitch followed by saveOnSwitch reorders correctly", () => {
    const { result } = renderHook(() => useRecentFilters(projectId));

    act(() => {
      result.current.saveOnSwitch("filter:tasks:image", "equal", "a");
    });
    act(() => {
      result.current.saveOnSwitch("filter:tasks:text", "contains", "b");
    });

    expect(result.current.recentEntries[0].id).toBe("filter:tasks:text");
    expect(result.current.recentEntries[1].id).toBe("filter:tasks:image");
  });
});
