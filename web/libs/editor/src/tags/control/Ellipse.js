import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import ControlBase from './Base';
import { customTypes } from '../../core/CustomTypes';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import SeparatedControlMixin from '../../mixins/SeparatedControlMixin';
import { ToolManagerMixin } from '../../mixins/ToolManagerMixin';

/**
 * The `Ellipse` tag is used to add an elliptical bounding box to an image. Use for bounding box image segmentation tasks with ellipses.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic image segmentation with ellipses labeling configuration-->
 * <View>
 *   <Ellipse name="ellipse1-1" toName="img-1" />
 *   <Image name="img-1" value="$img" />
 * </View>
 * @name Ellipse
 * @meta_title Ellipse Tag for Adding Elliptical Bounding Box to Images
 * @meta_description Customize Label Studio with ellipse tags to add elliptical bounding boxes to images for machine learning and data science projects.
 * @param {string} name                  - Name of the element
 * @param {string} toName                - Name of the image to label
 * @param {float} [opacity=0.6]          - Opacity of ellipse
 * @param {string} [fillColor]           - Ellipse fill color in hexadecimal
 * @param {string} [strokeColor=#f48a42] - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]       - Width of the stroke
 * @param {boolean} [canRotate=true]     - Show or hide rotation control
 * @param {boolean} [smart]              - Show smart tool for interactive pre-annotations
 * @param {boolean} [smartOnly]          - Only show smart tool for interactive pre-annotations
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
    type: 'ellipse',
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },
  }))
  .volatile(() => ({
    toolNames: ['Ellipse'],
  }));

const EllipseModel = types.compose('EllipseModel',
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

Registry.addTag('ellipse', EllipseModel, HtxView);

export { HtxView, EllipseModel };
