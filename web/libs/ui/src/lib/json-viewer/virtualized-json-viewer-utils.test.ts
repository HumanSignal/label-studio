import { describe, expect, it } from "bun:test";
import {
  clipString,
  DEFAULT_STRING_TRUNCATE,
  formatNodeClipboardText,
  resolveInitialExpandDepth,
  resolvePathFilterQuery,
  resolveStringTruncate,
  VIRTUALIZED_DEFAULT_EXPAND_DEPTH,
} from "./virtualized-json-viewer-utils";

describe("virtualized-json-viewer-utils", () => {
  it("clips long strings with ellipsis", () => {
    expect(clipString("hello", 200)).toBe("hello");
    expect(clipString("a".repeat(200), 200)).toBe("a".repeat(200));
    expect(clipString("a".repeat(201), 200)).toBe(`${"a".repeat(197)}...`);
  });

  it("defaults string truncation to json-edit-react parity", () => {
    expect(resolveStringTruncate()).toBe(DEFAULT_STRING_TRUNCATE);
    expect(DEFAULT_STRING_TRUNCATE).toBe(200);
  });

  it("formats clipboard text like json-edit-react", () => {
    expect(formatNodeClipboardText("hello")).toBe("hello");
    expect(formatNodeClipboardText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it("maps active filter ids to pathFilterQuery", () => {
    expect(resolvePathFilterQuery(null)).toBeUndefined();
    expect(resolvePathFilterQuery("all")).toBeUndefined();
    expect(resolvePathFilterQuery("annotations")).toBe("$.annotations");
  });

  it("caps expand depth for Infinity collapse to avoid MB blowout", () => {
    expect(resolveInitialExpandDepth(Number.POSITIVE_INFINITY)).toBe(VIRTUALIZED_DEFAULT_EXPAND_DEPTH);
    expect(resolveInitialExpandDepth(false)).toBe(VIRTUALIZED_DEFAULT_EXPAND_DEPTH);
    expect(resolveInitialExpandDepth(3)).toBe(3);
    expect(resolveInitialExpandDepth(true)).toBe(0);
  });
});
