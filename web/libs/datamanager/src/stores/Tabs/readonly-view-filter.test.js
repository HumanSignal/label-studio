import { applySnapshot, destroy, getSnapshot, types, unprotect } from "mobx-state-tree";
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
      if (method === "tab") {
        return Promise.resolve({
          id: params.tabId,
          title: "Default",
          data: {
            filters: {
              conjunction: "and",
              items: [
                { id: `shared-id-filter-${params.tabId}`, filter: "filter:tasks:id", operator: "equal", value: 1 },
                { filter: "filter:tasks:agreement", operator: "equal", value: 0.5 },
              ],
            },
            ordering: [],
          },
        });
      }
      return Promise.resolve({ id: 5, title: "Default", data: {} });
    },
    unsetSelection() {},
  }));

const viewWrites = (root) => root.calls.filter((call) => call.method === "updateTab" || call.method === "createTab");

const taskQuery = (root) => {
  const taskCall = root.calls.filter((call) => call.method === "tasks").at(-1);
  return taskCall?.params?.query ? JSON.parse(taskCall.params.query) : null;
};

const createRoot = (canManage, tabProps = {}) => {
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
    filters: [{ id: "shared-id-filter-5", filter: "filter:tasks:id", operator: "equal", value: 1 }],
    ...tabProps,
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

  it("keeps untouched member tabs on the server view so hidden shared filters still apply", async () => {
    const created = createRoot(false);
    root = created.root;

    root.viewsStore.selected = null;
    await root.viewsStore.setSelected(5, { pushState: false });
    await created.view.save();
    await root.dataStore.fetch({ pageNumber: 2 });

    expect(created.view.filters.map((filter) => filter.filter.id)).toEqual(["filter:tasks:id"]);
    const taskCalls = root.calls.filter((call) => call.method === "tasks");
    expect(taskCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of taskCalls) {
      expect(call.params.view).toBe(5);
      expect(call.params.query).toBeUndefined();
    }
    expect(viewWrites(root)).toEqual([]);
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

  it("keeps member filters and ordering on pagination and scrolling requests", async () => {
    const created = createRoot(false);
    root = created.root;
    const { view } = created;

    view.filters[0].setValue(42);
    view.ordering.replace(["-tasks:id"]);
    await view.save({ interaction: "filter" });

    await root.dataStore.fetch({ pageNumber: 2 });
    await root.dataStore.fetch();

    const taskCalls = root.calls.filter((call) => call.method === "tasks");
    expect(taskCalls.map((call) => call.params.page)).toEqual([1, 2, 3]);
    for (const call of taskCalls) {
      expect(call.params.view).toBeUndefined();
      expect(JSON.parse(call.params.query ?? "null")).toMatchObject({
        filters: {
          conjunction: "and",
          items: [{ filter: "filter:tasks:id", operator: "equal", value: 42 }],
        },
        ordering: ["-tasks:id"],
      });
    }
    expect(viewWrites(root)).toEqual([]);
  });

  it("keeps member filters and ordering when Refresh reloads the saved tab", async () => {
    const created = createRoot(false);
    root = created.root;
    const { view } = created;

    view.filters[0].setValue(42);
    view.ordering.replace(["-tasks:id"]);
    await view.save({ interaction: "filter" });

    root.viewsStore.fetchColumns({ deferSelectedReload: true });
    await view.reload({ interaction: "refresh" });

    expect(root.calls.filter((call) => call.method === "tasks")).toHaveLength(2);
    expect(taskQuery(root)).toMatchObject({
      filters: { items: [{ filter: "filter:tasks:id", operator: "equal", value: 42 }] },
      ordering: ["-tasks:id"],
    });
    expect(viewWrites(root)).toEqual([]);
  });

  it("keeps cleared member filters and ordering on later reads", async () => {
    const created = createRoot(false, { ordering: ["-tasks:id"] });
    root = created.root;
    const { view } = created;

    view.filters.clear();
    view.ordering.clear();
    await view.save({ interaction: "filter" });
    await root.dataStore.fetch({ pageNumber: 2 });

    expect(taskQuery(root)).toMatchObject({
      filters: { conjunction: "and", items: [] },
      ordering: [],
    });
    expect(viewWrites(root)).toEqual([]);
  });

  it("reloads when a member restores the original shared filter and ordering", async () => {
    const created = createRoot(false);
    root = created.root;
    const { view } = created;

    view.filters[0].setValue(42);
    view.ordering.replace(["-tasks:id"]);
    await view.save({ interaction: "filter" });
    view.filters[0].setValue(1);
    view.ordering.clear();
    await view.save({ interaction: "filter" });

    expect(root.calls.filter((call) => call.method === "tasks")).toHaveLength(2);
    expect(taskQuery(root)).toMatchObject({
      filters: { items: [{ filter: "filter:tasks:id", operator: "equal", value: 1 }] },
      ordering: [],
    });
    expect(viewWrites(root)).toEqual([]);
  });

  it("uses the current tab state after a server snapshot replaces member edits", async () => {
    const created = createRoot(false);
    root = created.root;
    const { view } = created;
    const sharedSnapshot = getSnapshot(view);

    view.filters[0].setValue(42);
    view.ordering.replace(["-tasks:id"]);
    await view.save({ interaction: "filter" });
    applySnapshot(view, sharedSnapshot);
    await view.reload();
    await root.dataStore.fetch({ pageNumber: 2 });

    expect(root.calls.filter((call) => call.method === "tasks").at(-1)?.params.view).toBe(5);
    expect(taskQuery(root)).toBeNull();
    expect(view.filters[0].value).toBe(1);
    expect(view.ordering).toEqual([]);
    expect(viewWrites(root)).toEqual([]);
  });

  it("does not apply another selected tab's member query to an explicit view fetch", async () => {
    const created = createRoot(false);
    root = created.root;
    created.view.filters[0].setValue(42);
    await created.view.save({ interaction: "filter" });

    await root.dataStore.fetch({ id: 6, pageNumber: 2 });

    expect(root.calls.filter((call) => call.method === "tasks").at(-1)?.params).toMatchObject({
      view: 6,
      page: 2,
    });
    expect(taskQuery(root)).toBeNull();
    expect(viewWrites(root)).toEqual([]);
  });

  it("returns to the refreshed shared query when a member reselects a tab", async () => {
    const created = createRoot(false);
    root = created.root;
    const { view } = created;

    view.filters[0].setValue(42);
    view.ordering.replace(["-tasks:id"]);
    await view.save({ interaction: "filter" });
    root.viewsStore.views.push({ id: 6, title: "Other", saved: true });

    await root.viewsStore.setSelected(6, { pushState: false });
    await root.viewsStore.setSelected(5, { pushState: false });
    await root.dataStore.fetch({ pageNumber: 2 });

    expect(root.calls.filter((call) => call.method === "tasks").at(-1)?.params.view).toBe(5);
    expect(taskQuery(root)).toBeNull();
    expect(view.filters[0].value).toBe(1);
    expect(view.ordering).toEqual([]);
    expect(viewWrites(root)).toEqual([]);
  });

  it("reloads the first page from the shared view when reselecting restores query mode only", async () => {
    const created = createRoot(false);
    root = created.root;
    const { view } = created;

    view.filters[0].setValue(42);
    await view.save({ interaction: "filter" });
    view.filters[0].setValue(1);
    await view.save({ interaction: "filter" });
    root.viewsStore.views.push({ id: 6, title: "Other", saved: true });

    await root.viewsStore.setSelected(6, { pushState: false });
    await root.viewsStore.setSelected(5, { pushState: false });

    const firstPage = root.calls.filter((call) => call.method === "tasks").at(-1);
    expect(firstPage.params).toMatchObject({ view: 5, page: 1 });
    expect(firstPage.params.query).toBeUndefined();

    await root.dataStore.fetch({ pageNumber: 2 });

    const secondPage = root.calls.filter((call) => call.method === "tasks").at(-1);
    expect(secondPage.params).toMatchObject({ view: 5, page: 2 });
    expect(secondPage.params.query).toBeUndefined();
    expect(viewWrites(root)).toEqual([]);
  });

  it("keeps virtual tab queries on pagination and Refresh without writing a shared view", async () => {
    const created = createRoot(true, { saved: false, virtual: true });
    root = created.root;

    created.view.filters[0].setValue(42);
    await created.view.reload();
    await root.dataStore.fetch({ pageNumber: 2 });
    await created.view.reload({ interaction: "refresh" });

    const taskCalls = root.calls.filter((call) => call.method === "tasks");
    expect(taskCalls.map((call) => call.params.page)).toEqual([1, 2, 1]);
    for (const call of taskCalls) {
      expect(call.params.view).toBeUndefined();
      expect(JSON.parse(call.params.query ?? "null")).toMatchObject({
        filters: { items: [{ filter: "filter:tasks:id", operator: "equal", value: 42 }] },
      });
    }
    expect(viewWrites(root)).toEqual([]);
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

    await root.dataStore.fetch({ pageNumber: 2 });
    await created.view.reload({ interaction: "refresh" });

    const taskCalls = root.calls.filter((call) => call.method === "tasks");
    expect(taskCalls.map((call) => call.params.page)).toEqual([1, 2, 1]);
    for (const call of taskCalls) {
      expect(call.params.view).toBe(5);
      expect(call.params.query).toBeUndefined();
    }
    expect(viewWrites(root)).toHaveLength(1);
  });
});
