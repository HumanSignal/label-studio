import { describe, expect, it } from "bun:test";
import type { i18n as I18nInstance } from "i18next";
import { createI18n, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, resolveInitialLanguage, setLanguage } from ".";

const createStorage = (initialValue?: string) => {
  const values = new Map<string, string>();
  if (initialValue) values.set(LANGUAGE_STORAGE_KEY, initialValue);

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe("frontend internationalization", () => {
  it("falls back to English for an unsupported browser language", () => {
    expect(resolveInitialLanguage({ storage: createStorage(), browserLanguages: ["fr-FR"] })).toBe(DEFAULT_LANGUAGE);
  });

  it("detects a supported browser locale when no preference is saved", () => {
    expect(resolveInitialLanguage({ storage: createStorage(), browserLanguages: ["zh-Hans-CN", "en-US"] })).toBe(
      "zh-CN",
    );
  });

  it("prefers a saved language over browser detection", () => {
    expect(resolveInitialLanguage({ storage: createStorage("en"), browserLanguages: ["zh-CN"] })).toBe("en");
  });

  it("changes and persists an explicit language selection", async () => {
    const storage = createStorage();
    const instance = await createI18n({ storage, browserLanguages: ["en-US"] });

    await setLanguage("zh-CN", { instance, storage });

    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
    expect(instance.t("navigation.home")).toBe("首页");
  });

  it("falls back to the English value when a localized key is missing", async () => {
    const instance = await createChineseI18n();

    expect(instance.t("navigation.github")).toBe("GitHub");
  });

  it("interpolates values", async () => {
    const instance = await createChineseI18n();

    expect(instance.t("versionNotifier.currentVersion", { version: "1.22.0" })).toBe("当前版本：1.22.0");
  });

  it("applies plural forms", async () => {
    const instance = await createI18n({ storage: createStorage("en") });

    expect(instance.t("examples.itemCount", { count: 1 })).toBe("1 item");
    expect(instance.t("examples.itemCount", { count: 2 })).toBe("2 items");
  });
});

const createChineseI18n = (): Promise<I18nInstance> =>
  createI18n({ storage: createStorage("zh-CN"), browserLanguages: ["en-US"] });
