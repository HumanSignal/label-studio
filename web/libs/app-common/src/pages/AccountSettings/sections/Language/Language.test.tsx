import { beforeAll, describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { initI18n, LANGUAGE_STORAGE_KEY, setLanguage } from "../../../../i18n";
import { LanguageSettings } from "./Language";

describe("LanguageSettings", () => {
  beforeAll(async () => {
    Element.prototype.scrollIntoView = () => {};
    localStorage.clear();
    await initI18n({ storage: localStorage, browserLanguages: ["en-US"] });
    await setLanguage("en");
  });

  it("updates the interface and persists the selection without a reload", async () => {
    render(<LanguageSettings />);

    fireEvent.click(screen.getByTestId("language-selector"));
    fireEvent.click(await screen.findByText("简体中文"));

    await waitFor(() => expect(screen.getByText("界面语言")).toBeInTheDocument());
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
  });
});
