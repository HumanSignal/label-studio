import { beforeEach, afterEach, expect, it } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider, useLanguage } from "@humansignal/app-common";

// ProjectsList pulls Menu/Pagination from the "../../components" barrel, which
// re-exports Menubar + VersionNotifier. Those transitively import StaticContent
// -> AsyncPage -> App.jsx (which loads a CSS file bun:test cannot resolve). Mock
// the heavy modules to cut the chain, mirroring Menubar.test.jsx.
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

mockModule("../../components/VersionNotifier/VersionNotifier", () => ({
  __skipMerge: true,
  VersionProvider: ({ children }) => children,
  VersionNotifier: () => null,
}));

const { EmptyProjectsList, ProjectsList } = await import("./ProjectsList");

const LanguageSwitch = ({ to }) => {
  const { setLanguage } = useLanguage();
  return <button onClick={() => setLanguage(to)}>switch-{to}</button>;
};

beforeEach(() => {
  localStorage.clear();
  globalThis.location = window.location;
  globalThis.history = window.history;
  const settings = { hostname: "http://localhost" };
  globalThis.APP_SETTINGS = settings;
  window.APP_SETTINGS = settings;
});

afterEach(() => {
  localStorage.clear();
});

const renderWithI18n = (children) =>
  render(
    <I18nProvider browserLanguages={["en"]}>
      <MemoryRouter>{children}</MemoryRouter>
      <LanguageSwitch to="zh-CN" />
      <LanguageSwitch to="en" />
    </I18nProvider>,
  );

it("renders EmptyProjectsList in English by default", () => {
  renderWithI18n(<EmptyProjectsList openModal={() => {}} />);
  expect(screen.getByText("Heidi doesn't see any projects here!")).toBeInTheDocument();
  expect(screen.getByText("Create one and start labeling your data.")).toBeInTheDocument();
  // button accessible name comes from its aria-label
  expect(screen.getByRole("button", { name: "Create new project" })).toBeInTheDocument();
});

it("re-renders EmptyProjectsList in zh-CN after language switch", () => {
  renderWithI18n(<EmptyProjectsList openModal={() => {}} />);
  fireEvent.click(screen.getByText("switch-zh-CN"));
  expect(screen.getByText("Heidi 在这里没有看到任何项目！")).toBeInTheDocument();
  expect(screen.getByText("创建一个项目，开始标注你的数据吧。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "创建新项目" })).toBeInTheDocument();
});

const sampleProject = {
  id: 1,
  title: undefined, // forces the "New project" fallback
  color: "#FFFFFF", // default color -> no chroma processing
  finished_task_number: 3,
  task_number: 10,
  total_annotations_number: 0,
  skipped_annotations_number: 0,
  total_predictions_number: 0,
  created_at: "2024-01-15T10:30:00Z",
  created_by: { email: "tester@example.com" },
};

it("renders ProjectsList card fallback + interpolated progress in English", () => {
  renderWithI18n(
    <ProjectsList projects={[sampleProject]} currentPage={1} totalItems={1} loadNextPage={() => {}} pageSize={30} />,
  );
  expect(screen.getAllByText("New project").length).toBeGreaterThan(0);
  // interpolation: {{done}} / {{total}}
  expect(screen.getByText("3 / 10")).toBeInTheDocument();
});

it("re-renders ProjectsList card fallback in zh-CN after language switch", () => {
  renderWithI18n(
    <ProjectsList projects={[sampleProject]} currentPage={1} totalItems={1} loadNextPage={() => {}} pageSize={30} />,
  );
  fireEvent.click(screen.getByText("switch-zh-CN"));
  expect(screen.getAllByText("新项目").length).toBeGreaterThan(0);
  // interpolated numbers are locale-neutral
  expect(screen.getByText("3 / 10")).toBeInTheDocument();
});
