/**
 * Regression tests for SharedChoiceStore duplicate registration (FIT-1941).
 *
 * Label stream task switches call initializeStore() after afterReset() re-attaches
 * cached taxonomy shared stores; addSharedStore must be idempotent.
 */
import { destroy, types } from "mobx-state-tree";
import { StoreExtender } from "../extender";
import { Stores, destroy as destroySharedStore } from "../mixin";
import { SharedStoreModel } from "../model";

const AnnotationStoreRoot = types.compose("AnnotationStoreFIT1941", StoreExtender, types.model({}));

describe("SharedChoiceStore StoreExtender", () => {
  /** @type {import("mobx-state-tree").IAnyStateTreeNode | null} */
  let root = null;

  beforeEach(() => {
    destroySharedStore();
    root = null;
  });

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
    destroySharedStore();
  });

  it("addSharedStore is idempotent for the same store id", () => {
    root = AnnotationStoreRoot.create({ sharedStores: {} });
    const store = SharedStoreModel.create({ id: "taxonomy", children: [] });

    root.addSharedStore(store);
    expect(() => root.addSharedStore(store)).not.toThrow();
    expect(root.sharedStores.get("taxonomy")).toBe(store);
  });

  it("afterReset re-attaches cached stores and duplicate addSharedStore is safe", () => {
    root = AnnotationStoreRoot.create({ sharedStores: {} });
    const store = SharedStoreModel.create({ id: "taxonomy", children: [] });

    root.addSharedStore(store);
    root.beforeReset();
    Stores.set("taxonomy", store);

    root.afterReset();
    expect(root.sharedStores.has("taxonomy")).toBe(true);
    expect(() => root.addSharedStore(store)).not.toThrow();
    expect(root.sharedStores.get("taxonomy")).toBe(store);
  });
});
