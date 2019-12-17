import React from "react";
import { types, getEnv, getRoot, flow, getParentOfType } from "mobx-state-tree";
import { observer, Provider } from "mobx-react";

import Tree from "../../core/Tree";
import { runTemplate } from "../../core/Template";

import Registry from "../../core/Registry";
import Types from "../../core/Types";

/**
 * Pairwise element. Compare two different objects, works with any label studio object
 * @example
 * <Pairwise name="pairwise" leftClass="text1" rightClass="text2">
 *   <Text name="txt-1" value="Text 1" />
 *   <Text name="txt-2" value="Text 2" />
 * </Pairwise>
 * @name Pairwise
 * @param {string} style css style string
 * @param {string} selectedStyle style of the selected object
 * @params {string} leftClass class name of the left object
 * @params {string} rightClass class name of the right object
 */
const TagAttrs = types.model({
  name: types.string,
  // toname: types.maybeNull(types.string),
  style: types.maybeNull(types.string),
  leftclass: types.optional(types.string, "left"),
  rightclass: types.optional(types.string, "right"),
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
      "text",
      "audio",
      "image",
      "hypertext",
      "audioplus",
      "list",
      "dialog",
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
      const store = getRoot(self);
      let choice = self.selected === "left" ? self.leftclass : self.selected === "right" ? self.rightclass : null;
      if (choice !== null) choice = [runTemplate(choice, store.task.dataObj)];

      return {
        id: self.pid,
        from_name: self.name,
        to_name: self.name,
        type: "pairwise",
        value: {
          selected: self.selected,
          pairwise: choice,
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
