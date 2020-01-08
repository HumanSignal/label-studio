import React from "react";
import { Form } from "antd";
import { observer } from "mobx-react";
import { types, getRoot } from "mobx-state-tree";

import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Tree from "../../core/Tree";
import Types from "../../core/Types";
import { ChoiceModel } from "./Choice"; // eslint-disable-line no-unused-vars
import { guidGenerator } from "../../core/Helpers";

/**
 * Choices tag, create a group of choices, radio, or checkboxes. Shall
 * be used for a single or multi-class classification.
 * @example
 * <View>
 *   <Choices name="gender" toName="txt-1" choice="single-radio">
 *     <Choice alias="M" value="Male"></Choice>
 *     <Choice alias="F" value="Female"></Choice>
 *   </Choices>
 *   <Text name="txt-1" value="John went to see Marry"></Text>
 * </View>
 * @name Choices
 * @param {string} name of the group
 * @param {string} toName name of the elements that you want to label
 * @param {single|single-radio|multiple=} [choice=single] single or multi-class
 * @param {boolean} showInline show items in the same visual line
 */
const TagAttrs = types.model({
  name: types.string,
  toname: types.maybeNull(types.string),
  showinline: types.optional(types.boolean, false),
  choice: types.optional(types.enumeration(["single", "single-radio", "multiple"]), "single"),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "choices",
    children: Types.unionArray(["choice", "choices", "labels", "label"]),
  })
  .views(self => ({
    get shouldBeUnselected() {
      return self.choice === "single" || self.choice === "single-radio";
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    states() {
      return self.completion.toNames.get(self.name);
    },
  }))
  .actions(self => ({
    toStateJSON() {
      const names = self.getSelectedNames();

      if (names && names.length) {
        const toname = self.toname || self.name;
        return {
          id: self.pid,
          from_name: self.name,
          to_name: toname,
          type: self.type,
          value: {
            choices: names,
          },
        };
      }
    },

    fromStateJSON(obj, fromModel) {
      self.unselectAll();

      if (!obj.value.choices) throw new Error("No labels param");

      if (obj.id) self.pid = obj.id;

      obj.value.choices.forEach(l => {
        const choice = self.findLabel(l);

        window.A = choice;

        if (!choice) throw new Error("No label " + l);

        choice.setSelected(true);
      });
    },
  }));

const ChoicesModel = types.compose("ChoicesModel", Model, TagAttrs, SelectedModelMixin);

const HtxChoices = observer(({ item }) => {
  return (
    <div style={{ marginTop: "1em", marginBottom: "1em" }}>
      {item.showinline ? (
        <Form layout="horizontal" style={{ display: "flex" }}>
          {Tree.renderChildren(item)}
        </Form>
      ) : (
        <Form layout="vertical">{Tree.renderChildren(item)}</Form>
      )}
    </div>
  );
});

Registry.addTag("choices", ChoicesModel, HtxChoices);

export { HtxChoices, ChoicesModel, TagAttrs };
