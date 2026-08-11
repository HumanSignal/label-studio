import { beforeEach, describe, expect, it, mock } from "bun:test";
import { effectiveHotkeys, mergeCustomHotkeys, toEditorKeymap } from "./effectiveHotkeys";

describe("effectiveHotkeys", () => {
  beforeEach(() => {
    window.APP_SETTINGS = {
      user: { customHotkeys: {} },
      editor_keymap: {
        "annotation:submit": { key: "ctrl+enter", description: "Submit annotation" },
        "audio:playpause": { key: "ctrl+p", description: "Play" },
      },
      lookupHotkey: () => null,
    };
    delete (window as Window & { Htx?: unknown }).Htx;
    effectiveHotkeys.resetForTests();
  });

  it("merges, strips editor prefixes, and nulls inactive keys", () => {
    expect(
      mergeCustomHotkeys(
        { "annotation:annotation:submit": { key: "ctrl+enter", active: true } },
        { "annotation:annotation:submit": { key: "shift+enter", active: true } },
      ),
    ).toEqual({ "annotation:annotation:submit": { key: "shift+enter", active: true } });

    expect(
      toEditorKeymap({
        "annotation:annotation:submit": { key: "shift+enter", active: true },
        "annotation:annotation:skip": { key: "ctrl+space", active: false },
        "data_manager:focus_table": { key: "shift+1", active: true },
      }),
    ).toEqual({
      "annotation:submit": { key: "shift+enter", active: true },
      "annotation:skip": { key: null, active: false },
    });
  });

  it("bootstrap publishes account customs from APP_SETTINGS and wires lookupHotkey", () => {
    window.APP_SETTINGS.user.customHotkeys = {
      "annotation:annotation:submit": { key: "shift+enter", active: true },
    };

    effectiveHotkeys.bootstrap();

    expect(effectiveHotkeys.get("annotation:annotation:submit")).toEqual({
      key: "shift+enter",
      active: true,
    });
    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toEqual({
      key: "shift+enter",
      active: true,
    });
    expect(window.APP_SETTINGS.editor_keymap["annotation:submit"]).toEqual({
      key: "shift+enter",
      active: true,
    });
    // Product defaults are preserved under the merge.
    expect(window.APP_SETTINGS.editor_keymap["audio:playpause"]).toEqual({
      key: "ctrl+p",
      description: "Play",
    });
  });

  it("bootstrap is idempotent and does not re-capture a polluted editor_keymap", () => {
    window.APP_SETTINGS.user.customHotkeys = {
      "annotation:annotation:submit": { key: "shift+enter", active: true },
    };
    effectiveHotkeys.bootstrap();
    effectiveHotkeys.bootstrap();

    expect(window.APP_SETTINGS.editor_keymap["annotation:submit"].key).toBe("shift+enter");
    expect(window.APP_SETTINGS.editor_keymap["audio:playpause"].key).toBe("ctrl+p");
  });

  it("apply replaces Help/editor views so project A keys do not leak into B", () => {
    const hotkey = {
      keymap: {
        "annotation:submit": { key: "ctrl+enter" as string | null },
        "audio:playpause": { key: "ctrl+p" as string | null },
      },
      setKeymap(next: Record<string, { key: string | null }>) {
        this.keymap = {
          "annotation:submit": { key: "ctrl+enter" },
          "audio:playpause": { key: "ctrl+p" },
          ...next,
        };
      },
    };
    (window as Window & { Htx?: { Hotkey: typeof hotkey } }).Htx = { Hotkey: hotkey };

    effectiveHotkeys.bootstrap();
    effectiveHotkeys.apply({
      account: {},
      project: { "annotation:annotation:submit": { key: "shift+enter", active: true } },
    });
    expect(effectiveHotkeys.get("annotation:annotation:submit")?.key).toBe("shift+enter");
    expect(window.APP_SETTINGS.editor_keymap["annotation:submit"].key).toBe("shift+enter");
    expect(hotkey.keymap["annotation:submit"].key).toBe("shift+enter");

    effectiveHotkeys.apply({ account: {} });
    expect(effectiveHotkeys.get("annotation:annotation:submit")).toBeNull();
    expect(window.APP_SETTINGS.lookupHotkey?.("annotation:annotation:submit")).toBeNull();
    expect(hotkey.keymap["annotation:submit"].key).toBe("ctrl+enter");
  });

  it("notifies subscribers on apply and stops after unsubscribe", () => {
    effectiveHotkeys.bootstrap();
    const listener = mock(() => undefined);
    const unsubscribe = effectiveHotkeys.subscribe(listener);

    effectiveHotkeys.apply({
      account: { "annotation:annotation:submit": { key: "alt+enter", active: true } },
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    effectiveHotkeys.apply({ account: {} });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
