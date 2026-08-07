import { afterEach, describe, expect, it } from "bun:test";
import { screen } from "@testing-library/react";
import { openHotkeyHelp } from "./Help";

describe("Hotkey Help customization link", () => {
  const originalPath = window.location.pathname;
  const originalUser = window.APP_SETTINGS.user;
  const originalLookupHotkey = window.APP_SETTINGS.lookupHotkey;

  afterEach(() => {
    window.history.pushState({}, "", originalPath);
    window.APP_SETTINGS.user = originalUser;
    window.APP_SETTINGS.lookupHotkey = originalLookupHotkey;
  });

  it("links to the current project's account hotkeys", async () => {
    window.history.pushState({}, "", "/projects/123/data");
    const modal = openHotkeyHelp();

    const link = await screen.findByRole("link", { name: "Customize for this project" });
    expect(link).toHaveAttribute("href", "/user/account/hotkeys?project=123");

    modal.close();
  });

  it("links to account hotkeys outside a project", async () => {
    window.history.pushState({}, "", "/user/account/hotkeys");
    const modal = openHotkeyHelp();

    const link = await screen.findByRole("link", { name: "Customize hotkeys" });
    expect(link).toHaveAttribute("href", "/user/account/hotkeys");

    modal.close();
  });

  it("displays the active project-effective shortcut without replacing the account baseline", async () => {
    window.history.pushState({}, "", "/projects/123/data");
    window.APP_SETTINGS = {
      ...window.APP_SETTINGS,
      user: {
        ...window.APP_SETTINGS.user,
        customHotkeys: {
          "annotation:annotation:submit": { key: "alt+enter", active: true },
        },
      },
    };
    window.APP_SETTINGS.lookupHotkey = (lookup: string) =>
      lookup === "annotation:annotation:submit" ? { key: "shift+enter", active: true } : null;

    const modal = openHotkeyHelp("annotation");

    const shortcut = (await screen.findByText("Submit Annotation")).parentElement?.parentElement;
    expect(shortcut).toHaveTextContent("shiftenter");
    expect(shortcut).not.toHaveTextContent("altenter");
    expect(window.APP_SETTINGS.user?.customHotkeys?.["annotation:annotation:submit"].key).toBe("alt+enter");

    modal.close();
  });

  it("continues to display the account-effective shortcut outside a project", async () => {
    window.history.pushState({}, "", "/user/account/hotkeys");
    window.APP_SETTINGS = {
      ...window.APP_SETTINGS,
      user: {
        ...window.APP_SETTINGS.user,
        customHotkeys: {
          "annotation:annotation:submit": { key: "alt+enter", active: true },
        },
      },
    };
    window.APP_SETTINGS.lookupHotkey = (lookup: string) =>
      lookup === "annotation:annotation:submit" ? { key: "alt+enter", active: true } : null;

    const modal = openHotkeyHelp("annotation");

    const shortcut = (await screen.findByText("Submit Annotation")).parentElement?.parentElement;
    expect(shortcut).toHaveTextContent("altenter");

    modal.close();
  });

  it("displays a project-disabled shortcut without falling back to the account key", async () => {
    window.history.pushState({}, "", "/projects/123/data");
    window.APP_SETTINGS = {
      ...window.APP_SETTINGS,
      user: {
        ...window.APP_SETTINGS.user,
        customHotkeys: {
          "annotation:annotation:submit": { key: "alt+enter", active: true },
        },
      },
    };
    window.APP_SETTINGS.lookupHotkey = (lookup: string) =>
      lookup === "annotation:annotation:submit" ? { key: null, active: false } : null;

    const modal = openHotkeyHelp("annotation");

    const shortcut = (await screen.findByText("Submit Annotation")).parentElement?.parentElement;
    expect(shortcut).toHaveTextContent("Disabled");
    expect(shortcut).not.toHaveTextContent("altenter");

    modal.close();
  });
});
