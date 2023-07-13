import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import { Hotkey } from '../../core/Hotkey';
import ControlBase from './Base';
import { customTypes } from '../../core/CustomTypes';
import Types from '../../core/Types';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import SeparatedControlMixin from '../../mixins/SeparatedControlMixin';
import { ToolManagerMixin } from '../../mixins/ToolManagerMixin';
import { FF_DEV_2576, isFF } from '../../utils/feature-flags';


const hotkeys = Hotkey('Polygons');

/**
 * The `Polygon` tag is used to add polygons to an image without selecting a label. This can be useful when you have only one label to assign to the polygon. Use for image segmentation tasks.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for polygonal image segmentation -->
 * <View>
 *   <Polygon name="rect-1" toName="img-1" />
 *   <Image name="img-1" value="$img" />
 * </View>
 * @name Polygon
 * @meta_title Polygon Tag for Adding Polygons to Images
 * @meta_description Customize Label Studio with the Polygon tag by adding polygons to images for segmentation machine learning and data science projects.
 * @param {string} name                           - Name of tag
 * @param {string} toname                         - Name of image to label
 * @param {number} [opacity=0.6]                  - Opacity of polygon
 * @param {string} [fillColor=transparent]        - Polygon fill color in hexadecimal or HTML color name
 * @param {string} [strokeColor=#f48a42]          - Stroke color in hexadecimal
 * @param {number} [strokeWidth=3]                - Width of stroke
 * @param {small|medium|large} [pointSize=small]  - Size of polygon handle points
 * @param {rectangle|circle} [pointStyle=circle]  - Style of points
 * @param {boolean} [smart]                       - Show smart tool for interactive pre-annotations
 * @param {boolean} [smartOnly]                   - Only show smart tool for interactive pre-annotations
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  opacity: types.optional(customTypes.range(), '0.2'),
  fillcolor: types.optional(customTypes.color, '#f48a42'),

  strokewidth: types.optional(types.string, '2'),
  strokecolor: types.optional(customTypes.color, '#f48a42'),

  pointsize: types.optional(types.string, 'small'),
  pointstyle: types.optional(types.string, 'circle'),
});

const Validation = types.model({
  controlledTags: Types.unionTag(['Image']),
});

const Model = types
  .model({
    type: 'polygon',

    // regions: types.array(RectRegionModel),
    _value: types.optional(types.string, ''),
  })
  .volatile(() => ({
    toolNames: ['Polygon'],
  }))
  .actions(self => {
    return {
      initializeHotkeys() {
        if (isFF(FF_DEV_2576)) {
          hotkeys.addNamed('polygon:undo', () => {
            if (self.annotation.isDrawing) self.annotation.undo();
          });
          hotkeys.addNamed('polygon:redo', () => {
            if (self.annotation.isDrawing)  self.annotation.redo();
          });
        }
      },

      disposeHotkeys() {
        if (isFF(FF_DEV_2576)) {
          hotkeys.removeNamed('polygon:undo');
          hotkeys.removeNamed('polygon:redo');
        }
      },

      afterCreate() {
        self.initializeHotkeys();
      },

      beforeDestroy() {
        self.disposeHotkeys();
      },
    };
  });

const PolygonModel = types.compose(
  'PolygonModel',
  ControlBase,
  AnnotationMixin,
  SeparatedControlMixin,
  TagAttrs,
  Validation,
  ToolManagerMixin,
  Model,
);

const HtxView = () => null;

Registry.addTag('polygon', PolygonModel, HtxView);

export { HtxView, PolygonModel };
