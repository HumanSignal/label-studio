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
});
