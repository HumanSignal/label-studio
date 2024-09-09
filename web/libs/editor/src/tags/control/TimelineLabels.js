import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";
import SelectedModelMixin from "../../mixins/SelectedModel";
import ControlBase from "./Base";
import { HtxLabels, LabelsModel } from "./Labels/Labels";

/**
 * Use the TimelineLabels tag to classify video frames. This can be a single frame or a span of frames.
 *
 * First, select a label and then click once to annotate a single frame. Click and drag to annotate multiple frames.
 *
 * ![Screenshot of video with frame classification](../images/timelinelabels.png)
 *
 * Use with the `<Video>` control tag.
 *
 * !!! info Tip
 *     You can increase the height of the timeline using the `timelineHeight` parameter on the `<Video>` tag.
 *
 * @example
 * <View>
 *   <Header>Label timeline spans:</Header>
 *   <Video name="video" value="$video" />
 *   <TimelineLabels name="timelineLabels" toName="video">
 *     <Label value="Nothing" background="#944BFF"/>
 *     <Label value="Movement" background="#98C84E"/>
 *   </TimelineLabels>
 * </View>
 * @name TimelineLabels
 * @regions TimelineRegion
 * @meta_title TimelineLabels tag
 * @meta_description Classify video frames using TimelineLabels.
 * @param {string} name Name of the element
 * @param {string} toName Name of the video element
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),
});

const ModelAttrs = types.model("TimelineLabelsModel", {
  pid: types.optional(types.string, guidGenerator),
  type: "timelinelabels",
});

const TimelineLabelsModel = types.compose(
  "TimelineLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  TagAttrs,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const HtxTimelineLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("timelinelabels", TimelineLabelsModel, HtxTimelineLabels);

export { HtxTimelineLabels, TimelineLabelsModel };
