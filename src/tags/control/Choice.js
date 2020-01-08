import React from "react";
import { Checkbox, Radio, Form } from "antd";
import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import Hint from "../../components/Hint/Hint";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import { ChoicesModel } from "./Choices";

/**
 * Choice tag represents a single choice
 *
 * @example
 * <View>
 *   <Choices name="gender" toName="txt-1" choice="single">
 *     <Choice value="Male"></Choice>
 *     <Choice value="Female"></Choice>
 *   </Choices>
 *   <Text name="txt-1" value="John went to see Marry"></Text>
 * </View>
 * @name Choice
 * @param {string} value lLbel value
 * @param {boolean} selected If this label should be preselected
 * @param {string} hotkey HotKey
 */
const TagAttrs = types.model({
  selected: types.optional(types.boolean, false),
  alias: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
  style: types.maybeNull(types.string),
});

const Model = types
  .model({
    type: "choice",
    _value: types.optional(types.string, ""),
  })
  .views(self => ({
    get typeOfChoice() {
      const choice = getParentOfType(self, ChoicesModel).choice;

      return choice;
    },

    get isCheckbox() {
      const choice = getParentOfType(self, ChoicesModel).choice;
      return choice === "multiple" || choice === "single";
    },

    get name() {
      return getParentOfType(self, ChoicesModel).name;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    toggleSelected() {
      const choice = getParentOfType(self, ChoicesModel);

      choice.shouldBeUnselected && choice.unselectAll();

      self.setSelected(!self.selected);
    },

    setSelected(val) {
      self.selected = val;
    },

    onHotKey() {
      return self.toggleSelected();
    },
  }));

const ChoiceModel = types.compose("ChoiceModel", TagAttrs, Model, ProcessAttrsMixin);

const HtxChoice = inject("store")(
  observer(({ item, store }) => {
    let style = {};

    if (item.style) style = Tree.cssConverter(item.style);

    if (item.isCheckbox) {
      const cStyle = Object.assign({ display: "flex", alignItems: "center", marginBottom: 0 }, style);

      return (
        <Form.Item style={cStyle}>
          <Checkbox
            name={item._value}
            onChange={ev => {
              if (!item.completion.edittable) return;

              item.toggleSelected();
            }}
            checked={item.selected}
          >
            {item._value}
            {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && (
              <Hint>[{item.hotkey}]</Hint>
            )}
          </Checkbox>
        </Form.Item>
      );
    } else {
      const label = (
        <label>
          {item._value}
          {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && <Hint>[{item.hotkey}]</Hint>}
        </label>
      );

      return (
        <div style={style}>
          <Radio
            value={item._value}
            style={{ display: "inline-block", marginBottom: "0.5em" }}
            checked={item.selected}
            onChange={ev => {
              if (!item.completion.edittable) return;

              item.toggleSelected();
            }}
          >
            {label}
          </Radio>
        </div>
      );
    }
  }),
);

Registry.addTag("choice", ChoiceModel, HtxChoice);

export { HtxChoice, ChoiceModel };
