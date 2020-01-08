import { observer, inject } from "mobx-react";
import { types, getRoot } from "mobx-state-tree";

import * as Tools from "../../tools";
import Registry from "../../core/Registry";

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

  strokewidth: types.optional(types.string, "3"),
  strokecolor: types.optional(types.string, "#f48a42"),

  pointsize: types.optional(types.string, "small"),
  pointstyle: types.optional(types.string, "circle"),
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
  .actions(self => ({
    getTools() {
      return Object.values(self.tools);
    },

    afterCreate() {
      const poly = Tools.Polygon.create();
      const floodFill = Tools.FloodFill.create();

      poly._control = self;
      floodFill._control = self;

      self.tools = {
        poly: poly,
        // floodfill: floodFill,
      };
    },
  }));

const PolygonModel = types.compose("PolygonModel", TagAttrs, Model);

const HtxView = inject("store")(
  observer(({ store, item }) => {
    return null;
  }),
);

Registry.addTag("polygon", PolygonModel, HtxView);

export { HtxView, PolygonModel };
