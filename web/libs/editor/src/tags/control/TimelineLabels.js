import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";
import SelectedModelMixin from "../../mixins/SelectedModel";
import ControlBase from "./Base";
import { HtxLabels, LabelsModel } from "./Labels/Labels";

/**
 * @todo rewrite this
 * TimelineLabels tag brings Object Tracking capabilities to videos. It works in combination with the `<Video/>` and the `<Labels/>` tags.
 *
 * Use with the following data types: video
 * @example
 * <View>
 *   <Header>Label states on the video:</Header>
 *   <Video name="video" value="$video" />
 *   <TimelineLabels name="timelineLabels" toName="video">
 *     <Label value="Nothing" background="#944BFF"/>
 *     <Label value="Movement" background="#98C84E"/>
 *   </Labels>
 * </View>
 * @name TimelineLabels
 * @meta_title Video Tag for Video Labeling
 * @meta_description Customize Label Studio with the Video tag for basic video annotation tasks for machine learning and data science projects.
 * @param {string} name Name of the element
 * @param {string} toName Name of the element to control (video)
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
