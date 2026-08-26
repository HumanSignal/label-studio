import { ApiContext } from "@humansignal/core";
import { ToastProvider } from "@humansignal/ui";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { effectiveHotkeys, mergeCustomHotkeys } from "../hotkeys/effectiveHotkeys";
import type { Hotkey } from "../sections/Hotkeys/utils";
import {
  clearProjectHotkeysRuntime,
  computeProjectOverrides,
  getResetSuccessMessage,
  getSaveSuccessMessage,
  loadAndApplyProjectHotkeys,
  useHotkeys,
} from "./useHotkeys";

interface CustomHotkey {
  key: string;
  active: boolean;
  description?: string;
}

type CustomHotkeys = Record<string, CustomHotkey>;
type ApiOptions = {
  params?: { project?: number };
  suppressError?: boolean;
  body?: {
    custom_hotkeys: CustomHotkeys;
    hotkey_settings: Record<string, unknown>;
  };
};

const apiResponse = (customHotkeys: CustomHotkeys = {}) => ({
  custom_hotkeys: customHotkeys,
  hotkey_settings: {},
});

const apiErrorResponse = (status: number, error = "Request failed") => ({
  error,
  response: { detail: error },
  $meta: { status, ok: false, headers: new Map(), url: "" },
});

const hotkey = (element: string, key: string, active = true, section = "annotation"): Hotkey => ({
  id: element,
  section,
  element,
  label: element,
  key,
  active,
});

const createApiWrapper = (callApi: (name: string, options?: ApiOptions) => Promise<unknown>) => {
  const value = { callApi } as unknown as NonNullable<React.ContextType<typeof ApiContext>>;

  return ({ children }: PropsWithChildren) =>
    createElement(ApiContext.Provider, { value }, createElement(ToastProvider, null, children));
};

const jsonResponse = (customHotkeys: CustomHotkeys, status = 200) =>
  new Response(JSON.stringify({ custom_hotkeys: customHotkeys }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const setAppCustomHotkeys = (customHotkeys: CustomHotkeys) => {
  window.APP_SETTINGS = {
    ...window.APP_SETTINGS,
    user: {
      ...window.APP_SETTINGS?.user,
      customHotkeys,
    },
  };
};

describe("scoped hotkey maps", () => {
  it("merges project hotkeys over account hotkeys", () => {
    expect(
      mergeCustomHotkeys(
        { "annotation:submit": { key: "ctrl+enter", active: true } },
        { "annotation:submit": { key: "shift+enter", active: true } },
      ),
    ).toEqual({
      "annotation:submit": { key: "shift+enter", active: true },
    });
  });

  it("stores only project differences from account-effective values", () => {
    const accountHotkeys = {
      "annotation:submit": { key: "ctrl+enter", active: true },
      "annotation:skip": { key: "ctrl+space", active: true },
    };
    const hotkeys = [hotkey("submit", "ctrl+enter"), hotkey("skip", "shift+space", false)];

    expect(computeProjectOverrides(hotkeys, accountHotkeys)).toEqual({
      "annotation:skip": { key: "shift+space", active: false },
    });
  });
});

describe("useHotkeys project scope", () => {
  it("loads account hotkeys before project overrides and merges them for display", async () => {
    const accountHotkeys = {
      "annotation:annotation:submit": { key: "ctrl+enter", active: true },
    };
    const projectHotkeys = {
      "annotation:annotation:submit": { key: "shift+enter", active: true },
    };
    const callApi = mock(async (name: string, options?: ApiOptions) => {
      if (name === "hotkeys" && options?.params?.project === 42) return apiResponse(projectHotkeys);
      return apiResponse(accountHotkeys);
    });

    const { result } = renderHook(() => useHotkeys({ kind: "project", projectId: 42 }), {
      wrapper: createApiWrapper(callApi),
    });

    await waitFor(() => {
      expect(result.current.hotkeys.find(({ element }) => element === "annotation:submit")?.key).toBe("shift+enter");
    });
    expect(callApi.mock.calls.slice(0, 2)).toEqual([
      ["hotkeys"],
      ["hotkeys", { params: { project: 42 }, suppressError: true }],
    ]);
  });

  it("saves only differences from account hotkeys in the selected project", async () => {
    const accountHotkeys = {
      "annotation:submit": { key: "ctrl+enter", active: true },
      "annotation:skip": { key: "ctrl+space", active: true },
    };
    setAppCustomHotkeys(structuredClone(accountHotkeys));
    const callApi = mock(async (name: string, options?: ApiOptions) => {
      if (name === "hotkeys") return apiResponse(accountHotkeys);
      return { ok: true, options };
    });
    const { result } = renderHook(() => useHotkeys({ kind: "project", projectId: 7 }), {
      wrapper: createApiWrapper(callApi),
    });
    await waitFor(() => expect(callApi).toHaveBeenCalledTimes(2));

    await act(async () => {
      await result.current.saveHotkeysToAPI([hotkey("submit", "ctrl+enter"), hotkey("skip", "shift+space", false)], {});
    });

    expect(callApi).toHaveBeenLastCalledWith("updateHotkeys", {
      params: { project: 7 },
      suppressError: true,
      body: {
        custom_hotkeys: {
          "annotation:skip": { key: "shift+space", active: false },
        },
        hotkey_settings: {},
      },
    });
  });

  it("makes project mode read-only when the project preference GET fails", async () => {
    const callApi = mock((name: string, options?: ApiOptions) => {
      if (name === "hotkeys" && options?.params?.project === 42) {
        return Promise.resolve(apiErrorResponse(403));
      }
      return Promise.resolve(apiResponse());
    });

    const { result } = renderHook(() => useHotkeys({ kind: "project", projectId: 42 }), {
      wrapper: createApiWrapper(callApi),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasProjectAccessError).toBe(true);
    expect(result.current.isReadOnly).toBe(true);
  });
});

describe("useHotkeys reset confirmation copy", () => {
  it("uses account and project reset messages", () => {
    expect(getResetSuccessMessage(undefined)).toBe("All hotkeys and settings have been reset to defaults and saved");
    expect(getResetSuccessMessage(42)).toBe("This project's hotkey override has been reset and saved");
  });

  it("uses account and project save messages", () => {
    expect(getSaveSuccessMessage("Annotation", undefined)).toBe("Annotation account defaults saved");
    expect(getSaveSuccessMessage("Annotation", 42)).toBe("Annotation project override saved");
  });
});

describe("loadAndApplyProjectHotkeys", () => {
  beforeEach(() => {
    effectiveHotkeys.resetForTests();
  });

  it("merges project overrides onto the account baseline", async () => {
    const accountHotkeys = { "annotation:annotation:submit": { key: "ctrl+enter", active: true } };
    setAppCustomHotkeys(accountHotkeys);
    window.APP_SETTINGS.editor_keymap = {};
    effectiveHotkeys.apply({ account: accountHotkeys });
    globalThis.fetch = mock(async () =>
      jsonResponse({ "annotation:annotation:submit": { key: "shift+enter", active: true } }),
    ) as typeof fetch;

    await loadAndApplyProjectHotkeys(17);

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/current-user/hotkeys/?project=17", {
      credentials: "same-origin",
    });
    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toEqual({
      key: "shift+enter",
      active: true,
    });
  });

  it("does not leak project A editor overrides into project B via Hotkey.keymap", async () => {
    // Stub LSF Hotkey with replace semantics (real setKeymap covered in Hotkey.setKeymap.test.ts).
    // Avoid cross-package editor imports here — the full bun suite can leave Hotkey.setKeymap undefined.
    const defaultSubmitKey = "ctrl+enter";
    const editorHotkey = {
      keymap: {
        "annotation:submit": { key: defaultSubmitKey, description: "Submit annotation" },
        "audio:playpause": { key: "ctrl+p", description: "Play" },
      } as Record<string, { key: string | null; description?: string }>,
      setKeymap(newKeymap: Record<string, { key: string | null; description?: string }>) {
        this.keymap = {
          "annotation:submit": { key: defaultSubmitKey, description: "Submit annotation" },
          "audio:playpause": { key: "ctrl+p", description: "Play" },
          ...newKeymap,
        };
      },
    };
    (window as Window & { Htx?: { Hotkey: typeof editorHotkey } }).Htx = { Hotkey: editorHotkey };

    // Refresh module accountHotkeyBaseline to {} (loadAndApply merges against that singleton).
    setAppCustomHotkeys({});
    window.APP_SETTINGS.editor_keymap = {};
    const callApi = mock(async () => apiResponse({}));
    const { unmount } = renderHook(() => useHotkeys({ kind: "account" }), {
      wrapper: createApiWrapper(callApi),
    });
    await waitFor(() => expect(callApi).toHaveBeenCalled());
    unmount();

    globalThis.fetch = mock(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("project=1")) {
        return jsonResponse({ "annotation:annotation:submit": { key: "shift+enter", active: true } });
      }
      return jsonResponse({});
    }) as typeof fetch;

    await loadAndApplyProjectHotkeys(1);
    expect(editorHotkey.keymap["annotation:submit"].key).toBe("shift+enter");

    await loadAndApplyProjectHotkeys(2);
    expect(editorHotkey.keymap["annotation:submit"].key).toBe(defaultSubmitKey);
    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")?.key).not.toBe("shift+enter");
  });

  it("clears project overrides from runtime so Help outside a project shows account keys", async () => {
    const editorHotkey = {
      keymap: {
        "annotation:submit": { key: "ctrl+enter", description: "Submit annotation" },
      } as Record<string, { key: string | null; description?: string }>,
      setKeymap(newKeymap: Record<string, { key: string | null; description?: string }>) {
        this.keymap = {
          "annotation:submit": { key: "ctrl+enter", description: "Submit annotation" },
          ...newKeymap,
        };
      },
    };
    (window as Window & { Htx?: { Hotkey: typeof editorHotkey } }).Htx = { Hotkey: editorHotkey };

    setAppCustomHotkeys({});
    window.APP_SETTINGS.editor_keymap = {};
    const callApi = mock(async () => apiResponse({}));
    const { unmount } = renderHook(() => useHotkeys({ kind: "account" }), {
      wrapper: createApiWrapper(callApi),
    });
    await waitFor(() => expect(callApi).toHaveBeenCalled());
    unmount();

    globalThis.fetch = mock(async () =>
      jsonResponse({ "annotation:annotation:submit": { key: "shift+enter", active: true } }),
    ) as typeof fetch;

    await loadAndApplyProjectHotkeys(1);
    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toEqual({
      key: "shift+enter",
      active: true,
    });
    expect(editorHotkey.keymap["annotation:submit"].key).toBe("shift+enter");

    // Leaving the project (DM destroy) must drop project-only runtime overrides.
    clearProjectHotkeysRuntime();

    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")?.key).not.toBe("shift+enter");
    expect(editorHotkey.keymap["annotation:submit"].key).toBe("ctrl+enter");
  });

  it("ignores a stale project hotkey fetch that completes after runtime was cleared", async () => {
    setAppCustomHotkeys({});
    window.APP_SETTINGS.editor_keymap = {};
    const callApi = mock(async () => apiResponse({}));
    const { unmount } = renderHook(() => useHotkeys({ kind: "account" }), {
      wrapper: createApiWrapper(callApi),
    });
    await waitFor(() => expect(callApi).toHaveBeenCalled());
    unmount();

    let resolveFetch: (value: Response) => void = () => undefined;
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as typeof fetch;

    const pending = loadAndApplyProjectHotkeys(1);
    clearProjectHotkeysRuntime();
    resolveFetch(jsonResponse({ "annotation:annotation:submit": { key: "shift+enter", active: true } }));
    await pending;

    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")?.key).not.toBe("shift+enter");
  });

  it("ignores a stale project A fetch that completes after project B load starts", async () => {
    setAppCustomHotkeys({});
    window.APP_SETTINGS.editor_keymap = {};
    effectiveHotkeys.apply({ account: {} });

    let resolveProjectA: (value: Response) => void = () => undefined;
    globalThis.fetch = mock(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("project=1")) {
        return new Promise<Response>((resolve) => {
          resolveProjectA = resolve;
        });
      }
      return jsonResponse({ "annotation:annotation:submit": { key: "ctrl+s", active: true } });
    }) as typeof fetch;

    const pendingA = loadAndApplyProjectHotkeys(1);
    await loadAndApplyProjectHotkeys(2);
    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toEqual({
      key: "ctrl+s",
      active: true,
    });

    resolveProjectA(jsonResponse({ "annotation:annotation:submit": { key: "shift+enter", active: true } }));
    await pendingA;

    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toEqual({
      key: "ctrl+s",
      active: true,
    });
  });
});
