import { destroy, types, unprotect } from "mobx-state-tree";
import { afterEach, describe, expect, it } from "bun:test";
import { DataStore, DataStoreItem } from "../../mixins/DataStore";
import { TabStore } from "./store";

const Item = types.compose(
  "ReadonlyViewTask",
  DataStoreItem,
  types.model({
    id: types.identifierNumber,
  }),
);

const TasksStore = DataStore("ReadonlyViewTasks", {
  listItemType: Item,
  apiMethod: "tasks",
});

const Root = types
  .model({
    viewsStore: types.optional(TabStore, {}),
    apiVersion: 2,
    project: types.optional(types.model({ id: types.number }), { id: 5 }),
    SDK: types.frozen(),
    API: types.optional(types.frozen(), { getSettingsByMethodName: () => undefined }),
    dataStore: types.optional(TasksStore, {}),
  })
  .volatile(() => ({
    calls: [],
  }))
  .actions((self) => ({
    apiCall(method, params, body) {
      self.calls.push({
        method,
        params: params ? JSON.parse(JSON.stringify(params)) : params,
        body: body ? JSON.parse(JSON.stringify(body)) : body,
      });
      if (method === "tasks") {
        return Promise.resolve({ total: 0, tasks: [], isCanceled: false });
      }
      return Promise.resolve({ id: 5, title: "Default", data: {} });
    },
    unsetSelection() {},
  }));

const viewWrites = (root) => root.calls.filter((call) => call.method === "updateTab" || call.method === "createTab");

const taskQuery = (root) => {
  const taskCall = root.calls.find((call) => call.method === "tasks");
  return taskCall?.params?.query ? JSON.parse(taskCall.params.query) : null;
};

const createRoot = (canManage) => {
  const root = Root.create({
    viewsStore: {
      columnsRaw: [
        {
          id: "id",
          title: "ID",
          type: "Number",
          target: "tasks",
          visibility_defaults: { filter: true },
        },
      ],
    },
    SDK: {
      type: "dm",
      projectId: 5,
      hasInterface: () => false,
      invoke: () => {},
      project: { id: 5, access: { can_manage: canManage, can_annotate: true } },
    },
  });

  root.viewsStore.fetchColumns();
  unprotect(root);
  root.viewsStore.views.push({
    id: 5,
    title: "Default",
    saved: true,
    key: "default",
    filters: [{ filter: "filter:tasks:id", operator: "equal", value: 1 }],
  });
  const view = root.viewsStore.views[0];
  root.viewsStore.selected = view;
  return { root, view };
};

describe("shared view filter and sort when access.can_manage is false", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("applies a member filter to the task query without saving the shared view", async () => {
    const created = createRoot(false);
    root = created.root;
    const filter = created.view.filters[0];

    filter.setValue(42);
    await filter.save();

    expect(viewWrites(root)).toEqual([]);
    expect(taskQuery(root)?.filters?.items?.[0]).toMatchObject({
      filter: "filter:tasks:id",
      operator: "equal",
      value: 42,
    });
  });

  it("applies a member sort to the task query without saving the shared view", async () => {
    const created = createRoot(false);
    root = created.root;

    created.view.ordering.replace(["tasks:id"]);
    await created.view.save({ interaction: "ordering" });

    expect(viewWrites(root)).toEqual([]);
    expect(taskQuery(root)?.ordering).toEqual(["tasks:id"]);
  });

  it("still saves a manager filter onto the shared view", async () => {
    const created = createRoot(true);
    root = created.root;
    const filter = created.view.filters[0];

    filter.setValue(42);
    await filter.save();

    const saved = viewWrites(root);
    expect(saved).toHaveLength(1);
    expect(saved[0].method).toBe("updateTab");
    expect(saved[0].body.body.data.filters.items[0]).toMatchObject({
      filter: "filter:tasks:id",
      operator: "equal",
      value: 42,
    });
  });
});
