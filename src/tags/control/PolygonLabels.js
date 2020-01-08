import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels";
import { PolygonModel } from "./Polygon";
import { guidGenerator } from "../../core/Helpers";

/**
 * PolygonLabels tag, create labeled polygons
 * @example
 * <View>
 *   <Image name="image" value="$image"></Image>
 *   <PolygonLabels name="lables" toName="image">
 *     <Label value="Car"></Label>
 *     <Label value="Sign"></Label>
 *   </PolygonLabels>
 * </View>
 * @name PolygonLabels
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

const ModelAttrs = types.model("PolygonLabelsModel", {
  id: types.optional(types.identifier, guidGenerator),
  pid: types.optional(types.string, guidGenerator),
  type: "polygonlabels",
  children: Types.unionArray(["labels", "label", "choice"]),
});

const Model = LabelMixin.props({ _type: "polygonlabels" });

const Composition = types.compose(LabelsModel, ModelAttrs, PolygonModel, TagAttrs, Model, SelectedModelMixin);

const PolygonLabelsModel = types.compose("PolygonLabelsModel", Composition);

const HtxPolygonLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("polygonlabels", PolygonLabelsModel, HtxPolygonLabels);

export { HtxPolygonLabels, PolygonLabelsModel };
