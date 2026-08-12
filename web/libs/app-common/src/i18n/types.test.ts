import { expect, it } from "bun:test";
import { APP_LOCALES, DEFAULT_LOCALE, FALLBACK_LOCALE, isSupportedLocale, type SupportedLocale } from "./types";

it("exports English as both default and fallback locale", () => {
  expect(DEFAULT_LOCALE).toBe("en");
  expect(FALLBACK_LOCALE).toBe("en");
});

it("includes en and zh-CN in APP_LOCALES", () => {
  expect(APP_LOCALES).toContain("en");
  expect(APP_LOCALES).toContain("zh-CN");
});

it("isSupportedLocale returns true for supported locales", () => {
  expect(isSupportedLocale("en")).toBe(true);
  expect(isSupportedLocale("zh-CN")).toBe(true);
});

it("isSupportedLocale returns false for unsupported strings and non-string inputs", () => {
  // unsupported strings
  expect(isSupportedLocale("fr")).toBe(false);
  expect(isSupportedLocale("zh")).toBe(false);
  expect(isSupportedLocale("")).toBe(false);
  // non-string inputs (the unknown-type boundary path)
  expect(isSupportedLocale(null)).toBe(false);
  expect(isSupportedLocale(undefined)).toBe(false);
  expect(isSupportedLocale(123)).toBe(false);
  expect(isSupportedLocale({ locale: "en" })).toBe(false);
});

it("SupportedLocale type accepts the two known values at compile time", () => {
  const a: SupportedLocale = "en";
  const b: SupportedLocale = "zh-CN";
  expect([a, b]).toEqual(["en", "zh-CN"]);
});
