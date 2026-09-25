import { destroy, types } from "mobx-state-tree";
import { describe, it, expect, afterEach } from "bun:test";
import { DataStore, DataStoreItem } from "./index";

/**
 * FIT-2376: Tab switch clears the list/total before the next fetch. Without
 * loading=true at clear time, Table shows EmptyState (Import / No tasks)
 * instead of Spinner while the async tab reload is in flight.
 */
const Item = types.compose(
  "TestItem",
  DataStoreItem,
  types.model({
    id: types.identifierNumber,
  }),
);

const TestStore = DataStore("TestDataStore", {
  listItemType: Item,
  apiMethod: "tasks",
});

const Root = types.model({
  dataStore: types.optional(TestStore, {}),
});

describe("DataStore.clear (FIT-2376)", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("sets loading true atomically when clearing so EmptyState does not flash before fetch", () => {
    root = Root.create({
      dataStore: {
        list: [{ id: 1 }, { id: 2 }],
        total: 2,
        loading: false,
      },
    });

    const { dataStore } = root;

    expect(dataStore.total).toBe(2);
    expect(dataStore.loading).toBe(false);

    dataStore.clear();

    // Mimics Table.jsx: Spinner when isLoading && total === 0; EmptyState when total === 0 alone
    expect(dataStore.total).toBe(0);
    expect(dataStore.list).toHaveLength(0);
    expect(dataStore.loading).toBe(true);
  });
});

describe("DataStore.setList mergeListItem hook (#9897)", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  const SummaryItem = types.compose(
    "SummaryTestItem",
    DataStoreItem,
    types.model({
      id: types.identifierNumber,
      annotations_results: types.optional(types.string, ""),
      total_annotations: types.optional(types.number, 0),
      predictions_results: types.optional(types.string, ""),
      total_predictions: types.optional(types.number, 0),
    }),
  );

  const HookedStore = DataStore("HookedDataStore", {
    listItemType: SummaryItem,
    apiMethod: "tasks",
  }).actions((self) => ({
    mergeListItem(existing, incoming) {
      if (!existing) return incoming;
      const out = { ...incoming };

      if (out.annotations_results === "" && (out.total_annotations ?? 0) > 0 && existing.annotations_results) {
        out.annotations_results = existing.annotations_results;
      }
      return out;
    },
  }));

  const HookedRoot = types.model({
    dataStore: types.optional(HookedStore, {}),
  });

  it("lets the store preserve previously fetched values when a refetch returns unevaluated empties", () => {
    root = HookedRoot.create({});
    const { dataStore } = root;

    dataStore.setList({
      list: [{ id: 1, annotations_results: "choice=positive", total_annotations: 1 }],
      total: 1,
      reload: true,
    });
    dataStore.setList({
      list: [{ id: 1, annotations_results: "", total_annotations: 1 }],
      total: 1,
      reload: true,
    });

    expect(dataStore.list).toHaveLength(1);
    expect(dataStore.list[0].annotations_results).toBe("choice=positive");
  });

  it("leaves list behavior unchanged when no hook is defined", () => {
    root = Root.create({});
    root.dataStore.setList({ list: [{ id: 7 }], total: 1, reload: true });
    root.dataStore.setList({ list: [{ id: 7 }], total: 1, reload: true });
    expect(root.dataStore.list).toHaveLength(1);
  });
});
