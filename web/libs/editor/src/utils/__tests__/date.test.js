/* global describe, test, expect, beforeEach, afterEach */
import { msToHMS, prettyDate } from "../date";

describe("Helper function prettyDate", () => {
  test("Undefined", () => {
    expect(prettyDate(undefined)).toBeUndefined();
    expect(prettyDate(null)).toBeUndefined();
    expect(prettyDate(123)).toBeUndefined();
  });

  describe("relative dates (with fixed now)", () => {
    const fixedNow = new Date("2025-02-10T12:00:00.000Z");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("Yesterday", () => {
      const resultDate = new Date("2025-02-09T12:00:00.000Z");
      expect(prettyDate(resultDate.toISOString())).toBe("Yesterday");
    });

    test("2 days ago", () => {
      const resultDate = new Date("2025-02-08T12:00:00.000Z");
      expect(prettyDate(resultDate.toISOString())).toBe("2 days ago");
    });

    test("2 weeks ago", () => {
      const resultDate = new Date("2025-01-27T12:00:00.000Z");
      expect(prettyDate(resultDate.toISOString())).toBe("2 weeks ago");
    });

    test("100 days ago", () => {
      const resultDate = new Date("2024-11-02T12:00:00.000Z");
      expect(prettyDate(resultDate.toISOString())).toBe("100 days ago");
    });
  });
});

describe("Helper function msToHMS", () => {
  test("Correct", () => {
    expect(msToHMS(10000)).toBe("0:0:10");
  });
});
