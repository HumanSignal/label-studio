import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import LabelMixin from '../../mixins/LabelMixin';
import Registry from '../../core/Registry';
import SelectedModelMixin from '../../mixins/SelectedModel';
import Types from '../../core/Types';
import { BrushModel } from './Brush';
import { HtxLabels, LabelsModel } from './Labels/Labels';
import ControlBase from './Base';

/**
 * The `BrushLabels` tag for image segmentation tasks is used in the area where you want to apply a mask or use a brush to draw a region on the image.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic image segmentation labeling configuration-->
 * <View>
 *   <BrushLabels name="labels" toName="image">
 *     <Label value="Person" />
 *     <Label value="Animal" />
 *   </BrushLabels>
 *   <Image name="image" value="$image" />
 * </View>
 * @name BrushLabels
 * @regions BrushRegion
 * @meta_title Brush Label Tag for Image Segmentation Labeling
 * @meta_description Customize Label Studio with brush label tags for image segmentation labeling for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the image to label
 * @param {single|multiple=} [choice=single] - Configure whether the data labeler can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 */

const Validation = types.model({
  controlledTags: Types.unionTag(['Image']),
});

const ModelAttrs = types.model('BrushLabelsModel', {
  type: 'brushlabels',
  children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
});

const BrushLabelsModel = types.compose(
  'BrushLabelsModel',
  ControlBase,
  LabelsModel,
  ModelAttrs,
  BrushModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const HtxBrushLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('brushlabels', BrushLabelsModel, HtxBrushLabels);

export { HtxBrushLabels, BrushLabelsModel };
