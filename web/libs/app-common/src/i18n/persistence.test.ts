import { afterEach, beforeEach, expect, it, mock } from "bun:test";
import { clearStoredLanguage, getStoredLanguage, setStoredLanguage } from "./persistence";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

it("returns null when no language is stored", () => {
  expect(getStoredLanguage()).toBeNull();
});

it("round-trips a supported language through localStorage", () => {
  setStoredLanguage("zh-CN");
  expect(getStoredLanguage()).toBe("zh-CN");
  expect(localStorage.getItem("label-studio.lang")).toBe("zh-CN");
});

it("overwrites the previous value on subsequent writes", () => {
  setStoredLanguage("zh-CN");
  setStoredLanguage("en");
  expect(getStoredLanguage()).toBe("en");
});

it("clearStoredLanguage removes the entry", () => {
  setStoredLanguage("en");
  clearStoredLanguage();
  expect(getStoredLanguage()).toBeNull();
});

it("silently ignores quota / disabled localStorage", () => {
  const original = globalThis.localStorage;
  const throwing = {
    ...original,
    getItem: () => {
      throw new Error("disabled");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("disabled");
    },
  } as Storage;
  Object.defineProperty(globalThis, "localStorage", { value: throwing, configurable: true });

  expect(getStoredLanguage()).toBeNull();
  expect(() => setStoredLanguage("en")).not.toThrow();
  expect(() => clearStoredLanguage()).not.toThrow();

  Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
});
