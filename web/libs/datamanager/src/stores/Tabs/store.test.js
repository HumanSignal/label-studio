import { destroy } from "mobx-state-tree";
import { mock, describe, it, expect, afterEach } from "bun:test";
import { types } from "mobx-state-tree";
import { TabStore } from "./store";
import { History } from "../../utils/history";

const RootStore = types
  .model({
    viewsStore: types.optional(TabStore, {}),
    apiVersion: 2,
    project: types.optional(types.model({ id: types.number }), { id: 1 }),
    SDK: types.optional(types.frozen(), { hasInterface: () => false, invoke: () => {} }),
    dataStore: types.optional(
      types.model({}).actions(() => ({
        clear() {},
        reload() {
          return Promise.resolve();
        },
      })),
      {},
    ),
  })
  .actions((self) => ({
    apiCall(_method, _params, _body) {
      return Promise.resolve(self._apiResult ?? { id: 100, title: "New Tab 2" });
    },
  }));

describe("TabStore createSnapshot / saveView (BROS-1491)", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("assigns unique temporary ids when adding a tab alongside persisted and virtual tabs", () => {
    root = RootStore.create({
      viewsStore: {
        views: [
          { id: 237846, title: "Default", saved: true, key: "default-key" },
          { id: -1, title: "Virtual", virtual: true, saved: false, key: "virtual-key" },
        ],
      },
    });

    const snapshot = root.viewsStore.createSnapshot({});

    expect(snapshot.id).not.toBe(237846);
    expect(snapshot.id).not.toBe(-1);
    expect(root.viewsStore.views.every((v) => v.id !== snapshot.id)).toBe(true);
  });

  it("does not duplicate persisted tab ids after saveView returns an existing server id", async () => {
    root = RootStore.create({
      viewsStore: {
        views: [
          { id: 237846, title: "Default", saved: true, key: "default-key" },
          { id: -1, title: "Virtual", virtual: true, saved: false, key: "virtual-key" },
          { id: -2, title: "New Tab 2", saved: false, key: "new-tab-key" },
        ],
      },
    });
    root.apiCall = mock(async () => ({ id: 237846, title: "New Tab 2" }));

    const tempView = root.viewsStore.views[2];
    await root.viewsStore.saveView(tempView);

    const ids = root.viewsStore.views.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 237846)).toHaveLength(1);
    expect(root.viewsStore.selected?.id).toBe(237846);
  });

  it("addView after persisted and virtual tabs keeps all ids unique", async () => {
    History.navigate = mock(() => {});

    root = RootStore.create({
      viewsStore: {
        views: [
          { id: 237846, title: "Default", saved: true, key: "default-key" },
          { id: -1, title: "Virtual", virtual: true, saved: false, key: "virtual-key" },
        ],
        selected: 237846,
      },
    });

    let nextServerId = 900;
    root.apiCall = mock(async () => {
      nextServerId += 1;
      return { id: nextServerId, title: "New Tab 2" };
    });

    await root.viewsStore.addView({ reload: false });

    const ids = root.viewsStore.views.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(root.viewsStore.selected).toBeDefined();
  });
});
