/**
 * Tests for debounce — ensures behavior remains consistent with lodash-style debounce.
 */

import { debounce } from "./debounce";

jest.useFakeTimers();

describe("debounce", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invokes the function only once after wait when called repeatedly", () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 1000);

    for (let i = 0; i < 100; i++) {
      debouncedFunc();
    }

    expect(func).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(func).toHaveBeenCalledTimes(1);
  });

  it("invokes with the last passed arguments", () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 100);

    debouncedFunc("a");
    debouncedFunc("b");
    debouncedFunc("c");
    jest.runAllTimers();

    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith("c");
  });

  it("supports cancel to clear pending invocation", () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 1000);

    debouncedFunc();
    debouncedFunc.cancel();
    jest.runAllTimers();

    expect(func).not.toHaveBeenCalled();
  });

  it("supports flush to invoke pending call immediately", () => {
    const func = jest.fn(() => 42);
    const debouncedFunc = debounce(func, 1000);

    debouncedFunc("x");
    expect(func).not.toHaveBeenCalled();

    const result = debouncedFunc.flush();
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith("x");
    expect(result).toBe(42);
  });

  it("throws when not given a function", () => {
    expect(() => debounce(null as any, 100)).toThrow("Expected a function");
    expect(() => debounce(123 as any, 100)).toThrow("Expected a function");
  });
});
