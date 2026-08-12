import { expect, it } from "bun:test";
import { resolveBrowserLocale } from "./detection";

it("maps exact zh-CN match", () => {
  expect(resolveBrowserLocale(["zh-CN"])).toBe("zh-CN");
});

it("maps zh-TW / zh-HK / plain zh to zh-CN as the closest supported locale", () => {
  expect(resolveBrowserLocale(["zh-TW"])).toBe("zh-CN");
  expect(resolveBrowserLocale(["zh-HK"])).toBe("zh-CN");
  expect(resolveBrowserLocale(["zh"])).toBe("zh-CN");
});

it("returns en for English variants", () => {
  expect(resolveBrowserLocale(["en-US"])).toBe("en");
  expect(resolveBrowserLocale(["en-GB"])).toBe("en");
  expect(resolveBrowserLocale(["en"])).toBe("en");
});

it("falls back to en when no language matches", () => {
  expect(resolveBrowserLocale(["fr", "de-DE", "ja-JP"])).toBe("en");
});

it("falls back to en when the list is empty", () => {
  expect(resolveBrowserLocale([])).toBe("en");
});

it("respects order: prefers earlier languages when multiple match", () => {
  expect(resolveBrowserLocale(["zh-CN", "en"])).toBe("zh-CN");
  expect(resolveBrowserLocale(["en", "zh-CN"])).toBe("en");
});
