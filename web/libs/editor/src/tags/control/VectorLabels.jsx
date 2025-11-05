import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import { VectorModel } from "./Vector";
import ControlBase from "./Base";

/**
 * The `VectorLabels` tag is used to create labeled vectors. Use to apply labels to vectors in semantic segmentation tasks.
 *
 * Use with the following data types: image.
 *
 * ## Key Features
 *
 * ### Point Management
 * - **Add Points**: Click on empty space, Shift+click on path segments
 * - **Edit Points**: Drag to reposition, Shift+click to convert regular ↔ bezier
 * - **Delete Points**: Alt+click on existing points
 * - **Multi-Selection**: Select multiple points for batch transformations
 * - **Break Closed Path**: Alt+click on any segment of a closed path to break it at that specific segment
 *
 * ### Bezier Curves
 * - **Create**: Drag while adding points or convert existing points
 * - **Edit**: Drag control points, disconnect/reconnect control handles
 * - **Control**: `curves` prop to enable/disable bezier functionality
 *
 * ## Keyboard Shortcuts & Hotkeys
 *
 * ### Point Creation & Editing
 * - **Click**: Add new point in drawing mode
 * - **Shift + Click** on a segment: Add point on path segment (insert between existing points)
 * - **Shift + Drag**: Create bezier point with control handles
 * - **Shift + Click** on a point: Convert point between regular ↔ bezier
 * - **Alt + Click** on a segment: Break closed path at segment (when path is closed)
 *
 * ### Point Selection
 * - **Click**: Select single point
 * - **Cmd/Ctrl + Click**: Add point to multi-selection
 * - **Cmd/Ctrl + Click on shape**: Select all points in the path
 * - **Cmd/Ctrl + Click on point**: Toggle point selection in multi-selection
 *
 * ### Path Management
 * - **Click on first/last point**: Close path bidirectionally (first→last or last→first)
 * - **Shift + Click**: Add point on path segment without closing
 *
 * ### Bezier Curve Control
 * - **Drag control points**: Adjust curve shape
 * - **Alt + Drag control point**: Disconnect control handles (make asymmetric)
 * - **Shift + Drag**: Create new bezier point with control handles
 *
 * ### Multi-Selection & Transformation
 * - **Select multiple points**: Use Cmd/Ctrl + Click to build selection
 * - **Transform selection**: Use transformer handles for rotation, scaling, and translation
 * - **Clear selection**: Click on any point
 *
 * ## Usage Examples
 *
 * ### Basic Vector Path
 * ```jsx
 * <View>
 *   <Image name="image" value="$image" />
 *   <VectorLabels name="labels" toName="image">
 *     <Label value="Road" />
 *     <Label value="Boundary" />
 *   </VectorLabels>
 * </View>
 * ```
 *
 * ### Polygon with Bezier Support
 * ```jsx
 * <View>
 *   <Image name="image" value="$image" />
 *   <VectorLabels
 *     name="polygons"
 *     toName="image"
 *     closable={true}
 *     curves={true}
 *     minPoints="3"
 *     maxPoints="20"
 *   >
 *     <Label value="Building" />
 *     <Label value="Park" />
 *   </VectorLabels>
 * </View>
 * ```
 *
 * ### Skeleton Mode for Branching Paths
 * ```jsx
 * <View>
 *   <Image name="image" value="$image" />
 *   <VectorLabels
 *     name="skeleton"
 *     toName="image"
 *     skeleton={true}
 *     closable={false}
 *     curves={true}
 *   >
 *     <Label value="Tree" />
 *     <Label value="Branch" />
 *   </VectorLabels>
 * </View>
 * ```
 *
 * ### Keypoint Annotation Tool
 * ```jsx
 * <View>
 *   <Image name="image" value="$image" />
 *   <VectorLabels
 *     name="keypoints"
 *     toName="image"
 *     closable={false}
 *     curves={false}
 *     minPoints="1"
 *     maxPoints="1"
 *   >
 *     <Label value="Eye" />
 *     <Label value="Nose" />
 *     <Label value="Mouth" />
 *   </VectorLabels>
 * </View>
 * ```
 *
 * ## Advanced Features
 *
 * ### Path Breaking
 * When a path is closed, you can break it at any segment:
 * - **Alt + Click** on any segment of a closed path
 * - The path breaks at that segment
 * - The breaking point becomes the first element
 * - The point before breaking becomes active
 *
 * ### Skeleton Mode
 * - **Purpose**: Create branching paths instead of linear sequences
 * - **Behavior**: New points connect to the active point, not the last added point
 * - **Use Case**: Tree structures, network diagrams, anatomical features
 *
 * ### Bezier Curve Management
 * - **Symmetric Control**: By default, control points move symmetrically
 * - **Asymmetric Control**: Hold Alt while dragging to disconnect handles
 * - **Control Point Visibility**: Control points are shown when editing bezier points
 *
 * ### Multi-Selection Workflow
 * 1. **Build Selection**: Use Cmd/Ctrl + Click to add points
 * 2. **Transform**: Use transformer handles for rotation, scaling, translation
 * 3. **Batch Operations**: Apply transformations to all selected points
 * 4. **Clear**: Click outside or use programmatic methods
 *
 * ## Props Reference
 *
 * @name VectorLabels
 * @regions VectorRegion
 * @meta_title Vector Label Tag for Labeling Vectors in Images
 * @meta_description Customize Label Studio with the VectorLabels tag and label vectors in images for semantic segmentation machine learning and data science projects.
 * @param {string} name                             - Name of tag
 * @param {string} toName                           - Name of image to label
 * @param {single|multiple=} [choice=single]        - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]                      - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]               - Show labels in the same visual line
 * @param {number} [opacity=0.2]                    - Opacity of vector
 * @param {string} [fillColor]                      - Vector fill color in hexadecimal
 * @param {string} [strokeColor]                    - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]                  - Width of stroke
 * @param {small|medium|large} [pointSize=medium]   - Size of vector handle points
 * @param {rectangle|circle} [pointStyle=rectangle] - Style of points
 * @param {pixel|none} [snap=none]                  - Snap vector to image pixels
 * @param {boolean} [closable=false]               - Allow closed shapes
 * @param {boolean} [curves=false]                 - Allow Bezier curves
 * @param {boolean} [skeleton=false]               - Enables skeleton mode to allow branch paths
 * @param {number|none} [minPoints=none]           - Minimum allowed number of points
 * @param {number|none} [maxPoints=none]           - Maximum allowed number of points
 * @param {number} [pointsizeenabled=5]           - Size of a point in pixels when shape is selected
 * @param {number} [pointsizedisabled=5]          - Size of a point in pixels when shape is not selected
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const ModelAttrs = types.model("VectorLabelsModel", {
  type: "vectorlabels",
  closable: types.optional(types.maybeNull(types.boolean), false),
  curves: types.optional(types.maybeNull(types.boolean), false),
  minpoints: types.optional(types.maybeNull(types.string), null),
  maxpoints: types.optional(types.maybeNull(types.string), null),
  skeleton: types.optional(types.maybeNull(types.boolean), false),
  pointsizeenabled: types.optional(types.maybeNull(types.string), "5"),
  pointsizedisabled: types.optional(types.maybeNull(types.string), "3"),
  opacity: types.optional(types.maybeNull(types.string), "1"),
  children: Types.unionArray(["label", "vectorlabel", "header", "view", "hypertext"]),
});

const VectorLabelsModel = types.compose(
  "VectorLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  VectorModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const HtxVectorLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("vectorlabels", VectorLabelsModel, HtxVectorLabels);

export { HtxVectorLabels, VectorLabelsModel };
