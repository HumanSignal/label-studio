import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import { RectangleModel } from "./Rectangle";
import { guidGenerator } from "../../core/Helpers";
import ControlBase from "./Base";

/**
 * The `RectangleLabels` tag creates labeled rectangles. Use to apply labels to bounding box semantic segmentation tasks.
 *
 * Use with the following data types: image.
 *
 * @example
 * <!--Basic labeling configuration for applying labels to rectangular bounding boxes on an image -->
 * <View>
 *   <RectangleLabels name="labels" toName="image">
 *     <Label value="Person" />
 *     <Label value="Animal" />
 *   </RectangleLabels>
 *   <Image name="image" value="$image" />
 * </View>
 * @name RectangleLabels
 * @regions RectRegion
 * @meta_title Rectangle Label Tag to Label Rectangle Bounding Box in Images
 * @meta_description Customize Label Studio with the RectangleLabels tag and add labeled rectangle bounding boxes in images for semantic segmentation and object detection machine learning and data science projects.
 * @param {string} name              - Name of the element
 * @param {string} toName            - Name of the image to label
 * @param {single|multiple=} [choice=single] - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 * @param {float} [opacity=0.6]      - Opacity of rectangle
 * @param {string} [fillColor]       - Rectangle fill color in hexadecimal
 * @param {string} [strokeColor]     - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]   - Width of stroke
 * @param {boolean} [canRotate=true] - Show or hide rotation control
 * 
 * <!-- Rotation section -->
 * 
 * ### Rotation
 * Note that when you rotate rectangles, the anchor point is different depending on how you perform the rotation. 
 *
 * **Rectangle rotation in Label Studio UI**
 *
 * If you rotate using your mouse in the labeling interface, the rotation anchor point is the center of the rectangle.
 *
 * ![Diagram showing mouse rotation](../images/rectangle_ui_rotation.jpg)
 *
 * **Rectangle rotation in the Label Studio database**
 *
 * If you rotate by directly editing the rotation angle under the **Info** panel of the labeling interface, the rotation anchor point is the top left. 
 * This is also how it is saved in the Label Studio database (regardless of how you performed the rotation). 
 *
 * ![Diagram showing DB rotation](../images/rectangle_db_rotation.jpg)
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const ModelAttrs = types.model("RectangleLabelsModel", {
  pid: types.optional(types.string, guidGenerator),
  type: "rectanglelabels",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  RectangleModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const RectangleLabelsModel = types.compose("RectangleLabelsModel", Composition);

const HtxRectangleLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("rectanglelabels", RectangleLabelsModel, HtxRectangleLabels);

export { HtxRectangleLabels, RectangleLabelsModel };
