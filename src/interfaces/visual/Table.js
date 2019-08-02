import React from "react";
import { types } from "mobx-state-tree";
import { observer, inject } from "mobx-react";

import { Table, Header } from "semantic-ui-react";
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
  size: types.optional(types.string, "h4"),
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

    return (
      <div style={{ marginTop: "1em" }}>
        <Table basic="very" celled collapsing>
          <Table.Body>
            {Object.keys(value).map(k => {
              let v = value[k];
              if (typeof v === "object") v = JSON.stringify(v);

              return (
                <Table.Row>
                  <Table.Cell>
                    <Header as="h4">
                      <Header.Subheader>{k}</Header.Subheader>
                    </Header>
                  </Table.Cell>
                  <Table.Cell>{v}</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    );
  }),
);

Registry.addTag("table", TableModel, HtxTable);

export { HtxTable, TableModel };
