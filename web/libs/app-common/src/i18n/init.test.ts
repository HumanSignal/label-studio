import { expect, it } from "bun:test";
import { getI18n, initI18n } from "./init";

it("initI18n is idempotent and returns the shared i18next instance", () => {
  const a = initI18n();
  const b = initI18n();
  expect(a).toBe(b);
  expect(a.isInitialized).toBe(true);
});

it("getI18n auto-initializes if not yet initialized", () => {
  const instance = getI18n();
  expect(instance.isInitialized).toBe(true);
});

it("falls back to English key when translation is missing", () => {
  const instance = getI18n();
  // Switch to zh-CN then look up an unknown key
  instance.changeLanguage("zh-CN");
  expect(instance.t("does.not.exist")).toBe("menubar:does.not.exist");
  // Restore default
  instance.changeLanguage("en");
});

it("translates a known menubar key in both locales", () => {
  const instance = getI18n();
  instance.changeLanguage("en");
  expect(instance.t("menubar:home")).toBe("Home");
  instance.changeLanguage("zh-CN");
  expect(instance.t("menubar:home")).toBe("首页");
  instance.changeLanguage("en");
});
