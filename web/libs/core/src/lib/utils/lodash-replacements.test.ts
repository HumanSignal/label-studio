/**
 * Tests for lodash-replacement utilities (throttle, clamp, get, isMatch, uniqBy).
 * Validates the es-toolkit re-exports behave as expected.
 */

import { clamp, get, isMatch, throttle, uniqBy } from "./lodash-replacements";

jest.useFakeTimers();

describe("throttle", () => {
  it("limits invocations when called repeatedly (throttled)", () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);

    for (let i = 0; i < 20; i++) {
      throttled();
    }
    // With leading: true (default), first call invokes immediately; trailing may invoke once after wait
    expect(func).toHaveBeenCalled();
    expect(func.mock.calls.length).toBeLessThan(20);
  });

  it("exposes cancel and flush", () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);
    expect(typeof throttled.cancel).toBe("function");
    expect(typeof throttled.flush).toBe("function");
    throttled();
    throttled.cancel();
    jest.runAllTimers();
    // After cancel, pending trailing is cleared; only leading may have fired once
    expect(func.mock.calls.length).toBeLessThanOrEqual(1);
  });

  // Note: es-toolkit/compat does not throw at creation time for non-function args
  // (unlike lodash which threw "Expected a function"). It fails at call time instead.
});

describe("clamp", () => {
  it("clamps number within lower and upper", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("supports two-arg form (upper only, lower undefined)", () => {
    expect(clamp(15, 10)).toBe(10);
    expect(clamp(5, 10)).toBe(5);
  });

  it("handles NaN in number", () => {
    expect(clamp(Number.NaN, 0, 10)).toBeNaN();
  });
});

describe("get", () => {
  it("gets value by dot path", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(get(obj, "a.b.c")).toBe(42);
    expect(get(obj, "a.b")).toEqual({ c: 42 });
  });

  it("gets value by bracket path", () => {
    const obj = { a: [{ x: 1 }, { x: 2 }] };
    expect(get(obj, "a[0].x")).toBe(1);
    expect(get(obj, "a[1].x")).toBe(2);
  });

  it("returns default when path is missing", () => {
    const obj = { a: 1 };
    expect(get(obj, "b")).toBeUndefined();
    expect(get(obj, "b", "default")).toBe("default");
    expect(get({ a: { b: undefined } }, "a.b", "fallback")).toBe("fallback");
  });

  it("handles null/undefined object", () => {
    expect(get(null, "a")).toBeUndefined();
    expect(get(undefined, "a", 99)).toBe(99);
  });
});

describe("isMatch", () => {
  it("returns true when object contains equivalent property values (partial match)", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(isMatch(obj, { a: 1 })).toBe(true);
    expect(isMatch(obj, { a: 1, b: 2 })).toBe(true);
    expect(isMatch(obj, { a: 1, b: 2, c: 3 })).toBe(true);
  });

  it("returns false when a property does not match", () => {
    const obj = { a: 1, b: 2 };
    expect(isMatch(obj, { a: 2 })).toBe(false);
    expect(isMatch(obj, { b: 1 })).toBe(false);
  });

  it("performs deep partial comparison", () => {
    const obj = { a: { x: 1, y: 2 }, b: 3 };
    expect(isMatch(obj, { a: { x: 1 } })).toBe(true);
    expect(isMatch(obj, { a: { x: 1, y: 2 } })).toBe(true);
    expect(isMatch(obj, { a: { x: 2 } })).toBe(false);
  });

  it("returns true for same reference", () => {
    const obj = { a: 1 };
    expect(isMatch(obj, obj)).toBe(true);
  });

  it("returns false for null/undefined object", () => {
    expect(isMatch(null, { a: 1 })).toBe(false);
    expect(isMatch(undefined, { a: 1 })).toBe(false);
  });
});

describe("uniqBy", () => {
  it("removes duplicates by iteratee key", () => {
    const arr = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
      { id: 1, name: "c" },
    ];
    expect(uniqBy(arr, "id")).toEqual([
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ]);
  });

  it("removes duplicates by iteratee function", () => {
    const arr = [1.1, 1.2, 2.1, 2.2];
    expect(uniqBy(arr, Math.floor)).toEqual([1.1, 2.1]);
  });

  it("returns empty array for null/undefined or empty array", () => {
    expect(uniqBy([], "id")).toEqual([]);
    expect(uniqBy(null as any, "id")).toEqual([]);
  });
});
