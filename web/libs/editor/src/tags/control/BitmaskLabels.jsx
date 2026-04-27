import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../mixins/LabelMixin";
import Registry from "../../core/Registry";
import SelectedModelMixin from "../../mixins/SelectedModel";
import Types from "../../core/Types";
import { HtxLabels, LabelsModel } from "./Labels/Labels";
import ControlBase from "./Base";
import { BitmaskModel } from "./Bitmask";
import { InteractivePromptMixin } from "../../mixins/InteractivePromptMixin";

/**
 * The `BitmaskLabels` tag for pixel-wise image segmentation tasks is used in the area where you want to apply a mask or use a brush to draw a region on the image.
 *
 * `BitmaskLabels` operates on pixel level and outputs a Base64 encoded PNG data URL image with black pixels on transparent background.
 *
 * Export data example: `data-url:image/png;[base64-encoded-string]`
 *
 * **Note:** You need to set `smoothing="false"` on the Image tag to be able to work with individual pixels;
 *
 *  <video class="Video astro-OQEP7KKB" loop="" playsinline="" autoplay="" muted="">
 *    <source src="https://cdn.sanity.io/files/mzff2hy8/production/4812f66851a7fd4836e729bc7ccb7e510823af5d.mp4" type="video/mp4" class="astro-OQEP7KKB">
 *  </video>
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic image segmentation labeling configuration-->
 * <View>
 *   <BitmaskLabels name="labels" toName="image">
 *     <Label value="Person" />
 *     <Label value="Animal" />
 *   </BitmaskLabels>
 *   <Image name="image" value="$image" smoothing="false"/>
 * </View>
 * @name BitmaskLabels
 * @regions BitmaskRegion
 * @meta_title Bitmask Label Tag for Image Segmentation Labeling
 * @meta_description Customize Label Studio with bitmask label tags for image segmentation labeling for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the image to label
 * @param {single|multiple=} [choice=single] - Configure whether the data labeler can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["Image"]),
});

const ModelAttrs = types.model("BitmaskLabelsModel", {
  type: "bitmaskregion",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

const BitmaskLabelsModel = types.compose(
  "BitmaskLabelsModel",
  ControlBase,
  LabelsModel,
  ModelAttrs,
  BitmaskModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
  InteractivePromptMixin,
);

const HtxBitmaskLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("bitmasklabels", BitmaskLabelsModel, HtxBitmaskLabels);

export { HtxBitmaskLabels, BitmaskLabelsModel };
