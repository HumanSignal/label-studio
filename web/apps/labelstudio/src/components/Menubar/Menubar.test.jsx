import { beforeEach, afterEach, expect, it } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider, useLanguage } from "@humansignal/app-common";

mockModule("@humansignal/core/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { email: "tester@example.com", allow_newsletters: true },
    isLoading: false,
  }),
}));

mockModule("../../providers/RoutesProvider", () => {
  const React = requireActual("react");
  return {
    __skipMerge: true,
    RoutesContext: React.createContext(null),
    RoutesProvider: ({ children }) => children,
    useRoutesMap: () => [],
    useFindRouteComponent: () => () => null,
    useBreadcrumbs: () => ({ crumbs: [], setBreadcrumbs: () => {} }),
    useCurrentPath: () => "/",
    useParams: () => ({}),
    useContextComponent: () => ({ ContextComponent: null, contextProps: {} }),
    useFixedLocation: () => ({ pathname: "/", search: "", hash: "" }),
    useContextProps: () => () => {},
  };
});

mockModule("../../app/StaticContent/StaticContent", () => ({
  __skipMerge: true,
  StaticContent: () => null,
}));

mockModule("../VersionNotifier/VersionNotifier", () => ({
  __skipMerge: true,
  VersionProvider: ({ children }) => children,
  VersionNotifier: () => null,
}));

const { Menubar } = await import("./Menubar");

const LanguageSwitch = ({ to }) => {
  const { setLanguage } = useLanguage();
  return <button onClick={() => setLanguage(to)}>switch-{to}</button>;
};

beforeEach(() => {
  localStorage.clear();
  globalThis.location = window.location;
  const settings = { hostname: "http://localhost" };
  globalThis.APP_SETTINGS = settings;
  window.APP_SETTINGS = settings;
});

afterEach(() => {
  localStorage.clear();
});

const renderMenubar = () =>
  render(
    <I18nProvider browserLanguages={["en"]}>
      <MemoryRouter>
        <Menubar enabled={true} defaultOpened={true} />
      </MemoryRouter>
      <LanguageSwitch to="zh-CN" />
      <LanguageSwitch to="en" />
    </I18nProvider>,
  );

it("renders sidebar items in English by default", () => {
  renderMenubar();
  expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Organization" })).toBeInTheDocument();
});

it("re-renders in zh-CN after language switch", () => {
  renderMenubar();
  fireEvent.click(screen.getByText("switch-zh-CN"));
  expect(screen.getByRole("link", { name: "首页" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "项目" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "组织" })).toBeInTheDocument();
});
