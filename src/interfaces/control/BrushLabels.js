import { observer } from "mobx-react";
import React, { Component } from "react";

import { types } from "mobx-state-tree";

import Types from "../../core/Types";
import Registry from "../../core/Registry";

import { guidGenerator } from "../../core/Helpers";
import SelectedModelMixin from "../mixins/SelectedModel";
import { HtxLabels, LabelsModel } from "./Labels";
import { BrushModel } from "./Brush";
import LabelMixin from "../mixins/LabelMixin";

const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),
});

const ModelAttrs = types.model("BrushLabelsModel", {
  id: types.optional(types.identifier, guidGenerator),
  pid: types.optional(types.string, guidGenerator),
  type: "brushlabels",
  children: Types.unionArray(["labels", "label", "choice"]),
});

const Model = LabelMixin.props({ _type: "brushlabels" }).views(self => ({
  get shouldBeUnselected() {
    return self.choice === "single";
  },
}));

const Composition = types.compose(
  LabelsModel,
  ModelAttrs,
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
