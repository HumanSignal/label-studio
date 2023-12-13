import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import LabelMixin from '../../mixins/LabelMixin';
import Registry from '../../core/Registry';
import SelectedModelMixin from '../../mixins/SelectedModel';
import Types from '../../core/Types';
import { HtxLabels, LabelsModel } from './Labels/Labels';
import { CubeModel } from './Cube';
import { guidGenerator } from '../../core/Helpers';
import ControlBase from './Base';

/**
 * The `CubeLabels` tag creates labeled Cubes. Use to apply labels to bounding box semantic segmentation tasks.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for applying labels to rectangular bounding boxes on an image -->
 * <View>
 *   <CubeLabels name="labels" toName="image">
 *     <Label value="Person" />
 *     <Label value="Animal" />
 *   </CubeLabels>
 *   <Image name="image" value="$image" />
 * </View>
 * @name CubeLabels
 * @regions RectRegion
 * @meta_title Cube Label Tag to Label Cube Bounding Box in Images
 * @meta_description Customize Label Studio with the CubeLabels tag and add labeled Cube bounding boxes in images for semantic segmentation and object detection machine learning and data science projects.
 * @param {string} name              - Name of the element
 * @param {string} toName            - Name of the image to label
 * @param {single|multiple=} [choice=single] - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 * @param {float} [opacity=0.6]      - Opacity of Cube
 * @param {string} [fillColor]       - Cube fill color in hexadecimal
 * @param {string} [strokeColor]     - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]   - Width of stroke
 * @param {boolean} [canRotate=true] - Show or hide rotation control
 */

const Validation = types.model({
  controlledTags: Types.unionTag(['Object3D']),
});

const ModelAttrs = types.model('CubeLabelsModel', {
  pid: types.optional(types.string, guidGenerator),
  type: 'cubelabels',
  children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
});

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  CubeModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const CubeLabelsModel = types.compose('CubeLabelsModel', Composition);

const HtxCubeLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('cubelabels', CubeLabelsModel, HtxCubeLabels);

export { HtxCubeLabels, CubeLabelsModel };
