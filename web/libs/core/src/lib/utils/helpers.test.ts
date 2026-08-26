/**
 * Tests for time/number formatting helpers.
 */

import { formatTime } from "./helpers";

describe("formatTime", () => {
  it("formats whole seconds, minutes, and hours", () => {
    expect(formatTime(45)).toBe("45s");
    expect(formatTime(322)).toBe("5m 22s");
    expect(formatTime(3600)).toBe("1h");
    expect(formatTime(36922)).toBe("10h 15m 22s");
  });

  it("floors fractional seconds >= 1", () => {
    expect(formatTime(42.4)).toBe("42s");
    expect(formatTime(1.999)).toBe("1s");
  });

  // FIT-1670: sub-second median/lead times floored to 0 and rendered blank "—".
  it("renders sub-second positive durations as <1s instead of blank", () => {
    expect(formatTime(0.851)).toBe("<1s");
    expect(formatTime(0.29)).toBe("<1s");
    expect(formatTime(0.999)).toBe("<1s");
  });

  it("returns empty string for zero, negative, and non-finite values", () => {
    expect(formatTime(0)).toBe("");
    expect(formatTime(-5)).toBe("");
    expect(formatTime(Number.NaN)).toBe("");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("");
  });

  // Mirrors the Annotation Summary / Analytics table display: `formatTime(value) || "—"`.
  // FIT-1670: user 57518's median lead time of 0.851s previously rendered as a blank "—".
  it("renders a value (not a blank em dash) at the table display call-site for sub-second medians", () => {
    const display = (value: number) => formatTime(value) || "—";
    expect(display(0.851)).toBe("<1s");
    expect(display(42.4)).toBe("42s");
    expect(display(0)).toBe("—");
  });
});
