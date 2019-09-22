import React, { Component } from "react";

import { observer } from "mobx-react";
import { types, getRoot } from "mobx-state-tree";

import { guidGenerator } from "../../core/Helpers";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import Types from "../../core/Types";

import SelectedModelMixin from "../mixins/SelectedModel";

import { Form } from "semantic-ui-react";
import { Select } from "antd";
const { Option } = Select;

/**
 * ChoiceCloud tag, create a group of choices, radio, or checkboxes. Shall
 * be used for a single or multi-class classification.
 * @example
 * <View>
 *   <ChoiceCloud name="gender" toName="txt-1" choice="single-radio">
 *     <Choice alias="M" value="Male"></Choice>
 *     <Choice alias="F" value="Female"></Choice>
 *   </ChoiceCloud>
 *   <Text name="txt-1" value="John went to see Marry"></Text>
 * </View>
 * @name ChoiceCloud
 * @param {string} name of the group
 * @param {string} toName name of the elements that you want to label
 * @param {single|single-radio|multiple=} [choice=single] single or multi-class
 * @param {boolean} showInline show items in the same visual line
 */
const TagAttrs = types.model({
  name: types.string,
  toname: types.maybeNull(types.string),
  showinline: types.optional(types.string, "false"),
  choice: types.optional(types.enumeration(["single", "single-radio", "multiple"]), "single"),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "choices",
    children: Types.unionArray(["choice"]),
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
        if (!choice) throw new Error("No label " + l);

        choice.markSelected(true);
      });
    },
  }));

const ChoiceCloudModel = types.compose(
  "ChoiceCloudModel",
  TagAttrs,
  Model,
  SelectedModelMixin,
);

/*const children = [];
for (let i = 10; i < 36; i++) {
  children.push(<Option key={i.toString(36) + i}>{i.toString(36) + i}</Option>);
}
function handleChange(value) {
  console.log(`selected ${value}`);
}*/

const HtxChoiceCloud = observer(({ item }) => {
  return (
    <div style={{ marginTop: "1em" }}>
      <Form>
        {item.showinline === "true" ? (
          <Form.Group inline style={{ flexWrap: "wrap" }}>
            {Tree.renderChildren(item)}
          </Form.Group>
        ) : (
          <Form.Group grouped>{Tree.renderChildren(item)}</Form.Group>
        )}
      </Form>

    </div>
  );
});

Registry.addTag("choicecloud", ChoiceCloudModel, HtxChoiceCloud);

export { HtxChoiceCloud, ChoiceCloudModel, TagAttrs };
