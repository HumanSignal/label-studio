import React, { Component } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { isHtx, cloneNode } from "../../core/Helpers";
import { guidGenerator } from "../../core/Helpers";
import { BrushRegionModel } from "../region/BrushRegion";

import * as Tools from "../tools";

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
  }))
  .actions(self => ({
    getTools() {
      return Object.values(self.tools);
    },

    afterCreate() {
      const brush = Tools.Brush.create();
      const erase = Tools.Erase.create();

      brush._control = self;
      erase._control = self;

      self.tools = {
        brush: brush,
        erase: erase,
      };
    },
  }));

const BrushModel = types.compose("BrushModel", TagAttrs, Model);

const HtxView = () => {
  return null;
};

Registry.addTag("brush", BrushModel, HtxView);

export { HtxView, BrushModel };
