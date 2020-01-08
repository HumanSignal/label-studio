import React from "react";
import { types } from "mobx-state-tree";
import { observer } from "mobx-react";
import { Typography } from "antd";

import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";

/**
 * Style tag, add css styles right through the config
 * @example
 * <Style># { hello: world }</Style>
 * @name Style
 */
const Model = types.model({
  type: "style",
  value: types.optional(types.string, ""),
});
const StyleModel = types.compose("StyleModel", Model);

const HtxStyle = observer(({ item }) => {
  return <style dangerouslySetInnerHTML={{ __html: item.value }}></style>;
});

Registry.addTag("style", StyleModel, HtxStyle);

export { HtxStyle, StyleModel };
