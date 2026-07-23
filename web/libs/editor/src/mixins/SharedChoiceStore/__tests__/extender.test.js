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

  it("label stream task switch: afterReset then taxonomy afterCreate path is safe", () => {
    root = AnnotationStoreRoot.create({ sharedStores: {} });
    const store = SharedStoreModel.create({ id: "taxonomy", children: [] });

    Stores.set("taxonomy", store);
    root.addSharedStore(store);

    // resetAnnotationStore / initializeStore: clear map, re-attach from module cache
    root.beforeReset();
    root.afterReset();

    expect(root.sharedStores.has("taxonomy")).toBe(true);
    // Taxonomy afterCreate when tryReference fails but store is already registered
    expect(() => root.addSharedStore(store)).not.toThrow();
    expect(root.sharedStores.get("taxonomy")).toBe(store);
  });

  // BROS-849: the module cache is global. A store registered by another live editor instance
  // (e.g. DataManager's persistent annotation-preview LSF) must NOT be adopted by a new tree,
  // otherwise MST throws "already part of another state tree".
  it("BROS-849: afterReset does not adopt a store attached to another live tree", () => {
    const rootA = AnnotationStoreRoot.create({ sharedStores: {} });
    const store = SharedStoreModel.create({ id: "taxonomy", children: [] });

    rootA.addSharedStore(store); // store now lives in tree A
    Stores.set("taxonomy", store); // module cache points at A's still-attached store

    const rootB = AnnotationStoreRoot.create({ sharedStores: {} });

    expect(() => rootB.afterReset()).not.toThrow();
    // B must not have adopted A's store...
    expect(rootB.sharedStores.has("taxonomy")).toBe(false);
    // ...A stays intact...
    expect(rootA.sharedStores.get("taxonomy")).toBe(store);
    // ...and the stale cache entry is purged so preProcessSnapshot recreates a fresh one.
    expect(Stores.has("taxonomy")).toBe(false);

    destroy(rootA);
    destroy(rootB);
  });

  it("BROS-849: addSharedStore ignores a store attached to another tree", () => {
    const rootA = AnnotationStoreRoot.create({ sharedStores: {} });
    const store = SharedStoreModel.create({ id: "taxonomy", children: [] });

    rootA.addSharedStore(store);

    const rootB = AnnotationStoreRoot.create({ sharedStores: {} });

    expect(() => rootB.addSharedStore(store)).not.toThrow();
    expect(rootB.sharedStores.has("taxonomy")).toBe(false);
    expect(rootA.sharedStores.get("taxonomy")).toBe(store);

    destroy(rootA);
    destroy(rootB);
  });

  it("BROS-849: afterReset purges a destroyed store lingering in the cache", () => {
    root = AnnotationStoreRoot.create({ sharedStores: {} });
    const store = SharedStoreModel.create({ id: "taxonomy", children: [] });

    Stores.set("taxonomy", store);
    destroy(store); // simulate a torn-down tree's store still referenced by the cache

    expect(() => root.afterReset()).not.toThrow();
    expect(root.sharedStores.has("taxonomy")).toBe(false);
    expect(Stores.has("taxonomy")).toBe(false);
  });
});
