import React, { Component } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { isHtx, cloneNode } from "../../core/Helpers";
import { guidGenerator } from "../../core/Helpers";
import { BrushRegionModel } from "../object/BrushRegion";

const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),
  strokeWidth: types.optional(types.number, 15),
});

const Model = types
  .model({
    id: types.identifier,
    type: "brush",
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }));

const BrushModel = types.compose(
  "BrushModel",
  TagAttrs,
  Model,
);

const HtxView = () => {
  return null;
};

Registry.addTag("brush", BrushModel, HtxView);

export { HtxView, BrushModel };
