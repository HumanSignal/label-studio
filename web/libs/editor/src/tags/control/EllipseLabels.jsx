import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import LabelMixin from '../../mixins/LabelMixin';
import Registry from '../../core/Registry';
import SelectedModelMixin from '../../mixins/SelectedModel';
import Types from '../../core/Types';
import { HtxLabels, LabelsModel } from './Labels/Labels';
import { EllipseModel } from './Ellipse';
import ControlBase from './Base';

/**
 * The `EllipseLabels` tag creates labeled ellipses. Use to apply labels to ellipses for semantic segmentation.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic semantic image segmentation labeling configuration-->
 * <View>
 *   <EllipseLabels name="labels" toName="image">
 *     <Label value="Person" />
 *     <Label value="Animal" />
 *   </EllipseLabels>
 *   <Image name="image" value="$image" />
 * </View>
 * @name EllipseLabels
 * @regions EllipseRegion
 * @meta_title Ellipse Label Tag for Labeling Images with Elliptical Bounding Boxes
 * @meta_description Customize Label Studio with the EllipseLabels tag to label images with elliptical bounding boxes for semantic image segmentation machine learning and data science projects.
 * @param {string} name               - Name of the element
 * @param {string} toName             - Name of the image to label
 * @param {single|multiple=} [choice=single] - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]        - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true] - Show labels in the same visual line
 * @param {float=} [opacity=0.6]      - Opacity of ellipse
 * @param {string=} [fillColor]       - Ellipse fill color in hexadecimal
 * @param {string=} [strokeColor]     - Stroke color in hexadecimal
 * @param {number=} [strokeWidth=1]   - Width of stroke
 * @param {boolean=} [canRotate=true] - Show or hide rotation option
 */

const ModelAttrs = types.model('EllipseLabelsModel', {
  type: 'ellipselabels',
  children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
});

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  EllipseModel,
  LabelMixin,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const EllipseLabelsModel = types.compose('EllipseLabelsModel', Composition);

const HtxEllipseLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('ellipselabels', EllipseLabelsModel, HtxEllipseLabels);

export { HtxEllipseLabels, EllipseLabelsModel };
