import React from "react";
import { observer, inject } from "mobx-react";
import { types } from "mobx-state-tree";
import { Tag } from "antd";

import { guidGenerator } from "../../core/Helpers";
import Utils from "../../utils";
import Registry from "../../core/Registry";
import Types from "../../core/Types";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";
import Hint from "../../components/Hint/Hint";

/**
 * Label tag represents a single label
 * @example
 * <View>
 *   <Labels name="type" toName="txt-1">
 *     <Label alias="B" value="Brand"></Label>
 *     <Label alias="P" value="Product"></Label>
 *   </Labels>
 *   <Text name="txt-1" value="$text"></Text>
 * </View>
 * @name Label
 * @param {string} value A value of the label
 * @param {boolean} selected If this label should be preselected
 * @param {string} alias Label alias
 * @param {string} hotkey Hotkey
 * @param {boolean} showalias Show alias inside label text
 * @param {string} aliasstyle Alias CSS style default=opacity: 0.6
 * @param {string} size Size of text in the label
 * @param {string} background The background color of active label
 * @param {string} selectedColor Color of text in an active label
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  selected: types.optional(types.boolean, false),
  alias: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
  showalias: types.optional(types.string, "false"),
  aliasstyle: types.optional(types.string, "opacity: 0.6"),
  size: types.optional(types.string, "medium"),
  background: types.optional(types.string, "#36B37E"),
  selectedcolor: types.optional(types.string, "white"),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "label",
    _value: types.optional(types.string, ""),
  })
  .actions(self => ({
    toggleSelected() {
      const sel = self.selected;

      const labels = Types.getParentOfTypeString(self, ["LabelsModel", "RectangleLabelsModel", "PolygonLabelsModel"]);
      labels.shouldBeUnselected && labels.unselectAll();

      if (labels.shouldBeUnselected && sel === true) {
      } else {
        self.selected = !self.selected;
      }
    },

    markSelected(val) {
      self.selected = val;
    },

    onHotKey() {
      return self.toggleSelected();
    },
  }));

const LabelModel = types.compose(
  "LabelModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

const HtxLabelView = inject("store")(
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
          item.toggleSelected();
          return false;
        }}
        style={bg}
        size={item.size}
      >
        {item._value}
        {item.showalias === "true" && item.alias && (
          <span style={Utils.styleToProp(item.aliasstyle)}>&nbsp;{item.alias}</span>
        )}
        {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && <Hint>[{item.hotkey}]</Hint>}
      </Tag>
    );
  }),
);

Registry.addTag("label", LabelModel, HtxLabelView);

export { HtxLabelView, LabelModel };
