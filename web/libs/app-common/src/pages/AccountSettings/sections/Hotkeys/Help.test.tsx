import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import * as transitionUtils from "@humansignal/core/lib/utils/transition";
import { effectiveHotkeys } from "../../hotkeys/effectiveHotkeys";
import { HotkeyHelpDialog } from "./Help";

const renderHelp = (sections?: string | string[]) =>
  render(<HotkeyHelpDialog open onOpenChange={() => {}} sections={sections} />);

describe("Hotkey Help customization link", () => {
  const originalPath = window.location.pathname;
  const originalUser = window.APP_SETTINGS.user;
  const originalLookupHotkey = window.APP_SETTINGS.lookupHotkey;
  const originalEditorKeymap = window.APP_SETTINGS.editor_keymap;
  let aroundTransitionSpy: ReturnType<typeof spyOn> | null = null;

  beforeEach(() => {
    // CI runs bun unit with NODE_ENV=development, so Modal.hide() waits on
    // transitionend (never fired in jsdom) and leaves document Escape listeners.
    // Complete transitions synchronously so close() can unmount cleanly.
    aroundTransitionSpy = spyOn(transitionUtils, "aroundTransition").mockImplementation(
      mock(async (_element: HTMLElement, callbacks: Parameters<typeof transitionUtils.aroundTransition>[1]) => {
        await callbacks?.beforeTransition?.(_element);
        await callbacks?.transition?.(_element);
        await callbacks?.afterTransition?.(_element);
      }),
    );
  });

  afterEach(async () => {
    aroundTransitionSpy?.mockRestore();
    aroundTransitionSpy = null;
    window.history.pushState({}, "", originalPath);
    window.APP_SETTINGS.user = originalUser;
    window.APP_SETTINGS.lookupHotkey = originalLookupHotkey;
    window.APP_SETTINGS.editor_keymap = originalEditorKeymap;
    document.body.style.overflow = "";
    document.querySelectorAll(".ls-modal-ls").forEach((el) => el.remove());
    effectiveHotkeys.resetForTests();
  });

  it("links to the current project's account hotkeys", async () => {
    window.history.pushState({}, "", "/projects/123/data");
    renderHelp();

    const link = await screen.findByRole("link", { name: "Customize for this project" });
    expect(link).toHaveAttribute("href", "/user/account/hotkeys?project=123");
  });

  it("shows the title once, in the dialog header", async () => {
    renderHelp("annotation");

    expect(await screen.findByRole("dialog", { name: "Keyboard Shortcuts" })).toBeInTheDocument();
    expect(screen.getAllByText("Keyboard Shortcuts")).toHaveLength(1);
  });

  it("links to account hotkeys outside a project", async () => {
    window.history.pushState({}, "", "/user/account/hotkeys");
    renderHelp();

    const link = await screen.findByRole("link", { name: "Customize hotkeys" });
    expect(link).toHaveAttribute("href", "/user/account/hotkeys");
  });

  it("displays the active project-effective shortcut without replacing the account baseline", async () => {
    window.history.pushState({}, "", "/projects/123/data");
    const accountHotkeys = {
      "annotation:annotation:submit": { key: "alt+enter", active: true },
    };
    window.APP_SETTINGS = {
      ...window.APP_SETTINGS,
      user: {
        ...window.APP_SETTINGS.user,
        customHotkeys: accountHotkeys,
      },
      editor_keymap: {},
    };
    effectiveHotkeys.apply({
      account: accountHotkeys,
      project: { "annotation:annotation:submit": { key: "shift+enter", active: true } },
    });

    renderHelp("annotation");

    const shortcut = (await screen.findByText("Submit Annotation")).parentElement?.parentElement;
    expect(shortcut).toHaveTextContent("shiftenter");
    expect(shortcut).not.toHaveTextContent("altenter");
    expect(window.APP_SETTINGS.user?.customHotkeys?.["annotation:annotation:submit"].key).toBe("alt+enter");
  });

  it("continues to display the account-effective shortcut outside a project", async () => {
    window.history.pushState({}, "", "/user/account/hotkeys");
    const accountHotkeys = {
      "annotation:annotation:submit": { key: "alt+enter", active: true },
    };
    window.APP_SETTINGS = {
      ...window.APP_SETTINGS,
      user: {
        ...window.APP_SETTINGS.user,
        customHotkeys: accountHotkeys,
      },
      editor_keymap: {},
    };
    effectiveHotkeys.apply({ account: accountHotkeys });

    renderHelp("annotation");

    const shortcut = (await screen.findByText("Submit Annotation")).parentElement?.parentElement;
    expect(shortcut).toHaveTextContent("altenter");
  });

  it("displays a project-disabled shortcut without falling back to the account key", async () => {
    window.history.pushState({}, "", "/projects/123/data");
    const accountHotkeys = {
      "annotation:annotation:submit": { key: "alt+enter", active: true },
    };
    window.APP_SETTINGS = {
      ...window.APP_SETTINGS,
      user: {
        ...window.APP_SETTINGS.user,
        customHotkeys: accountHotkeys,
      },
      editor_keymap: {},
    };
    effectiveHotkeys.apply({
      account: accountHotkeys,
      project: { "annotation:annotation:submit": { key: "alt+enter", active: false } },
    });

    renderHelp("annotation");

    const shortcut = (await screen.findByText("Submit Annotation")).parentElement?.parentElement;
    expect(shortcut).toHaveTextContent("Disabled");
    expect(shortcut).not.toHaveTextContent("altenter");
  });

  it("updates Help contents when effective hotkeys are applied while open", async () => {
    window.history.pushState({}, "", "/projects/123/data");
    window.APP_SETTINGS = {
      ...window.APP_SETTINGS,
      user: { ...window.APP_SETTINGS.user, customHotkeys: {} },
      editor_keymap: {},
    };
    effectiveHotkeys.apply({ account: {} });

    renderHelp("annotation");
    const shortcut = (await screen.findByText("Submit Annotation")).parentElement?.parentElement;
    expect(shortcut).not.toHaveTextContent("shiftenter");

    await act(async () => {
      effectiveHotkeys.apply({
        account: {},
        project: { "annotation:annotation:submit": { key: "shift+enter", active: true } },
      });
    });

    expect((await screen.findByText("Submit Annotation")).parentElement?.parentElement).toHaveTextContent("shiftenter");
  });
});
