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
