import React from "react";
import { observer } from "mobx-react";
import { types, getRoot } from "mobx-state-tree";

import InfoModal from "../../components/Infomodal/Infomodal";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import Types from "../../core/Types";
import { runTemplate } from "../../core/Template";

/**
 * Pairwise element. Compare two different objects, works with any label studio object
 * @example
 * <View>
 *   <Pairwise name="pairwise" leftClass="text1" rightClass="text2" toName="txt-1,txt-2"></Pairwise>
 *   <Text name="txt-1" value="Text 1" />
 *   <Text name="txt-2" value="Text 2" />
 * </View>
 * @example
 * You can also style the appearence using the View tag:
 * <View>
 *   <Pairwise name="pw" toName="txt-1,txt-2"></Pairwise>
 *   <View style="display: flex;">
 *     <View style="margin-right: 1em;"><Text name="txt-1" value="$text1" /></View>
 *     <View><Text name="txt-2" value="$text2" /></View>
 *   </View>
 * </View>
 * @name Pairwise
 * @param {string} selectionStyle style of the selection
 * @params {string} leftClass class name of the left object
 * @params {string} rightClass class name of the right object
 */
const TagAttrs = types.model({
  name: types.string,
  toname: types.maybeNull(types.string),
  selectionstyle: types.maybeNull(types.string),
  leftclass: types.optional(types.string, "left"),
  rightclass: types.optional(types.string, "right"),
});

const Model = types
  .model({
    id: types.identifier,
    type: "pairwise",
    selected: types.maybeNull(types.enumeration(["left", "right", "none"])),
  })
  .views(self => ({
    get completion() {
      return Types.getParentOfTypeString(self, "Completion");
    },
  }))
  .actions(self => ({
    selectLeft() {
      self.selected === "left" ? (self.selected = "none") : (self.selected = "left");
    },

    selectRight() {
      self.selected === "right" ? (self.selected = "none") : (self.selected = "right");
    },

    afterCreate() {
      let selection = {};
      if (self.selectionstyle) {
        const s = Tree.cssConverter(self.selectionstyle);
        for (let key in s) {
          selection[key] = s[key];
        }
      } else {
        selection = {
          backgroundColor: "#f6ffed",
          border: "1px solid #b7eb8f",
        };
      }

      self._selection = selection;
    },

    getLeftRight() {
      if (!self.toname);
      const names = self.toname.split(",");

      if (names.length != 2)
        InfoModal.error(
          `Incorrect toName parameter on Pairwise, should be two names separated by the comma: name1,name2`,
        );

      const left = self.completion.names.get(names[0]);
      const right = self.completion.names.get(names[1]);

      return { left: left, right: right };
    },

    completionAttached() {
      const { left, right } = self.getLeftRight();

      left.addProp("onClick", () => {
        self.selectLeft();
        left.addProp("style", self._selection);
        right.addProp("style", {});
      });

      right.addProp("onClick", () => {
        self.selectRight();
        right.addProp("style", self._selection);
        left.addProp("style", {});
      });
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

      const { left, right } = self.getLeftRight();

      if (self.selected == "left") left.addProp("style", self._selection);
      if (self.selected == "right") right.addProp("style", self._selection);
    },
  }));

const PairwiseModel = types.compose("PairwiseModel", TagAttrs, Model);

const HtxPairwise = () => {
  return null;
};

Registry.addTag("pairwise", PairwiseModel, HtxPairwise);

export { HtxPairwise, PairwiseModel };
