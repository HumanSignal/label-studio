import { describe, expect, it } from "bun:test";
import { buildSearchVisiblePaths, parentJsonPath, areSearchVisiblePathsEqual } from "./virtualized-search-filter";

describe("virtualized-search-filter", () => {
  it("resolves parent paths for dot and bracket notation", () => {
    expect(parentJsonPath("$")).toBeNull();
    expect(parentJsonPath("$.data")).toBe("$");
    expect(parentJsonPath("$.annotations[0]")).toBe("$.annotations");
    expect(parentJsonPath('$.data["field name"]')).toBe("$.data");
  });

  it("includes matched paths and ancestors", () => {
    const visible = buildSearchVisiblePaths(["$.data.image", "$.annotations[2].id"]);

    expect(visible.has("$")).toBe(true);
    expect(visible.has("$.data")).toBe(true);
    expect(visible.has("$.data.image")).toBe(true);
    expect(visible.has("$.annotations")).toBe(true);
    expect(visible.has("$.annotations[2]")).toBe(true);
    expect(visible.has("$.annotations[2].id")).toBe(true);
    expect(visible.has("$.meta")).toBe(false);
  });

  it("returns empty set when there are no matches", () => {
    expect(buildSearchVisiblePaths([]).size).toBe(0);
  });

  it("compares visible path sets by contents", () => {
    const left = buildSearchVisiblePaths(["$.data.text"]);
    const right = buildSearchVisiblePaths(["$.data.text"]);
    const different = buildSearchVisiblePaths(["$.id"]);

    expect(areSearchVisiblePathsEqual(left, right)).toBe(true);
    expect(areSearchVisiblePathsEqual(left, different)).toBe(false);
  });
});
