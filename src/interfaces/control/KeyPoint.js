import React, { Component } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";
import { Button, Icon } from "semantic-ui-react";

import Registry from "../../core/Registry";
import { isHtx, cloneNode } from "../../core/Helpers";
import { guidGenerator } from "../../core/Helpers";
import { KeyPointRegionModel } from "../object/KeyPointRegion";

/**
 * KeyPoint tag
 * KeyPoint is used to add a keypoint to an image
 * @example
 * <View>
 *   <KeyPoint name="kp-1" toName="img-1"></KeyPoint>
 *   <Image name="img-1" value="$img"></Image>
 * </View>
 * @name KeyPoint
 * @param {string} name name of the element
 * @param {string} toname name of the image to label
 * @param {float=} [opacity=0.6] opacity of keypoint
 * @param {string=} fillColor keypoint fill color, default is transparent
 * @param {number=} [strokeWidth=1] width of the stroke
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  opacity: types.optional(types.string, "0.9"),
  fillcolor: types.optional(types.string, "#8bad00"),

  strokewidth: types.optional(types.string, "1"),
});

const Model = types
  .model({
    id: types.identifier,
    type: "keypoint",
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
    fromStateJSON(obj) {},
  }));

const KeyPointModel = types.compose(
  "KeyPointModel",
  TagAttrs,
  Model,
);

const HtxView = () => {
  return null;
};

Registry.addTag("keypoint", KeyPointModel, HtxView);

export { HtxView, KeyPointModel };
