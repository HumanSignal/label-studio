import React, { Component } from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Tree from "../../core/Tree";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels";
import { PolygonModel } from "./Polygon";
import { guidGenerator } from "../../core/Helpers";

/**
 * ImageRegionsLabels tag, create labeled polygons
 * @example
 * <View>
 *   <Image name="image" value="$image"></Image>
 *   <ImageRegionsLabels name="lables" toName="image">
 *     <Label value="Car"></Label>
 *     <Label value="Sign"></Label>
 *   </ImageRegionsLabels>
 * </View>
 * @name ImageRegionsLabels
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
});

const Model = types
  .model("ImageRegionsLabelsModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "imageregionslabels",
    children: Types.unionArray(["labels", "label", "choice"]),
  })
  .actions(self => ({
    fromStateJSON(obj, fromModel) {
      self.unselectAll();

      if (!obj.value.imageregionslabels) throw new Error("No labels param");

      if (obj.id) self.pid = obj.id;

      obj.value.imageregionslabels.forEach(l => {
        const label = self.findLabel(l);
        if (!label) throw new Error("No label " + obj.value.label);

        label.setSelected(true);
      });
    },
  }));

const Composition = types.compose(LabelsModel, PolygonModel, TagAttrs, Model, SelectedModelMixin);
const ImageRegionsLabelsModel = types.compose("ImageRegionsLabelsModel", Composition);

const HtxImageRegionsLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("imageregionslabels", ImageRegionsLabelsModel, HtxImageRegionsLabels);

export { HtxImageRegionsLabels, ImageRegionsLabelsModel };
