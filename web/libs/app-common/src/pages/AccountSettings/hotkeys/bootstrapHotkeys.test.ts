import { beforeEach, describe, expect, it } from "bun:test";
import { effectiveHotkeys } from "./effectiveHotkeys";

describe("bootstrapHotkeys side-effect module", () => {
  beforeEach(() => {
    window.APP_SETTINGS = {
      user: {
        customHotkeys: {
          "annotation:annotation:submit": { key: "shift+enter", active: true },
        },
      },
      editor_keymap: {
        "annotation:submit": { key: "ctrl+enter", description: "Submit annotation" },
      },
      lookupHotkey: () => null,
    };
    effectiveHotkeys.resetForTests();
  });

  it("bootstraps effectiveHotkeys when the module is evaluated", async () => {
    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toBeNull();

    // Cache-bust so the side-effect body re-runs after resetForTests().
    await import(`./bootstrapHotkeys?test=${Date.now()}`);

    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toEqual({
      key: "shift+enter",
      active: true,
    });
    expect(window.APP_SETTINGS.editor_keymap["annotation:submit"]).toEqual({
      key: "shift+enter",
      active: true,
    });
  });
});
