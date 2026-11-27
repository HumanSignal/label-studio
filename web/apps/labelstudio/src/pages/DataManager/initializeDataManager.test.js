import { act } from "@testing-library/react";
import * as hotkeys from "@humansignal/app-common/pages/AccountSettings/hooks/useHotkeys";
import { initializeDataManager } from "./initializeDataManager";

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("initializeDataManager cancel token", () => {
  const originalAppSettings = window.APP_SETTINGS;
  const originalDataManager = window.DataManager;
  const originalLabelStudio = window.LabelStudio;
  let root;
  let DataManager;

  beforeEach(() => {
    // Prefer spyOn over mockModule — Bun module mocks leak across files in the shared process.
    spyOn(hotkeys, "loadAndApplyProjectHotkeys").mockImplementation(() => Promise.resolve());
    root = document.createElement("div");
    document.body.appendChild(root);
    DataManager = mock(function DataManager(config) {
      const instance = {
        root: config.root,
        projectId: config.projectId,
        destroy: mock(),
      };
      return instance;
    });
    window.DataManager = DataManager;
    window.LabelStudio = {};
    window.APP_SETTINGS = {
      ...(originalAppSettings ?? {}),
      hostname: "http://localhost",
      polling: false,
      editor_keymap: {},
    };
  });

  afterEach(() => {
    root.remove();
    window.APP_SETTINGS = originalAppSettings;
    window.DataManager = originalDataManager;
    window.LabelStudio = originalLabelStudio;
  });

  it("does not construct DataManager when cancelled after hotkeys load (destroy/unmount)", async () => {
    const pendingLoad = createDeferred();
    hotkeys.loadAndApplyProjectHotkeys.mockImplementationOnce(() => pendingLoad.promise);

    let cancelled = false;
    const initPromise = initializeDataManager(
      root,
      {},
      { id: 17, project: { id: 17 } },
      { isCancelled: () => cancelled },
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(hotkeys.loadAndApplyProjectHotkeys).toHaveBeenCalledTimes(1);

    cancelled = true;
    // Mirror destroyDM: clear the in-flight lock so a remount can re-init.
    delete root.dataset.dmInitialized;

    let result;
    await act(async () => {
      pendingLoad.resolve();
      result = await initPromise;
    });

    expect(result).toBeUndefined();
    expect(DataManager).not.toHaveBeenCalled();
  });

  it("constructs DataManager when the cancel token stays live", async () => {
    hotkeys.loadAndApplyProjectHotkeys.mockResolvedValueOnce(undefined);

    const result = await initializeDataManager(root, {}, { id: 17, project: { id: 17 } }, { isCancelled: () => false });

    expect(DataManager).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
    expect(result.projectId).toBe(17);
    expect(root.dataset.dmInitialized).toBe("true");
  });
});
