import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels";
import { RectangleModel } from "./Rectangle";
import { guidGenerator } from "../../core/Helpers";

/**
 * RectangleLabels tag creates labeled rectangles
 * Used only for Image
 * @example
 * <View>
 *   <RectangleLabels name="labels" toName="image">
 *     <Label value="Person"></Label>
 *     <Label value="Animal"></Label>
 *   </RectangleLabels>
 *   <Image name="image" value="$image"></Image>
 * </View>
 * @name RectangleLabels
 * @param {string} name name of the element
 * @param {string} toname name of the image to label
 * @param {float=} [opacity=0.6] opacity of rectangle
 * @param {string=} fillColor rectangle fill color, default is transparent
 * @param {string=} strokeColor stroke color
 * @param {number=} [strokeWidth=1] width of stroke
 * @param {boolean=} [canRotate=true] show or hide rotation handle
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),
});

const ModelAttrs = types.model("RectangleLabelsModel", {
  id: types.optional(types.identifier, guidGenerator),
  pid: types.optional(types.string, guidGenerator),
  type: "rectanglelabels",
  children: Types.unionArray(["labels", "label", "choice"]),
});

const Model = LabelMixin.props({ _type: "rectanglelabels" }).views(self => ({
  get shouldBeUnselected() {
    return self.choice === "single";
  },
}));

const Composition = types.compose(LabelsModel, ModelAttrs, RectangleModel, TagAttrs, Model, SelectedModelMixin);

const RectangleLabelsModel = types.compose("RectangleLabelsModel", Composition);

const HtxRectangleLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("rectanglelabels", RectangleLabelsModel, HtxRectangleLabels);

export { HtxRectangleLabels, RectangleLabelsModel };
