import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  DM_COLUMN_ORDER_STORAGE_KEY,
  readPersonalColumnOrder,
  writePersonalColumnOrder,
  persistPersonalColumnOrderIfNeeded,
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
});
