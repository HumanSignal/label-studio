import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import ControlBase from './Base';
import { customTypes } from '../../core/CustomTypes';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import SeparatedControlMixin from '../../mixins/SeparatedControlMixin';
import { ToolManagerMixin } from '../../mixins/ToolManagerMixin';
import { FF_DEV_2132, FF_DEV_3793, FF_LSDV_4673, isFF } from '../../utils/feature-flags';

/**
 * The `Rectangle` tag is used to add a rectangle (Bounding Box) to an image without selecting a label. This can be useful when you have only one label to assign to a rectangle.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for adding rectangular bounding box regions to an image -->
 * <View>
 *   <Rectangle name="rect-1" toName="img-1" />
 *   <Image name="img-1" value="$img" />
 * </View>
 * @name Rectangle
 * @meta_title Rectangle Tag for Adding Rectangle Bounding Box to Images
 * @meta_description Customize Label Studio with the Rectangle tag to add rectangle bounding boxes to images for machine learning and data science projects.
 * @param {string} name                   - Name of the element
 * @param {string} toName                 - Name of the image to label
 * @param {float=} [opacity=0.6]          - Opacity of rectangle
 * @param {string=} [fillColor]           - Rectangle fill color in hexadecimal
 * @param {string=} [strokeColor=#f48a42] - Stroke color in hexadecimal
 * @param {number=} [strokeWidth=1]       - Width of the stroke
 * @param {boolean=} [canRotate=true]     - Whether to show or hide rotation control
 * @param {boolean} [smart]               - Show smart tool for interactive pre-annotations
 * @param {boolean} [smartOnly]           - Only show smart tool for interactive pre-annotations
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  opacity: types.optional(customTypes.range(), '0.2'),
  fillcolor: types.optional(customTypes.color, '#f48a42'),

  strokewidth: types.optional(types.string, '1'),
  strokecolor: types.optional(customTypes.color, '#f48a42'),
  fillopacity: types.maybeNull(customTypes.range()),

  canrotate: types.optional(types.boolean, true),
});

const Model = types
  .model({
    type: 'rectangle',
  })
  .volatile(() => ({
    toolNames: isFF(FF_DEV_2132) && (!isFF(FF_DEV_3793) || isFF(FF_LSDV_4673))
      ? ['Rect', 'Rect3Point']
      : ['Rect'],
  }));

const RectangleModel = types.compose('RectangleModel',
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

Registry.addTag('rectangle', RectangleModel, HtxView);

export { HtxView, RectangleModel };
