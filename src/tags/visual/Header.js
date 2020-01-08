import React from "react";
import { types } from "mobx-state-tree";
import { observer } from "mobx-react";
import { Typography } from "antd";

import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";

/**
 * Header tag, show header
 * @example
 * <Header name="text-1" value="$text"></Header>
 * @name Header
 * @param {number} [size=4] Size of header
 * @param {string} value Text of header
 * @param {style} style css style string
 * @param {boolean} [underline=false] Underline of header
 */
const Model = types.model({
  type: "header",
  size: types.optional(types.string, "4"),
  style: types.maybeNull(types.string),
  _value: types.optional(types.string, ""),
  value: types.optional(types.string, ""),
  underline: types.optional(types.boolean, false),
});

const HeaderModel = types.compose("HeaderModel", Model, ProcessAttrsMixin);

const HtxHeader = observer(({ item }) => {
  const size = parseInt(item.size);
  const style = item.style ? Tree.cssConverter(item.style) : { margin: "10px 0" };

  return (
    <Typography.Title underline={item.underline} level={size} style={style}>
      {item._value}
    </Typography.Title>
  );
});

Registry.addTag("header", HeaderModel, HtxHeader);

export { HtxHeader, HeaderModel };
