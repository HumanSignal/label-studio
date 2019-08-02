import React, { Component } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType } from "mobx-state-tree";
import { Checkbox, Form } from "semantic-ui-react";

import { ChoicesModel } from "./Choices";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";

import ProcessAttrsMixin from "../mixins/ProcessAttrs";
import Hint from "../../components/Hint/Hint";
import ChoiceComponent from '../../components/Choice/Choice';

/**
 * Choice tag represents a single choice
 * @example
 * <View>
 *   <Choices name="gender" toName="txt-1" choice="single">
 *     <Choice alias="M" value="Male"></Choice>
 *     <Choice alias="F" value="Female"></Choice>
 *   </Choices>
 *   <Text name="txt-1" value="John went to see Marry"></Text>
 * </View>
 * @name Choice
 * @param {string} value label value
 * @param {boolean=} selected If this label should be preselected
 * @param {string=} alias label alias
 * @param {string=} hotkey hokey
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
    get isCheckbox() {
      const choice = getParentOfType(self, ChoicesModel).choice;
      return choice === "multiple" || choice === "single";
    },

    get name() {
      return getParentOfType(self, ChoicesModel).name;
    },
  }))
  .actions(self => ({
    toggleSelected() {
      const choice = getParentOfType(self, ChoicesModel);

      choice.shouldBeUnselected && choice.unselectAll();

      self.markSelected(!self.selected);
    },

    markSelected(val) {
      self.selected = val;
    },

    onHotKey() {
      return self.toggleSelected();
    },
  }));

const ChoiceModel = types.compose(
  "ChoiceModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

const HtxChoice = inject("store")(
  observer(({ item, store }) => {
    let style = {};

    if (item.style) style = Tree.cssConverter(item.style);

    if (item.isCheckbox) {
      const cStyle = Object.assign({ marginRight: "1em", display: "flex", alignItems: "center" }, style);

      return (
        <div style={cStyle}>
          <Checkbox
            name={item._value}
            label={item._value}
            onChange={ev => {
              item.toggleSelected();
            }}
            checked={item.selected}
          />
          {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && <Hint>[{item.hotkey}]</Hint>}
        </div>
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
          <Form.Radio
            label={label}
            value={item._value}
            style={{ display: "inline-block" }}
            checked={item.selected}
            onChange={ev => {
              item.toggleSelected();
            }}
          />
        </div>
      );
    }
    // return (
    //   <ChoiceComponent
    //     name={item._value}
    //     onChange={ev => {
    //       item.toggleSelected();
    //     }}
    //     hint={store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && `${item.hotkey}`}
    //     value={item._value}
    //     checked={item.selected}
    //   >
    //     {item._value}
    //   </ChoiceComponent>
    // );
  }),
);

Registry.addTag("choice", ChoiceModel, HtxChoice);

export { HtxChoice, ChoiceModel };
