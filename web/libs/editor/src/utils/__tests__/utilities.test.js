/* global it, describe, expect, test */
import {
  emailFromCreatedBy,
  toArray,
  getUrl,
  isString,
  isStringEmpty,
  isStringJSON,
  toTimeString,
  isValidObjectURL,
  flatten,
  hashCode,
  escapeHtml,
  clamp,
  isDefined,
  isArraysEqual,
  wrapArray,
  chunks,
  minMax,
  humanDateDiff,
  sortAnnotations,
  findClosestParent,
  camelizeKeys,
  snakeizeKeys,
  destroyMSTObject,
  fixMobxObserve,
} from "../utilities";

describe("Helper function emailFromCreatedBy", () => {
  expect(emailFromCreatedBy("abc@def.com, 12")).toBe("abc@def.com");
  // empty username, not a rare case
  expect(emailFromCreatedBy(" abc@def.com, 12")).toBe("abc@def.com");
  expect(emailFromCreatedBy("usrnm abc@def.com, 12")).toBe("abc@def.com");
  // first and last name
  expect(emailFromCreatedBy("Abc Def ab.c+12@def.com.pt, 12")).toBe("ab.c+12@def.com.pt");
  // complex case
  expect(emailFromCreatedBy("Ab.C D@E.F ab.c+12@def.com.pt, 12")).toBe("ab.c+12@def.com.pt");
  // just a email, should not be a real case though
  expect(emailFromCreatedBy("ab.c+12@def.com.pt")).toBe("ab.c+12@def.com.pt");
});

describe("Helper function toArray, converting any value to array, skipping undefined values", () => {
  test("Empty", () => {
    expect(toArray()).toEqual([]);
  });

  test("Single value", () => {
    expect(toArray("value")).toEqual(["value"]);
  });

  test("Zero", () => {
    expect(toArray(0)).toEqual([0]);
  });

  test("Array", () => {
    expect(toArray(["value"])).toEqual(["value"]);
  });
});

/**
 * isString
 */
it("Function isString works", () => {
  expect(isString("value")).toBeTruthy();
});

/**
 * isStringEmpty
 */
describe("Helper function isStringEmpty", () => {
  test("Empty", () => {
    expect(isStringEmpty("")).toBeTruthy();
  });

  test("Not string", () => {
    expect(isStringEmpty(123)).toBeFalsy();
  });

  test("Not empty", () => {
    expect(isStringEmpty("value")).toBeFalsy();
  });
});

/**
 * isStringJSON
 */
describe("Helper function isStrinJSON", () => {
  test("JSON", () => {
    expect(isStringJSON('{"test": "value"}')).toBeTruthy();
  });

  test("String isn't JSON", () => {
    expect(isStringJSON("value")).toBeFalsy();
  });

  test("Number", () => {
    expect(isStringJSON(1)).toBeFalsy();
  });

  test("Null", () => {
    expect(isStringJSON(null)).toBeFalsy();
  });
});

/**
 * getUrl
 */
describe("Helper function getUrl", () => {
  test("Correct https", () => {
    expect(getUrl(0, "https://heartex.net testing value")).toBe("https://heartex.net");
  });

  test("Correct http", () => {
    expect(getUrl(0, "http://heartex.net testing value")).toBe("http://heartex.net");
  });

  test("Correct wwww", () => {
    expect(getUrl(0, "www.heartex.net testing value")).toBe("www.heartex.net");
  });

  test("Not correct", () => {
    expect(getUrl(2, "https://heartex.net testing value")).toBe("");
  });
});

/**
 * toTimeString
 */
describe("Helper function toTimeString", () => {
  test("Correct", () => {
    expect(toTimeString(5000)).toBe("00:00:05");
  });
  test("returns undefined when not a number", () => {
    expect(toTimeString("5000")).toBeUndefined();
    expect(toTimeString(undefined)).toBeUndefined();
  });
});

describe("isValidObjectURL", () => {
  it("returns true for https URL", () => {
    expect(isValidObjectURL("https://example.com")).toBe(true);
  });
  it("returns true for http URL", () => {
    expect(isValidObjectURL("http://example.com")).toBe(true);
  });
  it("returns false for non-string", () => {
    expect(isValidObjectURL(123)).toBe(false);
  });
  it("returns true for relative path when relative=true", () => {
    expect(isValidObjectURL("/path", true)).toBe(true);
  });
  it("returns false for relative path when relative=false", () => {
    expect(isValidObjectURL("/path", false)).toBe(false);
  });
});

describe("flatten", () => {
  it("flattens nested arrays", () => {
    expect(flatten([1, [2, 3], [4, [5, 6]]])).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("returns empty for empty array", () => {
    expect(flatten([])).toEqual([]);
  });
});

describe("hashCode", () => {
  it("returns string of number", () => {
    expect(hashCode("")).toBe("0");
    expect(typeof hashCode("hello")).toBe("string");
    expect(hashCode("a")).not.toBe(hashCode("b"));
  });
});

describe("escapeHtml", () => {
  it("escapes & < > \" '", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"x"')).toBe("&quot;x&quot;");
  });
  it("handles null/undefined as empty string", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("clamp", () => {
  it("clamps value between min and max", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("isDefined", () => {
  it("returns false for null and undefined", () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
  it("returns true for other values", () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(false)).toBe(true);
  });
});

describe("isArraysEqual", () => {
  it("returns true for equal arrays", () => {
    expect(isArraysEqual([1, 2], [1, 2])).toBe(true);
  });
  it("returns false for different order", () => {
    expect(isArraysEqual([1, 2], [2, 1])).toBe(false);
  });
  it("returns false for different length", () => {
    expect(isArraysEqual([1], [1, 2])).toBe(false);
  });
});

describe("chunks", () => {
  it("splits array into chunks", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns empty for empty array", () => {
    expect(chunks([], 2)).toEqual([]);
  });
});

describe("minMax", () => {
  it("returns [min, max] of numbers", () => {
    expect(minMax([3, 1, 2])).toEqual([1, 3]);
  });
  it("handles single element", () => {
    expect(minMax([42])).toEqual([42, 42]);
  });
});

describe("humanDateDiff", () => {
  it("returns string for date", () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 2);
    expect(humanDateDiff(d.getTime())).toMatch(/\d+\s+(minute|second)s?\s+ago|just now/);
  });
  it("returns a string (e.g. just now or N minutes ago)", () => {
    const d = new Date();
    d.setSeconds(d.getSeconds() - 5);
    const result = humanDateDiff(d.getTime());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("sortAnnotations", () => {
  it("sorts by createdDate latest first", () => {
    const list = [
      { id: "a", createdDate: "2020-01-01" },
      { id: "b", createdDate: "2020-01-03" },
      { id: "c", createdDate: "2020-01-02" },
    ];
    const result = sortAnnotations([...list]);
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("c");
    expect(result[2].id).toBe("a");
  });
});

describe("wrapArray", () => {
  it("wraps value in array", () => {
    expect(wrapArray(1)).toEqual([1]);
    expect(wrapArray("x")).toEqual(["x"]);
  });
  it("concats array into single array", () => {
    expect(wrapArray([1, 2])).toEqual([1, 2]);
  });
});

describe("findClosestParent", () => {
  it("returns first parent matching predicate", () => {
    const child = { parent: null };
    const mid = { parent: null };
    const root = { parent: null };
    child.parent = mid;
    mid.parent = root;
    const pred = (el) => el === root;
    expect(findClosestParent(child, pred)).toBe(root);
  });
  it("returns null when no parent matches", () => {
    const child = { parent: null };
    child.parent = { parent: null };
    expect(findClosestParent(child, () => false)).toBeNull();
  });
  it("uses custom parentGetter", () => {
    const el = { next: { next: null } };
    el.next.next = el;
    const result = findClosestParent(
      el,
      (e) => e.next?.next === el,
      (e) => e.next,
    );
    expect(result).toEqual(el.next);
  });
});

describe("camelizeKeys", () => {
  it("converts object keys to camelCase", () => {
    expect(camelizeKeys({ foo_bar: 1 })).toEqual({ fooBar: 1 });
  });
  it("recurses into nested objects", () => {
    expect(camelizeKeys({ one_two: { three_four: 1 } })).toEqual({ oneTwo: { threeFour: 1 } });
  });
});

describe("snakeizeKeys", () => {
  it("converts object keys to snake_case", () => {
    expect(snakeizeKeys({ fooBar: 1 })).toEqual({ foo_bar: 1 });
  });
  it("recurses into nested objects", () => {
    expect(snakeizeKeys({ oneTwo: { threeFour: 1 } })).toEqual({ one_two: { three_four: 1 } });
  });
});

describe("destroyMSTObject", () => {
  it("does nothing when object is falsy", () => {
    expect(() => destroyMSTObject(null)).not.toThrow();
    expect(() => destroyMSTObject(undefined)).not.toThrow();
  });
});

describe("fixMobxObserve", () => {
  it("is a no-op that accepts any args", () => {
    expect(() => fixMobxObserve()).not.toThrow();
    expect(() => fixMobxObserve(1, 2, 3)).not.toThrow();
  });
});
