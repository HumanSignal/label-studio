import { beforeEach, afterEach, expect, it } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider, useLanguage } from "@humansignal/app-common";

// CreateProject imports ToggleItems from the "../../components" barrel, which
// re-exports Menubar + VersionNotifier and transitively pulls StaticContent ->
// AsyncPage -> App.jsx (with a CSS import bun:test cannot resolve). Mock the
// heavy modules to cut the chain, mirroring Menubar.test.jsx / Projects.test.jsx.
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

// The modal's own data flow is irrelevant to the i18n assertions.
mockModule("../../providers/ApiProvider", () => ({
  useAPI: () => ({ callApi: async () => null }),
}));

mockModule("./utils/useDraftProject", () => ({
  useDraftProject: () => ({ project: null, setProject: () => {} }),
}));

mockModule("./Import/useImportPage", () => ({
  useImportPage: () => ({
    columns: [],
    uploading: false,
    uploadDisabled: false,
    finishUpload: async () => true,
    pageProps: {},
    uploadSample: async () => {},
  }),
}));

mockModule("./Import/Import", () => ({
  __skipMerge: true,
  ImportPage: () => null,
}));

mockModule("./Config/Config", () => ({
  __skipMerge: true,
  ConfigPage: () => null,
}));

mockModule("../../components/Modal/Modal", () => {
  const Modal = ({ children }) => <div>{children}</div>;
  Modal.Header = ({ children }) => <div>{children}</div>;
  return { __skipMerge: true, Modal };
});

const { CreateProject } = await import("./CreateProject");

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

const renderCreateProject = () =>
  render(
    <I18nProvider browserLanguages={["en"]}>
      <MemoryRouter>
        <CreateProject onClose={() => {}} />
      </MemoryRouter>
      <LanguageSwitch to="zh-CN" />
      <LanguageSwitch to="en" />
    </I18nProvider>,
  );

it("renders CreateProject modal in English by default", () => {
  renderCreateProject();
  expect(screen.getByRole("heading", { name: "Create Project" })).toBeInTheDocument();
  // tab label + form label both say "Project Name"
  expect(screen.getAllByText("Project Name")).toHaveLength(2);
  expect(screen.getByText("Data Import")).toBeInTheDocument();
  expect(screen.getByText("Labeling Setup")).toBeInTheDocument();
  // Cancel button accessible name comes from its aria-label
  expect(screen.getByRole("button", { name: "Cancel project creation" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.getByLabelText("Description")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Optional description of your project")).toBeInTheDocument();
});

it("re-renders CreateProject modal in zh-CN after language switch", () => {
  renderCreateProject();
  fireEvent.click(screen.getByText("switch-zh-CN"));
  expect(screen.getByRole("heading", { name: "创建项目" })).toBeInTheDocument();
  expect(screen.getAllByText("项目名称")).toHaveLength(2);
  expect(screen.getByText("数据导入")).toBeInTheDocument();
  expect(screen.getByText("标注设置")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "取消创建项目" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  expect(screen.getByLabelText("描述")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("项目描述，可选填写")).toBeInTheDocument();
});
