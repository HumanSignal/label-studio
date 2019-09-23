import { observer } from "mobx-react";
import React from "react";
import { types } from "mobx-state-tree";

import Tree from "../../core/Tree";
import Registry from "../../core/Registry";
import Types from "../../core/Types";

import { LabelModel } from "./Label"; // eslint-disable-line no-unused-vars
import { guidGenerator } from "../../core/Helpers";
import SelectedModelMixin from "../mixins/SelectedModel";

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
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  choice: types.optional(types.enumeration(["single", "multiple"]), "single"),

  // TODO make enum
  selectionstyle: types.maybeNull(types.optional(types.string, "basic", "border", "bottom")),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "labels",
    children: Types.unionArray(["labels", "label", "choices", "choice"]),
  })
  .views(self => ({
    get shouldBeUnselected() {
      return self.choice === "single";
    },
  }))
  .actions(self => ({
    getSelectedColor() {
      // return first selected label color
      const sel = self.children.find(c => c.selected === true);
      return sel && sel.background;
    },

    toStateJSON() {
      const names = self.getSelectedNames();

      if (names && names.length) {
        return {
          id: self.pid,
          from_name: self.name,
          to_name: self.name,
          type: self.type,
          value: {
            labels: names,
          },
        };
      }
    },

    fromStateJSON(obj, fromModel) {
      self.unselectAll();

      if (!obj.value.labels) throw new Error("No labels param");

      if (obj.id) self.pid = obj.id;

      obj.value.labels.forEach(l => {
        const label = self.findLabel(l);
        if (!label) throw new Error("No label " + obj.value.label);

        label.markSelected(true);
      });
    },
  }));

const LabelsModel = types.compose(
  "LabelsModel",
  TagAttrs,
  Model,
  SelectedModelMixin,
);

const HtxLabels = observer(({ item }) => {
  return (
    <div
      style={{
        marginTop: "1em",
        marginBottom: "1em",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        flexFlow: "wrap",
      }}
    >
      {Tree.renderChildren(item)}
    </div>
  );
});

Registry.addTag("labels", LabelsModel, HtxLabels);

export { HtxLabels, LabelsModel };
