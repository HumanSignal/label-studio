import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Hotkey } from "../../core/Hotkey";
import Settings from "./Settings";

const createStore = () => ({
  showingSettings: true,
  toggleSettings: mock(),
  hasInterface: () => false,
  annotationStore: {
    names: {
      toJSON: () => ({}),
      get: () => undefined,
    },
  },
  settings: {
    annotationsListLayout: "horizontal",
  },
});

describe("classic editor hotkey settings", () => {
  const originalPath = window.location.pathname;
  const originalNamespaces = Hotkey.namespaces;

  beforeEach(() => {
    // Other Bun files permanently mockModule Hotkey without namespaces().
    // HotkeysDescription calls it when the Hotkeys tab mounts — restore a stub so
    // this file stays order-independent (bun-testing: mockModule is process-global).
    if (typeof Hotkey.namespaces !== "function") {
      Hotkey.namespaces = () => ({});
    }
  });

  afterEach(() => {
    Hotkey.namespaces = originalNamespaces;
    window.history.pushState({}, "", originalPath);
  });

  it("links to the current project's account hotkeys", async () => {
    window.history.pushState({}, "", "/projects/321/data");
    render(<Settings store={createStore()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Hotkeys" }));

    expect(await screen.findByRole("link", { name: "Customize for this project" })).toHaveAttribute(
      "href",
      "/user/account/hotkeys?project=321",
    );
  });

  it("links to account hotkeys outside a project", async () => {
    window.history.pushState({}, "", "/user/account/hotkeys");
    render(<Settings store={createStore()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Hotkeys" }));

    const link = await screen.findByRole("link", { name: "Customize hotkeys" });
    expect(link.getAttribute("href")).toBe("/user/account/hotkeys");
  });
});
