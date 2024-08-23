import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";
import SelectedModelMixin from "../../mixins/SelectedModel";
import ControlBase from "./Base";
import { HtxLabels, LabelsModel } from "./Labels/Labels";

/**
 * TimelineLabels tag allows to classify parts of the video or even a single frames. It works in combination with the `<Video/>` tag.
 *
 * Use with the following data types: video
 * @example
 * <View>
 *   <Header>Mark parts on the video:</Header>
 *   <Video name="video" value="$video" />
 *   <TimelineLabels name="timelineLabels" toName="video">
 *     <Label value="Nothing" background="#944BFF"/>
 *     <Label value="Movement" background="#98C84E"/>
 *   </TimelineLabels>
 * </View>
 * @name TimelineLabels
 * @regions TimelineRegion
 * @meta_title Video Tag for Video Labeling
 * @meta_description Customize Label Studio with the Video tag for basic video annotation tasks for machine learning and data science projects.
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
