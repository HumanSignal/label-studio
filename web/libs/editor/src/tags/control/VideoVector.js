import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";
import ControlBase from "./Base";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import SeparatedControlMixin from "../../mixins/SeparatedControlMixin";
import { ToolManagerMixin } from "../../mixins/ToolManagerMixin";
import { customTypes } from "../../core/CustomTypes";

/**
 * VideoVector tag brings vector annotation capabilities to videos.
 * It works in combination with the `<Video/>` and the `<Labels/>` tags.
 * Supports bezier curves, closable paths, and skeleton mode with
 * keyframe-based interpolation across video frames.
 *
 * Use with the following data types: video
 * @example
 * <!--Video Vector Annotation-->
 * <View>
 *   <Header>Label the video:</Header>
 *   <Video name="video" value="$video" />
 *   <VideoVector name="vector" toName="video" />
 *
 *   <Labels name="videoLabels" toName="video">
 *     <Label value="Road" background="#944BFF"/>
 *     <Label value="Boundary" background="#98C84E"/>
 *   </Labels>
 * </View>
 * @name VideoVector
 * @meta_title VideoVector Tag for Video Vector Annotation
 * @meta_description Customize Label Studio with the VideoVector tag for vector annotation on video frames.
 * @param {string} name Name of the element
 * @param {string} toName Name of the element to control (video)
 * @param {number} [opacity=0.6] Opacity of vector
 * @param {string} [fillColor=transparent] Vector fill color in hexadecimal or HTML color name
 * @param {string} [strokeColor=#f48a42] Stroke color in hexadecimal
 * @param {number} [strokeWidth=3] Width of stroke
 * @param {boolean} [closable=false] Allow closed shapes
 * @param {boolean} [curves=false] Allow Bezier curves
 * @param {boolean} [skeleton=false] Enables skeleton mode to allow branch paths
 * @param {number|none} [minPoints=none] Minimum allowed number of points
 * @param {number|none} [maxPoints=none] Maximum allowed number of points
 * @param {pixel|none} [snap=none] Snap vector to image pixels
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  opacity: types.optional(customTypes.range(), "0.2"),
  fillcolor: types.optional(customTypes.color, "#f48a42"),

  strokewidth: types.optional(types.string, "2"),
  strokecolor: types.optional(customTypes.color, "#f48a42"),

  snap: types.optional(types.string, "none"),

  closable: types.optional(types.maybeNull(types.boolean), false),
  curves: types.optional(types.maybeNull(types.boolean), false),
  minpoints: types.optional(types.maybeNull(types.string), null),
  maxpoints: types.optional(types.maybeNull(types.string), null),
  skeleton: types.optional(types.maybeNull(types.boolean), false),
  pointsizeenabled: types.optional(types.maybeNull(types.string), "5"),
  pointsizedisabled: types.optional(types.maybeNull(types.string), "3"),
});

const ModelAttrs = types.model("VideoVectorModel", {
  pid: types.optional(types.string, guidGenerator),
  type: "videovector",
  _value: types.optional(types.string, ""),
}).volatile(() => ({
  toolNames: ["VideoVector"],
}));

const VideoVectorModel = types.compose(
  "VideoVectorModel",
  ControlBase,
  AnnotationMixin,
  SeparatedControlMixin,
  TagAttrs,
  ToolManagerMixin,
  ModelAttrs,
);

const HtxVideoVector = observer(() => {
  return null;
});

Registry.addTag("videovector", VideoVectorModel, HtxVideoVector);

export { HtxVideoVector, VideoVectorModel };
