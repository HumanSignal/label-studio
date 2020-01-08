import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels";
import { guidGenerator } from "../../core/Helpers";

/**
 * HyperTextLabels tag
 * HyperTextLabels tag creates labeled keypoints
 * @example
 * <View>
 *   <HyperTextLabels name="kp-1" toName="img-1">
 *     <Label value="Face"></Label>
 *     <Label value="Nose"></Label>
 *   </HyperTextLabels>
 *   <HyperText name="img-1" value="$img"></HyperText>
 * </View>
 * @name HyperTextLabels
 * @param {string} name name of the element
 * @param {string} toname name of the image to label
 * @param {float=} [opacity=0.9] opacity of keypoint
 * @param {string=} fillColor keypoint fill color, default is transparent
 * @param {number=} [strokeWidth=1] width of the stroke
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  opacity: types.optional(types.string, "0.9"),
  fillcolor: types.maybeNull(types.string),

  strokewidth: types.optional(types.string, "1"),
});

const ModelAttrs = types
  .model("HyperTextLabelesModel", {
    id: types.identifier,
    pid: types.optional(types.string, guidGenerator),
    type: "keypointlabels",
    children: Types.unionArray(["labels", "label", "choice"]),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },
  }));

const Model = LabelMixin.props({ _type: "htmllabels" }).views(self => ({
  get shouldBeUnselected() {
    return self.choice === "single";
  },
}));

const Composition = types.compose(LabelsModel, ModelAttrs, TagAttrs, Model, SelectedModelMixin);

const HyperTextLabelsModel = types.compose("HyperTextLabelsModel", Composition);

const HtxHyperTextLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("hypertextlabels", HyperTextLabelsModel, HtxHyperTextLabels);

export { HtxHyperTextLabels, HyperTextLabelsModel };
