import { afterEach, describe, expect, it, mock } from "bun:test";
import { prepareLabelingRuntime } from "../dm-sdk";

describe("prepareLabelingRuntime (FIT-2914)", () => {
  const originalLabelStudio = window.LabelStudio;
  const originalAppSettings = window.APP_SETTINGS;

  afterEach(() => {
    window.LabelStudio = originalLabelStudio;
    window.APP_SETTINGS = originalAppSettings;
  });

  it("loads the editor before hotkeys and merges the keymap they apply", async () => {
    window.LabelStudio = undefined;
    window.APP_SETTINGS = { editor_keymap: {} };

    let releaseEditor;
    const loadEditor = mock(
      () =>
        new Promise((resolve) => {
          releaseEditor = resolve;
        }),
    );
    let beforeStarted = false;
    const beforeLabeling = mock(async () => {
      beforeStarted = true;
      window.APP_SETTINGS.editor_keymap = { "annotation:submit": { key: "ctrl+enter" } };
    });

    const pending = prepareLabelingRuntime({
      loadEditor,
      beforeLabeling,
      keymap: { "media:play": { key: "space" } },
    });

    await Promise.resolve();
    expect(loadEditor).toHaveBeenCalledTimes(1);
    expect(beforeStarted).toBe(false);

    releaseEditor();
    await expect(pending).resolves.toEqual({
      "media:play": { key: "space" },
      "annotation:submit": { key: "ctrl+enter" },
    });
  });

  it("does not load the editor when LabelStudio is already present", async () => {
    window.LabelStudio = function LabelStudio() {};
    window.APP_SETTINGS = { editor_keymap: { kept: true } };
    const loadEditor = mock(async () => {});

    const keymap = await prepareLabelingRuntime({
      loadEditor,
      keymap: { base: true },
    });

    expect(loadEditor).not.toHaveBeenCalled();
    expect(keymap).toEqual({ base: true, kept: true });
  });

  it("returns null when Data Manager is destroyed while labeling runtime is loading", async () => {
    window.LabelStudio = function LabelStudio() {};
    window.APP_SETTINGS = { editor_keymap: {} };
    let destroyed = false;

    const keymap = await prepareLabelingRuntime({
      beforeLabeling: async () => {
        destroyed = true;
      },
      isDestroyed: () => destroyed,
      keymap: { base: true },
    });

    expect(keymap).toBeNull();
  });
});
