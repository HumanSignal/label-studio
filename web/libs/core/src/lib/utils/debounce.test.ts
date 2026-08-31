/**
 * Tests for debounce — validates the es-toolkit/compat re-export behaves as expected.
 */

import { debounce } from "./debounce";

describe("debounce", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("invokes the function only once after wait when called repeatedly", async () => {
    const func = mock();
    const debouncedFunc = debounce(func, 10);

    for (let i = 0; i < 100; i++) {
      debouncedFunc();
    }

    expect(func).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(func).toHaveBeenCalledTimes(1);
  });

  it("invokes with the last passed arguments", async () => {
    const func = mock();
    const debouncedFunc = debounce(func, 10);

    debouncedFunc("a");
    debouncedFunc("b");
    debouncedFunc("c");
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith("c");
  });

  it("supports cancel to clear pending invocation", async () => {
    const func = mock();
    const debouncedFunc = debounce(func, 20);

    debouncedFunc();
    debouncedFunc.cancel();
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(func).not.toHaveBeenCalled();
  });

  it("supports flush to invoke pending call immediately", () => {
    const func = mock(() => 42);
    const debouncedFunc = debounce(func, 1000);

    debouncedFunc("x");
    expect(func).not.toHaveBeenCalled();

    const result = debouncedFunc.flush();
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith("x");
    expect(result).toBe(42);
  });

  // Note: es-toolkit/compat does not throw at creation time for non-function args
  // (unlike lodash which threw "Expected a function"). It fails at call time instead.
});
