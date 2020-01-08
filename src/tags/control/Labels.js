import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Tree from "../../core/Tree";
import Types from "../../core/Types";
import { LabelModel } from "./Label"; // eslint-disable-line no-unused-vars
import { guidGenerator } from "../../core/Helpers";

/**
 * Labels tag, create a group of labels
 * @example
 * <View>
 *   <Labels name="type" toName="txt-1">
 *     <Label alias="B" value="Brand"></Label>
 *     <Label alias="P" value="Product"></Label>
 *   </Labels>
 *   <Text name="txt-1" value="$text"></Text>
 * </View>
 * @name Labels
 * @param {string} name name of the element
 * @param {string} toName name of the element that you want to label
 * @param {single|multiple=} [choice=single] configure if you can select just one or multiple labels
 * @param {boolean} showInline show items in the same visual line
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  choice: types.optional(types.enumeration(["single", "multiple"]), "single"),

  showinline: types.optional(types.boolean, true),
  // TODO make enum
  selectionstyle: types.maybeNull(types.optional(types.string, "basic", "border", "bottom")),
});

/**
 * @param {boolean} showinline
 * @param {identifier} id
 * @param {string} pid
 */
const ModelAttrs = types.model({
  id: types.optional(types.identifier, guidGenerator),
  pid: types.optional(types.string, guidGenerator),
  type: "labels",
  children: Types.unionArray(["labels", "label", "choice"]),
});

const Model = LabelMixin.props({ _type: "labels" })
  .views(self => ({
    get shouldBeUnselected() {
      return self.choice === "single";
    },
  }))
  .actions(self => ({}));

const LabelsModel = types.compose("LabelsModel", ModelAttrs, TagAttrs, Model, SelectedModelMixin);

const HtxLabels = observer(({ item }) => {
  const style = {
    marginTop: "1em",
    marginBottom: "1em",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexFlow: "wrap",
  };

  if (!item.showinline) {
    style["flexDirection"] = "column";
    style["alignItems"] = "flex-start";
    style["marginTop"] = "0";
  }

  return <div style={style}>{Tree.renderChildren(item)}</div>;
});

Registry.addTag("labels", LabelsModel, HtxLabels);

export { HtxLabels, LabelsModel };
