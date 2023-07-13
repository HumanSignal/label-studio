import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import ControlBase from './Base';
import { customTypes } from '../../core/CustomTypes';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import SeparatedControlMixin from '../../mixins/SeparatedControlMixin';
import { ToolManagerMixin } from '../../mixins/ToolManagerMixin';

/**
 * The `KeyPoint` tag is used to add a key point to an image without selecting a label. This can be useful when you have only one label to assign to the key point.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic keypoint image labeling configuration-->
 * <View>
 *   <KeyPoint name="kp-1" toName="img-1" />
 *   <Image name="img-1" value="$img" />
 * </View>
 * @name KeyPoint
 * @meta_title Keypoint Tag for Adding Keypoints to Images
 * @meta_description Customize Label Studio with the KeyPoint tag to add key points to images for computer vision machine learning and data science projects.
 * @param {string} name                  - Name of the element
 * @param {string} toName                - Name of the image to label
 * @param {float=} [opacity=0.9]         - Opacity of keypoint
 * @param {string=} [fillColor=#8bad00]  - Keypoint fill color in hexadecimal
 * @param {number=} [strokeWidth=1]      - Width of the stroke
 * @param {string=} [strokeColor=#8bad00] - Keypoint stroke color in hexadecimal
 * @param {boolean} [smart]              - Show smart tool for interactive pre-annotations
 * @param {boolean} [smartOnly]          - Only show smart tool for interactive pre-annotations
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  opacity: types.optional(customTypes.range(), '0.9'),
  fillcolor: types.optional(customTypes.color, '#8bad00'),

  strokecolor: types.optional(customTypes.color, '#8bad00'),
  strokewidth: types.optional(types.string, '2'),
});

const Model = types
  .model({
    type: 'keypoint',
    // tools: types.array(BaseTool)
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },
  }))
  .volatile(() => ({
    toolNames: ['KeyPoint'],
  }));

const KeyPointModel = types.compose('KeyPointModel',
  ControlBase,
  AnnotationMixin,
  SeparatedControlMixin,
  TagAttrs,
  Model,
  ToolManagerMixin,
);

const HtxView = () => {
  return null;
};

Registry.addTag('keypoint', KeyPointModel, HtxView);

export { HtxView, KeyPointModel };
