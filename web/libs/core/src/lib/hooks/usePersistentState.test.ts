import { renderHook, act } from "@testing-library/react";
import { usePersistentState, usePersistentJSONState } from "./usePersistentState";

describe("usePersistentState", () => {
  const key = "test-key";

  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default value when localStorage is empty", () => {
    const { result } = renderHook(() => usePersistentState<string>(key, "default"));
    expect(result.current[0]).toBe("default");
  });

  it("should initialize from localStorage if value exists without using decoder", () => {
    // Save a string value directly to localStorage
    localStorage.setItem(key, "storedValue");
    const { result } = renderHook(() => usePersistentState<string>(key, "default"));
    // Since no decoder is provided, localStorage value is taken as is.
    expect(result.current[0]).toBe("storedValue");
  });

  it("should update state and persist new value to localStorage (direct update)", () => {
    const { result } = renderHook(() => usePersistentState<number>(key, 1));
    // Initially default value
    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1](5);
    });
    expect(result.current[0]).toBe(5);
    // The new value should be stored. Without a custom encoder, number is converted using toString.
    expect(localStorage.getItem(key)).toBe("5");
  });

  it("should update state using callback updater and persist the new value", () => {
    const { result } = renderHook(() => usePersistentState<number>(key, 10));
    act(() => {
      result.current[1]((prev) => prev + 5);
    });
    expect(result.current[0]).toBe(15);
    expect(localStorage.getItem(key)).toBe("15");
  });

  it("should use provided encoder and decoder functions when specified", () => {
    const encoder = (value: number) => `encoded-${value}`;
    const decoder = (storedValue: string, defaultValue: number) => {
      const match = storedValue.match(/^encoded-(\d+)$/);
      return match ? Number(match[1]) : defaultValue;
    };

    // Save a value using custom encoder
    localStorage.setItem(key, encoder(20));
    const { result } = renderHook(() => usePersistentState<number>(key, 0, { encoder, decoder }));
    expect(result.current[0]).toBe(20);

    act(() => {
      result.current[1](25);
    });
    expect(result.current[0]).toBe(25);
    expect(localStorage.getItem(key)).toBe(encoder(25));
  });
});

describe("usePersistentJSONState", () => {
  const key = "json-key";

  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default value when localStorage is empty", () => {
    const { result } = renderHook(() => usePersistentJSONState<{ count: number }>(key, { count: 0 }));
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it("should initialize state from valid JSON found in localStorage", () => {
    const storedObject = { count: 5 };
    localStorage.setItem(key, JSON.stringify(storedObject));
    const { result } = renderHook(() => usePersistentJSONState<{ count: number }>(key, { count: 0 }));
    expect(result.current[0]).toEqual(storedObject);
  });

  it("should use default value when stored JSON is invalid", () => {
    // Set an invalid JSON value
    localStorage.setItem(key, "invalid json");
    const { result } = renderHook(() => usePersistentJSONState<{ count: number }>(key, { count: 100 }));
    expect(result.current[0]).toEqual({ count: 100 });
  });

  it("should update JSON state and persist new value to localStorage", () => {
    const { result } = renderHook(() => usePersistentJSONState<{ count: number }>(key, { count: 0 }));
    act(() => {
      result.current[1]({ count: 42 });
    });
    expect(result.current[0]).toEqual({ count: 42 });
    expect(localStorage.getItem(key)).toBe(JSON.stringify({ count: 42 }));
  });

  it("should update JSON state using a callback updater", () => {
    const { result } = renderHook(() => usePersistentJSONState<{ count: number }>(key, { count: 10 }));
    act(() => {
      result.current[1]((prev) => ({ count: prev.count * 2 }));
    });
    expect(result.current[0]).toEqual({ count: 20 });
    expect(localStorage.getItem(key)).toBe(JSON.stringify({ count: 20 }));
  });
});
