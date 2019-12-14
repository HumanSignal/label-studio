import React from "react";
import { types, getEnv, flow, getParentOfType } from "mobx-state-tree";
import { observer, Provider } from "mobx-react";

import Tree from "../../core/Tree";

import Registry from "../../core/Registry";
import Types from "../../core/Types";

/**
 * Pairwise element. Compare two different objects, works with any label studio object
 * @example
 * <Pairwise name="pairwise">
 *   <Text name="txt-1" value="Text 1" />
 *   <Text name="txt-2" value="Text 2" />
 * </Pairwise>
 * @name Pairwise
 * @param {style} style css style string
 * @param {selectedStyle} style of the selected object
 */
const TagAttrs = types.model({
  name: types.string,
  style: types.maybeNull(types.string),
  selectedstyle: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.identifier,
    type: "pairwise",
    children: Types.unionArray([
      "view",
      "header",
      "table",
      "choices",
      "rating",
      "text",
      "audio",
      "image",
      "hypertext",
      "audioplus",
      "list",
      "dialog",
      "textarea",
    ]),
    selected: types.maybeNull(types.enumeration(["left", "right", "none"])),
  })
  .actions(self => ({
    selectLeft() {
      self.selected == "left" ? (self.selected = "none") : (self.selected = "left");
    },

    selectRight() {
      self.selected == "right" ? (self.selected = "none") : (self.selected = "right");
    },

    toStateJSON() {
      return {
        id: self.pid,
        from_name: self.name,
        to_name: self.name,
        type: self.type,
        value: {
          selected: self.selected,
        },
      };
    },

    fromStateJSON(obj, fromModel) {
      if (obj.id) self.pid = obj.id;
      self.selected = obj.value.selected;
    },
  }));

const PairwiseModel = types.compose("PairwiseModel", TagAttrs, Model);

const HtxPairwise = observer(({ item }) => {
  const styleLeft = { width: "49%", marginRight: "2%" };
  const styleRight = { width: "49%" };

  const addSelection = obj => {
    if (item.selectedstyle) {
      const s = Tree.cssConverter(item.selectedstyle);
      for (let key in s) {
        obj[key] = s[key];
      }
    } else {
      obj["backgroundColor"] = "#faffaf";
      obj["border"] = "2px solid #439620";
    }
  };

  if (item.selected == "left") addSelection(styleLeft);

  if (item.selected == "right") addSelection(styleRight);

  const style = Tree.cssConverter(item.style) || { display: "flex" };

  return (
    <div style={style}>
      <div style={styleLeft} onClick={item.selectLeft}>
        {Tree.renderItem(item.children[0])}
      </div>
      <div style={styleRight} onClick={item.selectRight}>
        {Tree.renderItem(item.children[1])}
      </div>
    </div>
  );
});

Registry.addTag("pairwise", PairwiseModel, HtxPairwise);

export { HtxPairwise, PairwiseModel };
