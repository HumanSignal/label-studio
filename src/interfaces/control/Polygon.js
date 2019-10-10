import React, { Component } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { isHtx, cloneNode } from "../../core/Helpers";
import { guidGenerator } from "../../core/Helpers";
import { PolygonRegionModel } from "../object/PolygonRegion";

/**
 * Polygon tag
 * Polygon is used to add polygons to an image
 * @example
 * <View>
 *   <Polygon name="rect-1" toName="img-1" value="Add Rectangle"></Polygon>
 *   <Image name="img-1" value="$img"></Image>
 * </View>
 * @name Polygon
 * @param {string} name name of tag
 * @param {string} toname name of image to label
 * @param {number=} [opacity=0.6] opacity of polygon
 * @param {string=} fillColor rectangle fill color, default is transparent
 * @param {string=} strokeColor stroke color
 * @param {number=} [strokeWidth=1] width of stroke
 * @param {small|medium|large=} [pointSize=medium] size of polygon handle points
 * @param {rectangle|circle=} [pointStyle=rectangle] style of points
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  opacity: types.optional(types.string, "0.6"),
  fillcolor: types.maybeNull(types.string),

  strokewidth: types.optional(types.string, "1"),
  strokecolor: types.optional(types.string, "#f48a42"),

  pointsize: types.optional(types.string, "medium"),
  pointstyle: types.optional(types.string, "rectangle"),
});

const Model = types
  .model({
    id: types.identifier,
    type: "polygon",

    // regions: types.array(RectRegionModel),
    _value: types.optional(types.string, ""),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    states() {
      return self.completion.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();
      return states ? states.filter(c => c.isSelected === true) : null;
    },
  }))
  .actions(self => ({}));

const PolygonModel = types.compose(
  "PolygonModel",
  TagAttrs,
  Model,
);

const HtxView = inject("store")(
  observer(({ store, item }) => {
    return null;
  }),
);

Registry.addTag("polygon", PolygonModel, HtxView);

export { HtxView, PolygonModel };
