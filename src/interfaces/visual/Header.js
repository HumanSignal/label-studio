import React from "react";
import { types } from "mobx-state-tree";
import { observer } from "mobx-react";
import { Typography } from "antd";

import Registry from "../../core/Registry";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

/**
 * Header tag, show header
 * @example
 * <Header name="text-1" value="$text"></Header>
 * @name Header
 * @param {number} [size=4] Size of header
 * @param {string} value Text of header
 * @param {boolean} [underline=false] Underline of header
 */
const Model = types.model({
  type: "header",
  size: types.optional(types.number, 4),
  _value: types.optional(types.string, ""),
  value: types.optional(types.string, ""),
  underline: types.optional(types.boolean, false),
});

const HeaderModel = types.compose(
  "HeaderModel",
  Model,
  ProcessAttrsMixin,
);

const HtxHeader = observer(({ item }) => {
  return (
    <Typography.Title underline={item.underline} level={item.size} style={{ margin: "10px 0" }}>
      {item._value}
    </Typography.Title>
  );
});

Registry.addTag("header", HeaderModel, HtxHeader);

export { HtxHeader, HeaderModel };
