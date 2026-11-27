import { useState, useCallback } from "react";

/**
 * React hook that persists state in localStorage with JSON serialization.
 *
 * @param key - localStorage key
 * @param defaultValue - initial value when key is absent
 * @returns tuple of [value, setter] similar to useState
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // quota exceeded or other storage error — state still updates in memory
      }
    },
    [key],
  );

  return [storedValue, setValue];
}
