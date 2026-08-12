import { afterEach, beforeEach, expect, it } from "bun:test";
import { createI18nConfig, resolveInitialLanguage } from "./config";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

it("resolveInitialLanguage prefers explicit user selection over browser locale", () => {
  localStorage.setItem("label-studio.lang", "zh-CN");
  expect(resolveInitialLanguage(["en"])).toBe("zh-CN");
});

it("resolveInitialLanguage falls back to browser detection when no selection stored", () => {
  expect(resolveInitialLanguage(["zh-CN", "en"])).toBe("zh-CN");
  expect(resolveInitialLanguage(["en-US"])).toBe("en");
});

it("resolveInitialLanguage falls back to en when nothing matches", () => {
  expect(resolveInitialLanguage(["fr", "de"])).toBe("en");
});

it("createI18nConfig produces a config with en as fallback", () => {
  const config = createI18nConfig({ initialLanguage: "zh-CN" });
  expect(config.fallbackLng).toBe("en");
  expect(config.lng).toBe("zh-CN");
  expect(config.supportedLngs).toEqual(["en", "zh-CN"]);
  expect(config.resources.en.menubar).toBeDefined();
  expect(config.resources["zh-CN"].menubar).toBeDefined();
  expect(config.resources.en.menubar.home).toBe("Home");
  expect(config.resources["zh-CN"].menubar.home).toBe("首页");
  expect(config.ns).toEqual(["menubar"]);
  expect(config.defaultNS).toBe("menubar");
  expect(config.interpolation.escapeValue).toBe(false);
});

it("createI18nConfig defaults initialLanguage to en when omitted", () => {
  const config = createI18nConfig();
  expect(config.lng).toBe("en");
});
