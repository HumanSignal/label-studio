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

describe("DataStore.fetch debounce (FIT-2914)", () => {
  let root;
  let calls;

  const FetchRoot = types
    .model({
      dataStore: types.optional(TestStore, {}),
      viewsStore: types.optional(
        types.model({
          selected: types.maybeNull(types.frozen()),
        }),
        {},
      ),
      SDK: types.optional(types.frozen(), {
        type: "dm",
        invoke() {},
      }),
      API: types.optional(types.frozen(), {
        getSettingsByMethodName() {
          return undefined;
        },
      }),
    })
    .actions(() => ({
      apiCall() {
        calls.push(Date.now());
        return Promise.resolve({ total: 0, tasks: [] });
      },
    }));

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("starts the first task fetch immediately and debounces a later filter refresh", async () => {
    calls = [];
    root = FetchRoot.create({});

    const first = root.dataStore.fetch({ id: 7, reload: true });
    await Promise.resolve();
    expect(calls).toHaveLength(1);

    const secondStarted = Date.now();
    const second = root.dataStore.fetch({ id: 7, reload: true, interaction: "filter" });
    await Promise.resolve();
    expect(calls).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 180));
    await second;
    await first;

    expect(calls).toHaveLength(2);
    expect(calls[1] - secondStarted).toBeGreaterThanOrEqual(140);
  });
});
