import { expect, it, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "./I18nProvider";
import { useLanguage } from "./useLanguage";

const Probe = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="current">{language}</span>
      <span data-testid="home">{t("menubar:home")}</span>
      <button onClick={() => setLanguage("zh-CN")}>switch-zh</button>
      <button onClick={() => setLanguage("en")}>switch-en</button>
    </div>
  );
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

it("defaults to en when no preference is stored", () => {
  render(
    <I18nProvider browserLanguages={["en-US"]}>
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("en");
  expect(screen.getByTestId("home")).toHaveTextContent("Home");
});

it("switches to zh-CN and persists on button click", () => {
  render(
    <I18nProvider browserLanguages={["en"]}>
      <Probe />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByText("switch-zh"));
  expect(screen.getByTestId("current")).toHaveTextContent("zh-CN");
  expect(screen.getByTestId("home")).toHaveTextContent("首页");
  expect(localStorage.getItem("label-studio.lang")).toBe("zh-CN");
});

it("falls back to English when key is missing in zh-CN", () => {
  const MissingProbe = () => {
    const { t } = useLanguage();
    return <span data-testid="missing">{t("menubar:not.a.real.key")}</span>;
  };
  const { container } = render(
    <I18nProvider browserLanguages={["zh-CN"]}>
      <MissingProbe />
    </I18nProvider>,
  );
  expect(container.querySelector('[data-testid="missing"]')).toHaveTextContent("menubar:not.a.real.key");
});

it("uses stored language on mount regardless of browser locale", () => {
  localStorage.setItem("label-studio.lang", "zh-CN");
  render(
    <I18nProvider browserLanguages={["en"]}>
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("zh-CN");
});

it("uses browser detection when nothing is stored", () => {
  render(
    <I18nProvider browserLanguages={["zh-TW", "en"]}>
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("zh-CN");
  expect(screen.getByTestId("home")).toHaveTextContent("首页");
});
