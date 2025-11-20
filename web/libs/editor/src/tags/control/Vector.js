import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { Hotkey } from "../../core/Hotkey";
import ControlBase from "./Base";
import { customTypes } from "../../core/CustomTypes";
import Types from "../../core/Types";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import SeparatedControlMixin from "../../mixins/SeparatedControlMixin";
import { ToolManagerMixin } from "../../mixins/ToolManagerMixin";

const hotkeys = Hotkey("Vectors");

/**
 * The `Vector` tag is used to add vectors to an image without selecting a label. This can be useful when you have only one label to assign to the vector. Use for image segmentation tasks.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for vector image segmentation -->
 * <View>
 *   <Vector name="line-1" toName="img-1" />
 *   <Image name="img-1" value="$img" />
 * </View>
 * @name Vector
 * @meta_title Vector Tag for Adding Vectors to Images
 * @meta_description Customize Label Studio with the Vector tag by adding vectors to images for segmentation machine learning and data science projects.
 * @param {string} name                           - Name of tag
 * @param {string} toname                         - Name of image to label
 * @param {number} [opacity=0.6]                  - Opacity of vector
 * @param {string} [fillColor=transparent]        - Vector fill color in hexadecimal or HTML color name
 * @param {string} [strokeColor=#f48a42]          - Stroke color in hexadecimal
 * @param {number} [strokeWidth=3]                - Width of stroke
 * @param {small|medium|large} [pointSize=small]  - Size of vector handle points
 * @param {rectangle|circle} [pointStyle=circle]  - Style of points
 * @param {boolean} [smart]                       - Show smart tool for interactive pre-annotations
 * @param {boolean} [smartOnly]                   - Only show smart tool for interactive pre-annotations
 * @param {pixel|none} [snap=none]                - Snap vector to image pixels
 * @param {boolean} [closable=false]              - Allow closed shapes
 * @param {boolean} [curves=false]                - Allow Bezier curves
 * @param {boolean} [skeleton=false]              - Enables skeleton mode to allow branch paths
 * @param {number|none} [minPoints=none]          - Minimum allowed number of points
 * @param {number|none} [maxPoints=none]          - Maximum allowed number of points
 * @param {number} [pointSizeEnabled=5]           - Size of a point in pixels when shape is selected
 * @param {number} [pointSizeDisabled=3]          - Size of a point in pixels when shape is not selected
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  opacity: types.optional(customTypes.range(), "0.2"),
  fillcolor: types.optional(customTypes.color, "#f48a42"),

  strokewidth: types.optional(types.string, "2"),
  strokecolor: types.optional(customTypes.color, "#f48a42"),

  snap: types.optional(types.string, "none"),

  pointsize: types.optional(types.string, "small"),
  pointstyle: types.optional(types.string, "circle"),

  closable: types.optional(types.maybeNull(types.boolean), false),
  curves: types.optional(types.maybeNull(types.boolean), false),
  minpoints: types.optional(types.maybeNull(types.string), null),
  maxpoints: types.optional(types.maybeNull(types.string), null),
  skeleton: types.optional(types.maybeNull(types.boolean), false),
  pointsizeenabled: types.optional(types.maybeNull(types.string), "5"),
  pointsizedisabled: types.optional(types.maybeNull(types.string), "3"),
});

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const Model = types
  .model({
    type: "vector",

    // regions: types.array(RectRegionModel),
    _value: types.optional(types.string, ""),
  })
  .volatile(() => ({
    toolNames: ["Vector"],
  }));

const VectorModel = types.compose(
  "VectorModel",
  ControlBase,
  AnnotationMixin,
  SeparatedControlMixin,
  TagAttrs,
  Validation,
  ToolManagerMixin,
  Model,
);

const HtxView = () => null;

Registry.addTag("vector", VectorModel, HtxView);

export { HtxView, VectorModel };
