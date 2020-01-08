import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels";
import { KeyPointModel } from "./KeyPoint";
import { guidGenerator } from "../../core/Helpers";

/**
 * KeyPointLabels tag
 * KeyPointLabels tag creates labeled keypoints
 * @example
 * <View>
 *   <KeyPointLabels name="kp-1" toName="img-1">
 *     <Label value="Face"></Label>
 *     <Label value="Nose"></Label>
 *   </KeyPointLabels>
 *   <Image name="img-1" value="$img"></Image>
 * </View>
 * @name KeyPointLabels
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
  .model("KeyPointLabelesModel", {
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

const Model = LabelMixin.props({ _type: "keypointlabels" }).views(self => ({
  get shouldBeUnselected() {
    return self.choice === "single";
  },
}));

const Composition = types.compose(LabelsModel, ModelAttrs, KeyPointModel, TagAttrs, Model, SelectedModelMixin);

const KeyPointLabelsModel = types.compose("KeyPointLabelsModel", Composition);

const HtxKeyPointLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("keypointlabels", KeyPointLabelsModel, HtxKeyPointLabels);

export { HtxKeyPointLabels, KeyPointLabelsModel };
