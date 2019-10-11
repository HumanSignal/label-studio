import React from "react";
import { types } from "mobx-state-tree";
import { observer, inject } from "mobx-react";

import { Table } from "antd";

import Registry from "../../core/Registry";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

/**
 * Table tag, show object keys and values in a table
 * @example
 * <Table name="text-1" value="$text"></Table>
 * @name Table
 * @param {string} value
 */
const Model = types.model({
  type: "table",
  value: types.maybeNull(types.string),
  _value: types.optional(types.string, ""),
});

const TableModel = types.compose(
  "TableModel",
  Model,
  ProcessAttrsMixin,
);

const HtxTable = inject("store")(
  observer(({ store, item }) => {
    let value = item._value;

    if (!value) {
      if (store.task) value = store.task.dataObj;
    }

    let dataSource = [];
    let columns = [{ title: "Type", dataIndex: "type" }, { title: "Value", dataIndex: "value" }];

    Object.keys(value).map(k => {
      let val = value[k];

      if (typeof val === "object") val = JSON.stringify(val);

      dataSource.push({ type: k, value: val });
    });

    return <Table dataSource={dataSource} columns={columns} />;
  }),
);

Registry.addTag("table", TableModel, HtxTable);

export { HtxTable, TableModel };
