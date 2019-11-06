import React, { Component } from "react";

import { observer } from "mobx-react";
import { types, getRoot } from "mobx-state-tree";

import Types from "../../core/Types";
import Registry from "../../core/Registry";

import { guidGenerator } from "../../core/Helpers";
import SelectedModelMixin from "../mixins/SelectedModel";

import { HtxLabels, LabelsModel } from "./Labels";
import { BrushModel } from "./Brush";

const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  opacity: types.optional(types.string, "0.9"),
  fillcolor: types.maybeNull(types.string),

  strokewidth: types.optional(types.string, "1"),
});

const Model = types
  .model("BrushLabelesModel", {
    id: types.identifier,
    pid: types.optional(types.string, guidGenerator),
    type: "brushlabels",
    children: Types.unionArray(["labels", "label", "choice"]),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    fromStateJSON(obj, fromModel) {
      self.unselectAll();

      if (!obj.value.brushlabels) throw new Error("No labels param");

      if (obj.id) self.pid = obj.id;

      obj.value.brushlabels.forEach(l => {
        const label = self.findLabel(l);

        if (!label) throw new Error("No label " + obj.value.label);

        label.markSelected(true);
      });
    },
  }));

const Composition = types.compose(
  LabelsModel,
  BrushModel,
  TagAttrs,
  Model,
  SelectedModelMixin,
);

const BrushLabelsModel = types.compose(
  "BrushLabelsModel",
  Composition,
);

const HtxBrushLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("brushlabels", BrushLabelsModel, HtxBrushLabels);

export { HtxBrushLabels, BrushLabelsModel };
