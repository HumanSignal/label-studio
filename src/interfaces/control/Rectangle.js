import React, { Component } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { isHtx, cloneNode } from "../../core/Helpers";
import { guidGenerator } from "../../core/Helpers";
import { RectRegionModel } from "../object/RectRegion";

/**
 * Rectangle
 * Rectangle is used to add rectangle (Bounding Box) to an image
 * @example
 * <View>
 *   <Rectangle name="rect-1" toName="img-1"></Rectangle>
 *   <Image name="img-1" value="$img"></Image>
 * </View>
 * @name Rectangle
 * @param {string} name name of the element
 * @param {string} toname name of the image to label
 * @param {float=} [opacity=0.6] opacity of rectangle
 * @param {string=} fillColor rectangle fill color, default is transparent
 * @param {string=} [strokeColor=#f48a42] stroke color
 * @param {number=} [strokeWidth=1] width of the stroke
 * @param {boolean=} [canRotate=true] show or hide rotation handle
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  opacity: types.optional(types.string, "0.6"),
  fillcolor: types.maybeNull(types.string),

  strokeWidth: types.optional(types.number, 1),
  strokeColor: types.optional(types.string, "#f48a42"),

  canrotate: types.optional(types.boolean, true),
});

const Model = types
  .model({
    id: types.identifier,
    type: "rectangle",
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

const RectangleModel = types.compose(
  "RectangleModel",
  TagAttrs,
  Model,
);

const HtxView = () => {
  return null;
};

Registry.addTag("rectangle", RectangleModel, HtxView);

export { HtxView, RectangleModel };
