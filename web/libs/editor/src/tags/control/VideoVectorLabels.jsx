import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import { VideoVectorModel } from "./VideoVector";
import ControlBase from "./Base";

/**
 * The `VideoVectorLabels` tag creates labeled vectors on video frames.
 * Combines VideoVector and Labels into one tag for convenient vector annotation.
 *
 * Use with the following data types: video.
 *
 * @example
 * <View>
 *   <Video name="video" value="$video" />
 *   <VideoVectorLabels name="labels" toName="video" closable={true}>
 *     <Label value="Road" />
 *     <Label value="Boundary" />
 *   </VideoVectorLabels>
 * </View>
 * @name VideoVectorLabels
 * @regions VideoVectorRegion
 * @meta_title VideoVectorLabels Tag for Video Vector Annotation
 * @meta_description Customize Label Studio with the VideoVectorLabels tag for labeled vector annotation on video.
 * @param {string} name Name of tag
 * @param {string} toName Name of video to label
 * @param {single|multiple=} [choice=single] Configure whether you can select one or multiple labels
 * @param {number} [maxUsages] Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true] Show labels in the same visual line
 * @param {number} [opacity=0.2] Opacity of vector
 * @param {string} [fillColor] Vector fill color in hexadecimal
 * @param {string} [strokeColor] Stroke color in hexadecimal
 * @param {number} [strokeWidth=1] Width of stroke
 * @param {boolean} [closable=false] Allow closed shapes
 * @param {boolean} [skeleton=false] Enables skeleton mode
 * @param {number|none} [minPoints=none] Minimum allowed number of points
 * @param {number|none} [maxPoints=none] Maximum allowed number of points
 */
const ModelAttrs = types.model("VideoVectorLabelsModel", {
  type: "videovectorlabels",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

const VideoVectorLabelsModel = types.compose(
  "VideoVectorLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  VideoVectorModel,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const HtxVideoVectorLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("videovectorlabels", VideoVectorLabelsModel, HtxVideoVectorLabels);

export { HtxVideoVectorLabels, VideoVectorLabelsModel };
