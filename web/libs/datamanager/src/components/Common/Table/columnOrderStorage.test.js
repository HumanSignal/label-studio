import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  DM_COLUMN_ORDER_STORAGE_KEY,
  readPersonalColumnOrder,
  writePersonalColumnOrder,
  persistPersonalColumnOrderIfNeeded,
  clearPersonalColumnOrder,
  onPersonalColumnOrderCleared,
  resolveEffectiveColumnOrder,
} from "./columnOrderStorage";

describe("columnOrderStorage (FIT-2882)", () => {
  let storage;

  beforeEach(() => {
    const data = {};
    storage = {
      getItem: (key) => (key in data ? data[key] : null),
      setItem: (key, value) => {
        data[key] = String(value);
      },
      removeItem: (key) => {
        delete data[key];
      },
      _data: data,
    };
  });

  it("reads an empty object when the key is missing", () => {
    expect(readPersonalColumnOrder(storage)).toEqual({});
  });

  it("reads and writes the personal order map under dm:columnorder", () => {
    const order = { "tasks:id": 0, "tasks:data.text": 1 };
    writePersonalColumnOrder(order, storage);
    expect(storage._data[DM_COLUMN_ORDER_STORAGE_KEY]).toBe(JSON.stringify(order));
    expect(readPersonalColumnOrder(storage)).toEqual(order);
  });

  it("returns {} when stored JSON is invalid", () => {
    storage.setItem(DM_COLUMN_ORDER_STORAGE_KEY, "{not-json");
    expect(readPersonalColumnOrder(storage)).toEqual({});
  });

  it("does not write personal order when shared-tab order FF is on (Table effect gate)", () => {
    const write = mock(() => {});
    const wrote = persistPersonalColumnOrderIfNeeded(true, { "tasks:id": 0 }, write);
    expect(wrote).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it("writes personal order when shared-tab order FF is off", () => {
    const write = mock(() => {});
    const order = { "tasks:id": 1 };
    const wrote = persistPersonalColumnOrderIfNeeded(false, order, write);
    expect(wrote).toBe(true);
    expect(write).toHaveBeenCalledWith(order);
  });

  it("clears the full personal order and notifies listeners (FIT-2846 Reset)", () => {
    writePersonalColumnOrder({ "tasks:id": 1 }, storage);
    const handler = mock(() => {});
    const unsubscribe = onPersonalColumnOrderCleared(handler);

    clearPersonalColumnOrder(undefined, storage);

    expect(readPersonalColumnOrder(storage)).toEqual({});
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({});
    unsubscribe();
  });

  it("scopes clear to the given column ids and preserves unrelated prefs", () => {
    writePersonalColumnOrder(
      {
        "tasks:id": 0,
        "tasks:data.text": 1,
        "tasks:other_project_col": 2,
      },
      storage,
    );
    const handler = mock(() => {});
    const unsubscribe = onPersonalColumnOrderCleared(handler);

    const next = clearPersonalColumnOrder(["tasks:id", "tasks:data.text"], storage);

    expect(next).toEqual({ "tasks:other_project_col": 2 });
    expect(readPersonalColumnOrder(storage)).toEqual({ "tasks:other_project_col": 2 });
    expect(handler).toHaveBeenCalledWith({ "tasks:other_project_col": 2 });
    unsubscribe();
  });

  it("supports legacy clearPersonalColumnOrder(storage) call shape", () => {
    writePersonalColumnOrder({ "tasks:id": 1 }, storage);
    clearPersonalColumnOrder(storage);
    expect(readPersonalColumnOrder(storage)).toEqual({});
  });
});

describe("resolveEffectiveColumnOrder (Table / FIT-2846)", () => {
  const tabOrder = { "tasks:data.text": 0, "tasks:id": 1 };
  const personalOrder = { "tasks:id": 0, "tasks:data.text": 1 };
  const columnIds = ["tasks:id", "tasks:data.text", "tasks:completed_at"];

  it("uses tab order when shared column-order FF is on", () => {
    expect(
      resolveEffectiveColumnOrder({
        sharedColumnOrder: true,
        projectColumnDefaults: false,
        personalOrder,
        tabColumnOrder: tabOrder,
        columnIds,
      }),
    ).toEqual(tabOrder);
  });

  it("prefers personal order when it touches current view columns", () => {
    expect(
      resolveEffectiveColumnOrder({
        sharedColumnOrder: false,
        projectColumnDefaults: true,
        personalOrder,
        tabColumnOrder: tabOrder,
        columnIds,
      }),
    ).toEqual(personalOrder);
  });

  it("ignores unrelated personal keys so Reset-scoped clears fall through to tab order", () => {
    expect(
      resolveEffectiveColumnOrder({
        sharedColumnOrder: false,
        projectColumnDefaults: true,
        personalOrder: { "tasks:other_project_col": 0 },
        tabColumnOrder: tabOrder,
        columnIds,
      }),
    ).toEqual(tabOrder);
  });

  it("uses tab order when project defaults FF is on and personal has no relevant keys", () => {
    expect(
      resolveEffectiveColumnOrder({
        sharedColumnOrder: false,
        projectColumnDefaults: true,
        personalOrder: {},
        tabColumnOrder: tabOrder,
        columnIds,
      }),
    ).toEqual(tabOrder);
  });

  it("keeps default grid order when both FFs are off even if tab has persisted columnOrder", () => {
    // Flag-off regression: older tabs may still carry columnOrder from a shared-order era.
    expect(
      resolveEffectiveColumnOrder({
        sharedColumnOrder: false,
        projectColumnDefaults: false,
        personalOrder: {},
        tabColumnOrder: tabOrder,
        columnIds,
      }),
    ).toEqual({});
  });
});
