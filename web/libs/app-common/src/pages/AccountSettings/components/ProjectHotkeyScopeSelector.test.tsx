import { ApiContext, type ApiContextType } from "@humansignal/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import type { PropsWithChildren } from "react";
import { Router } from "react-router-dom";
import { ProjectHotkeyScopeSelector } from "./ProjectHotkeyScopeSelector";

interface Project {
  id: number;
  title: string;
  workspace_title?: string;
}

interface ProjectResponse {
  count: number;
  results: Project[];
}

const projectsResponse = (...projects: Project[]): ProjectResponse => ({
  count: projects.length,
  results: projects,
});

const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeAll(() => {
  Element.prototype.scrollIntoView = mock();
});

afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const renderSelector = ({
  initialPath = "/user/account/hotkeys",
  callApi = mock(async () => projectsResponse()),
}: {
  initialPath?: string;
  callApi?: ReturnType<typeof mock>;
} = {}) => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const api = { callApi } as unknown as ApiContextType;
  const Wrapper = ({ children }: PropsWithChildren) => (
    <ApiContext.Provider value={api}>
      <Router history={history}>{children}</Router>
    </ApiContext.Provider>
  );

  return {
    history,
    callApi,
    ...render(<ProjectHotkeyScopeSelector />, { wrapper: Wrapper }),
  };
};

describe("ProjectHotkeyScopeSelector", () => {
  it("selects account defaults when the URL has no project query", () => {
    renderSelector();

    expect(screen.getByText("Account defaults (all projects)")).toBeInTheDocument();
  });

  it("fetches and preselects the project from a deep link", async () => {
    const callApi = mock(async (_name: string, options?: { params?: Record<string, unknown> }) => {
      return options?.params?.ids === "42" ? projectsResponse({ id: 42, title: "Apollo" }) : projectsResponse();
    });

    renderSelector({ initialPath: "/user/account/hotkeys?project=42", callApi });

    await waitFor(() => expect(screen.getByText("Apollo")).toBeInTheDocument());
    expect(callApi).toHaveBeenCalledWith(
      "projects",
      expect.objectContaining({
        params: expect.objectContaining({ ids: "42", fields: "id,title" }),
      }),
    );
  });

  it("requests workspace titles in the enterprise picker", async () => {
    const originalBilling = window.APP_SETTINGS.billing;
    window.APP_SETTINGS.billing = { enterprise: true } as typeof window.APP_SETTINGS.billing;

    const callApi = mock(async (_name: string, options?: { params?: Record<string, unknown> }) => {
      return options?.params?.ids === "42"
        ? projectsResponse({ id: 42, title: "Apollo", workspace_title: "Ops" })
        : projectsResponse();
    });

    try {
      renderSelector({ initialPath: "/user/account/hotkeys?project=42", callApi });

      await waitFor(() => expect(screen.getByText("Apollo")).toBeInTheDocument());
      expect(callApi).toHaveBeenCalledWith(
        "projects",
        expect.objectContaining({
          params: expect.objectContaining({ ids: "42", fields: "id,title,workspace_title" }),
        }),
      );
    } finally {
      window.APP_SETTINGS.billing = originalBilling;
    }
  });

  it("removes the project query when account defaults are selected", async () => {
    const callApi = mock(async () => projectsResponse({ id: 42, title: "Apollo" }));
    const { history } = renderSelector({
      initialPath: "/user/account/hotkeys?project=42",
      callApi,
    });

    await waitFor(() => expect(screen.getByText("Apollo")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("project-hotkey-scope-selector"));
    fireEvent.click(screen.getByTestId("select-option-account"));

    expect(history.location.search).toBe("");
  });

  it("shows an access error when the deep-linked project is unavailable", async () => {
    renderSelector({ initialPath: "/user/account/hotkeys?project=999" });

    expect(await screen.findByText("You no longer have access to this project")).toBeInTheDocument();
  });

  it("shows an access error for malformed project deep links", async () => {
    renderSelector({ initialPath: "/user/account/hotkeys?project=not-a-project" });

    expect(await screen.findByText("You no longer have access to this project")).toBeInTheDocument();
  });

  it.each([
    "%2042",
    "1e2",
    "0x2a",
    "%2B42",
    "042",
  ])("rejects non-canonical project query %s before project resolution", async (projectQuery) => {
    const callApi = mock(async () => projectsResponse());
    renderSelector({
      initialPath: `/user/account/hotkeys?project=${projectQuery}`,
      callApi,
    });

    expect(await screen.findByText("You no longer have access to this project")).toBeInTheDocument();
    expect(
      callApi.mock.calls.some(
        (call: unknown[]) => (call[1] as { params?: Record<string, unknown> } | undefined)?.params?.ids,
      ),
    ).toBe(false);
  });
});
