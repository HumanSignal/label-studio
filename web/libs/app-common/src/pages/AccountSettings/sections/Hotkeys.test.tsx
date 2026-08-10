import { ApiContext, type ApiContextType } from "@humansignal/core";
import { ToastProvider } from "@humansignal/ui";
import * as modalModule from "@humansignal/ui/lib/modal";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import type { PropsWithChildren } from "react";
import { Router } from "react-router-dom";
import { leaveBlockerCallback } from "apps/labelstudio/src/components/LeaveBlocker/LeaveBlocker";
import { HotkeysManager } from "./Hotkeys";

interface ApiOptions {
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  suppressError?: boolean;
}

const accountHotkeys = {
  "annotation:annotation:submit": { key: "alt+enter", active: true },
  "annotation:annotation:skip": { key: "alt+space", active: true },
};
const projectHotkeys = {
  "annotation:annotation:submit": { key: "shift+enter", active: true },
};

const renderHotkeys = ({
  initialPath = "/user/account/hotkeys?project=42",
  callApi = mock(async (name: string, options?: ApiOptions) => {
    if (name === "projects") {
      return { count: 1, results: [{ id: 42, title: "Apollo" }] };
    }
    if (name === "hotkeys" && options?.params?.project === 42) {
      return { custom_hotkeys: projectHotkeys, hotkey_settings: {} };
    }
    if (name === "hotkeys") {
      return { custom_hotkeys: accountHotkeys, hotkey_settings: {} };
    }
    return {};
  }),
}: {
  initialPath?: string;
  callApi?: ReturnType<typeof mock>;
} = {}) => {
  const history = createMemoryHistory({
    initialEntries: [initialPath],
    getUserConfirmation: (_message, callback) => {
      leaveBlockerCallback.current = callback;
    },
  });
  const api = { callApi } as unknown as ApiContextType;
  const Wrapper = ({ children }: PropsWithChildren) => (
    <ApiContext.Provider value={api}>
      <ToastProvider>
        <Router history={history}>{children}</Router>
      </ToastProvider>
    </ApiContext.Provider>
  );

  return { history, callApi, ...render(<HotkeysManager />, { wrapper: Wrapper }) };
};

/** Heading can appear before hotkeys finish loading; toolbar stays disabled until then. */
const waitForProjectHotkeysReady = async () => {
  await screen.findByText("Project override for Apollo");
  await waitFor(() => {
    expect(screen.getByLabelText(/Disable Submit Annotation|Enable Submit Annotation/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reset to Defaults" })).toBeEnabled();
  });
};

const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeAll(() => {
  Element.prototype.scrollIntoView = mock();
});

afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe("HotkeysManager project scope", () => {
  it("renders the selected project heading", async () => {
    renderHotkeys();

    expect(await screen.findByText("Project override for Apollo")).toBeInTheDocument();
    expect(screen.getByText(/Only shortcuts that differ from your account defaults/)).toBeInTheDocument();
  });

  it("names project exports with the project id", async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    let download = "";
    URL.createObjectURL = mock(() => "blob:hotkeys");
    URL.revokeObjectURL = mock();
    const linkClick = mock();
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        Object.defineProperty(element, "click", { value: linkClick });
        Object.defineProperty(element, "download", {
          set(value: string) {
            download = value;
          },
        });
      }
      return element;
    }) as typeof document.createElement;

    try {
      renderHotkeys();
      await waitForProjectHotkeysReady();

      // Click inside waitFor so a transient re-disable between ready and click retries.
      await waitFor(() => {
        const button = screen.getByRole("button", { name: "Export" });
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(download).toBe("hotkeys-export-project-42.json");
      });
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      document.createElement = originalCreateElement;
    }
  });

  it("does not load hotkeys for an invalid project deep link", async () => {
    const callApi = mock(async (name: string) =>
      name === "projects" ? { count: 0, results: [] } : { custom_hotkeys: {}, hotkey_settings: {} },
    );

    renderHotkeys({ initialPath: "/user/account/hotkeys?project=999", callApi });

    expect(await screen.findByText("You no longer have access to this project")).toBeInTheDocument();
    expect(callApi.mock.calls.some((call: unknown[]) => call[0] === "hotkeys")).toBe(false);
  });
});

describe("HotkeysManager reset", () => {
  it("shows project-specific reset confirmation copy", async () => {
    // spyOn in the test body is fine for a single it(); keep confirm from opening UI.
    const confirmSpy = spyOn(modalModule, "confirm").mockImplementation(() => undefined as never);

    renderHotkeys();
    await waitForProjectHotkeysReady();

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Reset to Defaults" });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Reset Project Hotkey Override?",
          okText: "Reset Project Override",
        }),
      );
    });
  });
});

describe("HotkeysManager dirty scope changes", () => {
  it("prompts before discarding unsaved changes when switching scope", async () => {
    const confirmSpy = spyOn(modalModule, "confirm").mockImplementation(() => undefined as never);

    renderHotkeys();
    await waitForProjectHotkeysReady();

    fireEvent.click(screen.getByLabelText(/Disable Submit Annotation|Enable Submit Annotation/));

    fireEvent.click(screen.getByTestId("project-hotkey-scope-selector"));
    fireEvent.click(screen.getByTestId("select-option-account"));

    await waitFor(() =>
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Discard unsaved hotkey changes?",
          okText: "Discard Changes",
        }),
      ),
    );
  });
});
