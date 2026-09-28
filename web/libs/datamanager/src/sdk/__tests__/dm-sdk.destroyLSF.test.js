import { describe, expect, it, mock } from "bun:test";
import { DataManager } from "../dm-sdk";

describe("DataManager.destroyLSF", () => {
  const buildSdk = () => Object.create(DataManager.prototype);

  it("awaits saveDraft before invoking beforeLsfDestroy and destroying LSF", async () => {
    const order = [];
    const sdk = buildSdk();
    const lsfInstance = { id: "lsf-instance" };
    const saveDraft = mock(async () => {
      order.push("saveDraft");
    });
    const destroy = mock(() => {
      order.push("destroy");
    });

    sdk.lsf = { lsfInstance, saveDraft, destroy };
    sdk.invoke = mock(async (eventName) => {
      if (eventName === "beforeLsfDestroy") order.push("beforeLsfDestroy");
    });

    await sdk.destroyLSF();

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["saveDraft", "beforeLsfDestroy", "destroy"]);
    expect(sdk.invoke).toHaveBeenCalledWith("beforeLsfDestroy", sdk, lsfInstance);
    expect(sdk.lsf).toBeUndefined();
  });

  it("still runs beforeLsfDestroy when lsf is missing", async () => {
    const sdk = buildSdk();
    sdk.invoke = mock(async () => {});

    await sdk.destroyLSF();

    expect(sdk.invoke).toHaveBeenCalledWith("beforeLsfDestroy", sdk, undefined);
    expect(sdk.lsf).toBeUndefined();
  });

  it("dedupes concurrent destroyLSF calls into one save and teardown", async () => {
    const order = [];
    const sdk = buildSdk();
    const saveDraft = mock(async () => {
      order.push("saveDraft");
    });
    const destroy = mock(() => {
      order.push("destroy");
    });

    sdk.lsf = { lsfInstance: {}, saveDraft, destroy };
    sdk.invoke = mock(async (eventName) => {
      if (eventName === "beforeLsfDestroy") order.push("beforeLsfDestroy");
    });

    await Promise.all([sdk.destroyLSF(), sdk.destroyLSF()]);

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["saveDraft", "beforeLsfDestroy", "destroy"]);
  });

  it("waits for an in-flight teardown before initializing the next LSF", async () => {
    const sdk = buildSdk();
    const order = [];
    let releaseDraft;
    const draftSaved = new Promise((resolve) => {
      releaseDraft = resolve;
    });

    sdk._destroyed = false;
    sdk.lsf = {
      saveDraft: mock(async () => {
        order.push("save-start");
        await draftSaved;
        order.push("save-end");
      }),
      destroy: mock(() => order.push("old-destroy")),
    };
    sdk.invoke = mock(async () => {});
    sdk._initLSF = mock(async () => {
      order.push("new-init");
      sdk.lsf = { id: "new-editor" };
    });

    const teardown = sdk.destroyLSF();
    const init = sdk.initLSF({});
    await Promise.resolve();

    expect(sdk._initLSF).not.toHaveBeenCalled();
    expect(order).toEqual(["save-start"]);

    releaseDraft();
    await Promise.all([teardown, init]);

    expect(order).toEqual(["save-start", "save-end", "old-destroy", "new-init"]);
    expect(sdk.lsf).toEqual({ id: "new-editor" });
  });

  it("clears _lsfInit so a later initLSF constructs a new LSF", async () => {
    const sdk = buildSdk();
    let initCount = 0;

    sdk.invoke = mock(async () => {});
    sdk._initLSF = mock(async () => {
      initCount += 1;
      sdk.lsf = {
        id: initCount,
        saveDraft: mock(async () => {}),
        destroy: mock(() => {}),
      };
    });

    await sdk.initLSF({});
    expect(sdk.lsf?.id).toBe(1);

    await sdk.destroyLSF();

    expect(sdk.lsf).toBeUndefined();
    expect(sdk._lsfInit).toBeUndefined();

    await sdk.initLSF({});

    expect(sdk.lsf?.id).toBe(2);
    expect(sdk.lsf).toBeDefined();
  });

  it("does not construct LSF when destroyLSF runs while initLSF is pending", async () => {
    const sdk = buildSdk();
    const originalLabelStudio = window.LabelStudio;
    window.LabelStudio = undefined;
    sdk._destroyed = false;
    sdk.store = { taskStore: { selected: null } };
    sdk.mode = "explorer";
    sdk.invoke = mock(async () => {});
    sdk.preload = null;

    let releaseEditor;
    sdk.labelStudioOptions = {
      loadEditor: () =>
        new Promise((resolve) => {
          releaseEditor = resolve;
        }),
      keymap: {},
    };

    const pending = sdk.initLSF({});
    await Promise.resolve();
    await sdk.destroyLSF();
    window.LabelStudio = function LabelStudio() {};
    releaseEditor();
    await pending;

    expect(sdk.lsf).toBeUndefined();
    expect(sdk._lsfInit).toBeUndefined();
    window.LabelStudio = originalLabelStudio;
  });

  it("toasts and clears _lsfInit when the editor chunk fails to load", async () => {
    const sdk = buildSdk();
    const originalLabelStudio = window.LabelStudio;
    window.LabelStudio = undefined;
    sdk._destroyed = false;
    sdk.store = { taskStore: { selected: null } };
    sdk.mode = "explorer";
    sdk.invoke = mock(async () => {});
    sdk.labelStudioOptions = {
      loadEditor: async () => {
        throw new Error("chunk 404");
      },
      keymap: {},
    };

    await sdk.initLSF({});

    expect(sdk.lsf).toBeUndefined();
    expect(sdk._lsfInit).toBeUndefined();
    expect(sdk.invoke).toHaveBeenCalledWith("toast", {
      message: expect.stringContaining("Please refresh the page"),
      type: "error",
      duration: -1,
    });

    window.LabelStudio = originalLabelStudio;
  });
});

describe("DataManager.reload", () => {
  const buildSdk = () => Object.create(DataManager.prototype);

  it("awaits destroy before initApp", async () => {
    const order = [];
    const sdk = buildSdk();

    sdk.destroy = mock(async () => {
      order.push("destroy");
    });
    sdk.initApp = mock(async () => {
      order.push("initApp");
    });
    sdk.installActions = mock(() => {
      order.push("installActions");
    });

    await sdk.reload();

    expect(order).toEqual(["destroy", "initApp", "installActions"]);
  });

  it("resets _destroyed so initLSF is allowed after reload", async () => {
    const sdk = buildSdk();

    sdk.root = document.createElement("div");
    sdk.store = undefined;
    sdk.callbacks = new Map();
    sdk.destroyLSF = mock(async () => {
      sdk.lsf = undefined;
      sdk._lsfInit = undefined;
    });
    sdk.initApp = mock(async () => {});
    sdk.installActions = mock(() => {});

    await sdk.reload();

    expect(sdk._destroyed).toBe(false);

    let created = false;
    sdk._initLSF = mock(async () => {
      created = true;
      sdk.lsf = { id: "after-reload" };
    });

    await sdk.initLSF({});

    expect(created).toBe(true);
    expect(sdk.lsf).toEqual({ id: "after-reload" });
  });
});

describe("DataManager.initApp", () => {
  const buildSdk = () => Object.create(DataManager.prototype);

  it("discards the store when destroy() wins while createApp is pending", async () => {
    const sdk = buildSdk();
    sdk.root = document.createElement("div");
    sdk._destroyed = false;
    sdk.store = null;
    sdk.invoke = mock();

    let releaseCreate;
    const leftoverStore = { id: "orphan-poll" };
    sdk._createApp = () =>
      new Promise((resolve) => {
        releaseCreate = () => resolve(leftoverStore);
      });

    const pending = sdk.initApp();
    sdk._destroyed = true;
    window.DM = leftoverStore;
    releaseCreate();
    await pending;

    expect(sdk.store).toBeNull();
    expect(sdk.invoke).not.toHaveBeenCalled();
    expect(window.DM).not.toBe(leftoverStore);
  });

  it("keeps the store and fires ready when initApp finishes on a live instance", async () => {
    const sdk = buildSdk();
    sdk.root = document.createElement("div");
    sdk._destroyed = false;
    sdk.store = null;
    sdk.invoke = mock();
    const store = { id: "live" };
    sdk._createApp = async () => store;
    sdk._discardCreatedApp = mock();

    await sdk.initApp();

    expect(sdk.store).toBe(store);
    expect(sdk.invoke).toHaveBeenCalledWith("ready", [sdk]);
    expect(sdk._discardCreatedApp).not.toHaveBeenCalled();
  });
});
