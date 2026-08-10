import { destroy, getSnapshot, isAlive, unprotect } from "mobx-state-tree";
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
    unsetSelection() {},
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

describe("hidden filter-only columns in Columns picker (FIT-2435)", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("excludes API-hidden columns from targetColumns while keeping them filterable", () => {
    root = RootStore.create({
      viewsStore: {
        columnsRaw: [
          {
            id: "id",
            title: "ID",
            type: "Number",
            target: "tasks",
            visibility_defaults: { explore: true, filter: true },
          },
          {
            id: "skipped_by_annotator",
            title: "Skipped by Annotator",
            type: "List",
            target: "tasks",
            hidden: true,
            visibility_defaults: { explore: false, labeling: false, filter: true },
            schema: { multiple: true },
          },
          {
            id: "annotators",
            title: "Annotated by",
            type: "List",
            target: "tasks",
            visibility_defaults: { explore: true, filter: true },
            schema: { multiple: true },
          },
        ],
      },
    });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({ id: 1, title: "Saved", saved: true, key: "saved" });
    root.viewsStore.selected = 1;

    const view = root.viewsStore.views[0];
    const targetAliases = view.targetColumns.map((column) => column.alias);

    expect(targetAliases).toContain("id");
    expect(targetAliases).toContain("annotators");
    expect(targetAliases).not.toContain("skipped_by_annotator");
    expect(view.availableFilters.map((filter) => filter.id)).toContain("filter:tasks:skipped_by_annotator");
  });
});

describe("saved filter availability (FIT-2173)", () => {
  let root;

  const columnsRaw = [
    {
      id: "id",
      title: "ID",
      type: "Number",
      target: "tasks",
      visibility_defaults: { filter: true },
    },
    {
      id: "annotations_dimension_results",
      title: "Annotations",
      type: "List",
      target: "tasks",
      children: ["dimension_42"],
      hidden: true,
    },
    {
      id: "dimension_42",
      title: "Sentiment",
      type: "List",
      target: "tasks",
      parent: "annotations_dimension_results",
      hidden: true,
      available_for_new_filters: false,
      filter_available: false,
      unavailable_reason: "Dimension filter availability is temporarily unavailable.",
      visibility_defaults: { filter: true },
      schema: { items: [{ value: "positive", title: "positive" }], multiple: true },
    },
  ];

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  const createRootWithUnavailableFilter = () => {
    root = RootStore.create({ viewsStore: { columnsRaw } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({
      id: 1,
      title: "Saved",
      saved: true,
      key: "saved",
      filters: [
        {
          filter: "filter:tasks:annotations_dimension_results.dimension_42",
          operator: "contains",
          value: ["positive"],
        },
      ],
    });
    root.viewsStore.selected = 1;
    return root.viewsStore.views[0];
  };

  it("excludes compatibility columns from Add Filter while resolving saved filters", () => {
    const view = createRootWithUnavailableFilter();

    expect(view.availableFilters.map((filter) => filter.id)).toEqual(["filter:tasks:id"]);
    expect(view.filters[0].field.id).toBe("tasks:annotations_dimension_results.dimension_42");
    expect(view.filters[0].field.filter_available).toBe(false);
  });

  it("keeps unavailable saved filters removable", () => {
    const view = createRootWithUnavailableFilter();

    view.filters[0].delete();

    expect(view.filters).toHaveLength(0);
  });

  it("does not clone an unavailable field when adding another filter", () => {
    const view = createRootWithUnavailableFilter();

    view.createFilter();

    expect(view.filters[1].filter.id).toBe("filter:tasks:id");
  });
});

describe("locking a tab preserves hidden agreement columns (FIT-2406)", () => {
  let root;

  const agreementColumnsRaw = [
    { id: "id", title: "ID", type: "Number", target: "tasks", visibility_defaults: { explore: true } },
    {
      id: "agreement",
      title: "Agreement",
      type: "Number",
      target: "tasks",
      visibility_defaults: { explore: true, labeling: false },
    },
    {
      id: "agreement_selected",
      title: "Agreement (Selected)",
      type: "AgreementSelected",
      target: "tasks",
      visibility_defaults: { explore: true, labeling: false },
    },
    {
      id: "dimension_agreement_7",
      title: "Sentiment",
      type: "Number",
      target: "tasks",
      visibility_defaults: { explore: true, labeling: false },
    },
  ];

  const hiddenAgreementIds = ["tasks:agreement", "tasks:agreement_selected", "tasks:dimension_agreement_7"];

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  /**
   * Fake backend mirroring data_manager.serializers.ViewSerializer: `data` is a JSON
   * blob echoed back on every response, and locked views only accept `columnsWidth`.
   */
  const createFakeServer = (initialData) => {
    // JSON round-trip mirrors the HTTP boundary: request/response bodies never
    // share object identity with the store's snapshots.
    const wire = (value) => JSON.parse(JSON.stringify(value));
    const state = { is_locked: false, data: wire(initialData) };

    return {
      state,
      apiCall: mock(async (method, _params, payload) => {
        const body = wire(payload?.body ?? {});

        if (method === "updateTab") {
          if ("is_locked" in body) state.is_locked = body.is_locked;
          else if (body.data && !state.is_locked) state.data = body.data;
        }

        const view = {
          id: 1,
          title: state.data.title,
          is_locked: state.is_locked,
          locked_by: state.is_locked ? { name: "Ada Manager", email: "ada@example.com" } : null,
          locked_at: state.is_locked ? "2026-08-06T00:00:00Z" : null,
          data: state.data,
        };

        return wire(method === "tabs" ? [view] : view);
      }),
    };
  };

  const createStoreWithHiddenAgreementColumns = () => {
    const server = createFakeServer({
      title: "Saved",
      hiddenColumns: { explore: [...hiddenAgreementIds], labeling: [] },
    });

    root = RootStore.create({ viewsStore: { columnsRaw: agreementColumnsRaw } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.apiCall = server.apiCall;
    root.viewsStore.views.push({
      id: 1,
      title: "Saved",
      saved: true,
      key: "saved",
      hiddenColumns: { explore: [...hiddenAgreementIds], labeling: [] },
    });
    root.viewsStore.selected = 1;

    return { view: root.viewsStore.views[0], server };
  };

  const agreementColumns = (view) => view.columns.filter((column) => column.alias !== "id");

  it("keeps agreement columns hidden after the tab is locked", async () => {
    const { view } = createStoreWithHiddenAgreementColumns();

    expect(agreementColumns(view).every((column) => column.is_hidden)).toBe(true);

    await view.toggleLock();

    expect(view.isLockedByManager).toBe(true);
    expect(view.hiddenColumns.explore).toEqual(hiddenAgreementIds);
    expect(agreementColumns(view).every((column) => column.is_hidden)).toBe(true);
  });

  it("keeps agreement columns hidden when they are hidden through the picker before locking", async () => {
    const server = createFakeServer({ title: "Saved", hiddenColumns: { explore: [], labeling: [] } });

    root = RootStore.create({ viewsStore: { columnsRaw: agreementColumnsRaw } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.apiCall = server.apiCall;
    root.viewsStore.views.push({ id: 1, title: "Saved", saved: true, key: "saved" });
    root.viewsStore.selected = 1;

    const view = root.viewsStore.views[0];

    for (const column of agreementColumns(view)) {
      await view.toggleColumn(column);
    }

    expect(view.hiddenColumns.explore).toEqual(hiddenAgreementIds);
    expect(server.state.data.hiddenColumns.explore).toEqual(hiddenAgreementIds);

    await view.toggleLock();

    expect(view.hiddenColumns.explore).toEqual(hiddenAgreementIds);
    expect(agreementColumns(view).every((column) => column.is_hidden)).toBe(true);
  });

  /**
   * Agreement columns are role-gated in LSE (annotators never receive them; reviewers only
   * when show_agreement_to_reviewers is on) and dimension columns come and go with the
   * project's dimensions. A session that cannot see those columns must still round-trip
   * their hidden state, otherwise it prunes the list and the next save erases the
   * manager's configuration — which surfaces as columns reappearing once the tab is locked.
   */
  const createStoreWithoutAgreementColumns = () => {
    const server = createFakeServer({
      title: "Saved",
      hiddenColumns: { explore: [...hiddenAgreementIds], labeling: [] },
    });

    root = RootStore.create({
      viewsStore: { columnsRaw: agreementColumnsRaw.filter((column) => column.id === "id") },
    });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.apiCall = server.apiCall;

    return { server };
  };

  it("preserves hidden agreement columns for sessions that cannot see them", async () => {
    createStoreWithoutAgreementColumns();

    await root.viewsStore.fetchSingleTab("1", {});

    expect(root.viewsStore.selected.hiddenColumns.explore).toEqual(hiddenAgreementIds);
  });

  it("does not erase hidden agreement columns when such a session saves the view", async () => {
    const { server } = createStoreWithoutAgreementColumns();

    await root.viewsStore.fetchSingleTab("1", {});
    const view = root.viewsStore.selected;

    view.setColumnWidth("tasks:id", 120);
    await view.save({ reload: false });

    expect(server.state.data.hiddenColumns.explore).toEqual(hiddenAgreementIds);
  });

  it("still drops compatibility filter columns from the hidden list", async () => {
    const server = createFakeServer({
      title: "Saved",
      hiddenColumns: { explore: ["tasks:annotations_results_json", "tasks:agreement"], labeling: [] },
    });

    root = RootStore.create({
      viewsStore: {
        columnsRaw: [
          ...agreementColumnsRaw,
          { id: "annotations_results_json", title: "Annotations JSON", type: "String", target: "tasks" },
        ],
      },
    });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.apiCall = server.apiCall;

    await root.viewsStore.fetchSingleTab("1", {});

    expect(root.viewsStore.selected.hiddenColumns.explore).toEqual(["tasks:agreement"]);
  });
});

describe("multiselect filter validation (FIT-2253)", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("persists clearing a root multiselect by omitting the invalid filter", async () => {
    const apiCall = mock(async () => ({ id: 1, title: "Saved" }));
    root = RootStore.create({
      viewsStore: {
        columnsRaw: [
          {
            id: "annotators",
            title: "Annotators",
            type: "List",
            target: "tasks",
            schema: { multiple: true },
            visibility_defaults: { filter: true },
          },
        ],
      },
    });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.apiCall = apiCall;
    root.viewsStore.views.push({
      id: 1,
      title: "Saved",
      saved: true,
      key: "saved",
      filters: [
        {
          filter: "filter:tasks:annotators",
          operator: "contains",
          value: [1],
        },
      ],
    });
    root.viewsStore.selected = 1;
    const filter = root.viewsStore.views[0].filters[0];

    expect(filter.schema?.multiple).toBe(true);
    apiCall.mockClear();
    filter.setValue([]);
    expect(root.viewsStore.views[0].serializedFilters).toEqual([]);
    await filter.save(true);

    expect(filter.isValidFilter).toBe(false);
    expect(apiCall).toHaveBeenCalled();
  });

  it("persists clearing a child multiselect while retaining its parent", async () => {
    const apiCall = mock(async () => ({ id: 1, title: "Saved" }));
    root = RootStore.create({
      viewsStore: {
        columnsRaw: [
          {
            id: "annotations_results",
            title: "Annotations",
            type: "List",
            target: "tasks",
            children: ["sentiment"],
            hidden: true,
          },
          {
            id: "sentiment",
            title: "Sentiment",
            type: "List",
            target: "tasks",
            parent: "annotations_results",
            child_filter: "annotators",
            schema: { items: [{ value: "positive", title: "Positive" }], multiple: true },
            visibility_defaults: { filter: true },
          },
          {
            id: "annotators",
            title: "Annotators",
            type: "List",
            target: "tasks",
            alias: "annotators",
            schema: { multiple: true },
            visibility_defaults: { filter: true },
          },
        ],
      },
    });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.apiCall = apiCall;
    root.viewsStore.views.push({
      id: 1,
      title: "Saved",
      saved: true,
      key: "saved",
      filters: [
        {
          filter: "filter:tasks:annotations_results.sentiment",
          operator: "contains",
          value: ["positive"],
          child_filter: {
            filter: "filter:tasks:annotators",
            operator: "contains",
            value: [1],
          },
        },
      ],
    });
    root.viewsStore.selected = 1;
    const parent = root.viewsStore.views[0].filters[0];
    const child = parent.child_filter;

    apiCall.mockClear();
    child.setValue([]);
    expect(root.viewsStore.views[0].serializedFilters).toHaveLength(1);
    expect(root.viewsStore.views[0].serializedFilters[0].value).toEqual(["positive"]);
    expect(root.viewsStore.views[0].serializedFilters[0].child_filters).toEqual([]);
    await child.save(true);

    expect(child.isValidFilter).toBe(false);
    expect(apiCall).toHaveBeenCalled();
  });
});

describe("multiple child filters (FIT-2273)", () => {
  let root;

  const columnsRaw = [
    {
      id: "id",
      title: "ID",
      type: "Number",
      target: "tasks",
      visibility_defaults: { filter: true },
    },
    {
      id: "annotations_results",
      title: "Annotations",
      type: "List",
      target: "tasks",
      children: ["sentiment"],
      hidden: true,
    },
    {
      id: "sentiment",
      title: "Sentiment",
      type: "List",
      target: "tasks",
      parent: "annotations_results",
      allowed_child_filters: ["annotators", "ground_truth"],
      schema: { items: [{ value: "positive", title: "Positive" }], multiple: true },
      visibility_defaults: { filter: true },
    },
    {
      id: "annotators",
      title: "Annotators",
      type: "List",
      target: "tasks",
      schema: { multiple: true },
      visibility_defaults: { filter: true },
    },
    {
      id: "ground_truth",
      title: "Ground Truth",
      type: "Boolean",
      target: "tasks",
      visibility_defaults: { filter: true },
    },
  ];

  const childSnapshot = (overrides = {}) => ({
    filter: "filter:tasks:annotators",
    operator: "contains",
    value: [1],
    ...overrides,
  });

  const createView = (parentOverrides = {}) => {
    root = RootStore.create({ viewsStore: { columnsRaw } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({
      id: 1,
      title: "Saved",
      saved: true,
      key: "saved",
      filters: [
        {
          filter: "filter:tasks:annotations_results.sentiment",
          operator: "contains",
          value: ["positive"],
          ...parentOverrides,
        },
      ],
    });
    root.viewsStore.selected = 1;

    return {
      view: root.viewsStore.views[0],
      parent: root.viewsStore.views[0].filters[0],
    };
  };

  const filterTypeFor = (view, alias) => view.availableFilters.find((filter) => filter.field.alias === alias);

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("retains allowed_child_filters metadata on TabColumn", () => {
    const { parent } = createView();

    expect(parent.field.allowed_child_filters).toEqual(["annotators", "ground_truth"]);
  });

  it("migrates a legacy child_filter snapshot to the child_filters array", () => {
    const { parent } = createView({ child_filter: childSnapshot() });
    const snapshot = getSnapshot(parent);

    expect(snapshot.child_filters).toHaveLength(1);
    expect(snapshot.child_filters[0]).toMatchObject(childSnapshot());
    expect("child_filter" in snapshot).toBe(false);
  });

  it("serializes applied children under child_filters", () => {
    const { view } = createView({ child_filters: [childSnapshot()] });
    const serializedParent = view.serialize().data.filters.items[0];

    expect(serializedParent.child_filters).toHaveLength(1);
    expect(serializedParent.child_filters[0]).toMatchObject(childSnapshot());
    expect("child_filter" in serializedParent).toBe(false);
  });

  it("adds multiple child lines and permits the same column more than once", () => {
    const { view, parent } = createView();
    const annotators = filterTypeFor(view, "annotators");

    view.createChildFilterForType(annotators, parent);
    view.createChildFilterForType(annotators, parent);

    expect(parent.child_filters).toHaveLength(2);
    expect(parent.child_filters.map((child) => child.field.alias)).toEqual(["annotators", "annotators"]);
  });

  it("removes one child without deleting its parent or sibling", () => {
    const { view, parent } = createView();
    const first = view.createChildFilterForType(filterTypeFor(view, "annotators"), parent);
    const second = view.createChildFilterForType(filterTypeFor(view, "ground_truth"), parent);
    const secondId = second.id;

    first.delete();

    expect(isAlive(parent)).toBe(true);
    expect(view.filters).toHaveLength(1);
    expect(parent.child_filters).toHaveLength(1);
    expect(parent.child_filters[0].id).toBe(secondId);
  });

  it("does not resurrect a legacy default after the final child is removed and rehydrated", () => {
    const legacyColumns = columnsRaw.map((column) =>
      column.id === "sentiment" ? { ...column, child_filter: "annotators" } : column,
    );
    root = RootStore.create({ viewsStore: { columnsRaw: legacyColumns } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({
      id: 1,
      title: "Saved",
      saved: true,
      key: "saved",
      filters: [
        {
          filter: "filter:tasks:annotations_results.sentiment",
          operator: "contains",
          value: ["positive"],
          child_filters: [childSnapshot()],
        },
      ],
    });
    const view = root.viewsStore.views[0];
    const parent = view.filters[0];

    destroy(parent.child_filters[0]);
    const serializedParent = view.serializedFilters[0];
    expect(serializedParent.child_filters).toEqual([]);

    destroy(root);
    root = RootStore.create({ viewsStore: { columnsRaw: legacyColumns } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({
      id: 1,
      title: "Reloaded",
      saved: true,
      key: "reloaded",
      filters: [serializedParent],
    });

    expect(root.viewsStore.views[0].filters[0].child_filters).toHaveLength(0);
  });

  it("clears all children when the root column changes", () => {
    const { view, parent } = createView();

    view.createChildFilterForType(filterTypeFor(view, "annotators"), parent);
    view.createChildFilterForType(filterTypeFor(view, "ground_truth"), parent);
    parent.setFilter(filterTypeFor(view, "id").id, false);

    expect(parent.field.alias).toBe("id");
    expect(parent.child_filters).toHaveLength(0);
  });

  it("omits an invalid child while preserving valid siblings during serialization", () => {
    const { view, parent } = createView();
    const annotators = filterTypeFor(view, "annotators");
    const validChild = view.createChildFilterForType(annotators, parent);
    const invalidChild = view.createChildFilterForType(annotators, parent);

    validChild.setValue([1]);
    invalidChild.setValue([]);

    const serializedParent = view.serializedFilters[0];

    expect(serializedParent.child_filters).toHaveLength(1);
    expect(serializedParent.child_filters[0]).toMatchObject({
      filter: "filter:tasks:annotators",
      value: [1],
    });
  });
});
