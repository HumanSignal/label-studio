import React from "react";
import { Tag } from "antd";
import { observer, inject } from "mobx-react";
import { types, getParent } from "mobx-state-tree";

import Hint from "../../components/Hint/Hint";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";

/**
 * Shortcut tag can be used to define a shortcut, which adds a predefined object
 * @example
 * <View>
 *   <TextArea name="txt-1">
 *     <Shortcut alias="Silence" value="<SILENCE>" hotkey="ctrl+1"></Shortcut>
 *   </TextArea>
 * </View>
 * @name Shortcut
 * @param {string} value A value of the shortcut
 * @param {string} alias Shortcut alias
 * @param {string} hotkey Hotkey
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  alias: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "shortcut",
    _value: types.optional(types.string, ""),
  })
  .views(self => ({
    get hotkeyScope() {
      const p = getParent(getParent(self));
      return p.name;
    },
  }))
  .actions(self => ({
    onClick() {
      const p = getParent(getParent(self));

      if (p.onShortcut) p.onShortcut(self.value);
    },

    onHotKey() {
      return self.onClick();
    },
  }));

const ShortcutModel = types.compose("ShortcutModel", TagAttrs, Model, ProcessAttrsMixin);

const HtxShortcutView = inject("store")(
  observer(({ item, store }) => {
    const bg = {
      backgroundColor: item.selected ? item.background : "#e8e8e8",
      color: item.selected ? item.selectedcolor : "#333333",
      cursor: "pointer",
      margin: "5px",
    };

    return (
      <Tag
        onClick={ev => {
          item.onClick();
          return false;
        }}
        style={bg}
      >
        {item.alias ? item.alias : item._value}
        {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && <Hint>[{item.hotkey}]</Hint>}
      </Tag>
    );
  }),
);

Registry.addTag("shortcut", ShortcutModel, HtxShortcutView);

export { HtxShortcutView, ShortcutModel };
