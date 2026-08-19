import { beforeEach, expect, it } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nProvider } from "@humansignal/app-common";

const { LanguageSwitcher } = await import("./LanguageSwitcher");

beforeEach(() => {
  localStorage.clear();
  document.cookie = "django_language=; path=/; max-age=0";
});

const renderSwitcher = (browserLanguages) =>
  render(
    <I18nProvider browserLanguages={browserLanguages}>
      <LanguageSwitcher />
    </I18nProvider>,
  );

it("renders the trigger with a localized tooltip", () => {
  renderSwitcher(["en"]);
  expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  expect(screen.getByLabelText("Switch language")).toBeInTheDocument();
});

it("renders the trigger in Chinese when the browser is Chinese", () => {
  renderSwitcher(["zh-CN"]);
  expect(screen.getByLabelText("切换语言")).toBeInTheDocument();
});

it("lists both locales with the current one active", async () => {
  renderSwitcher(["en"]);
  fireEvent.click(screen.getByTestId("language-switcher"));

  await waitFor(() => expect(screen.getByText("中文（简体）")).toBeInTheDocument());
  expect(screen.getByText("English")).toBeInTheDocument();
  expect(screen.getByText("English").className).toContain("active");
  expect(screen.getByText("中文（简体）").className).not.toContain("active");
});

it("persists the locale and syncs the Django cookie on switch", async () => {
  renderSwitcher(["en"]);
  fireEvent.click(screen.getByTestId("language-switcher"));

  await waitFor(() => fireEvent.click(screen.getByText("中文（简体）")));

  expect(localStorage.getItem("label-studio.lang")).toBe("zh-CN");
  expect(document.cookie).toContain("django_language=zh-CN");
});
