import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import LabelMixin from '../../mixins/LabelMixin';
import Registry from '../../core/Registry';
import SelectedModelMixin from '../../mixins/SelectedModel';
import Types from '../../core/Types';
import { HtxLabels, LabelsModel } from './Labels/Labels';
import { PolygonModel } from './Polygon';
import ControlBase from './Base';

/**
 * The `PolygonLabels` tag is used to create labeled polygons. Use to apply labels to polygons in semantic segmentation tasks.
 *
 * Use with the following data types: image.
 * @example
 * <!--Basic labeling configuration for polygonal semantic segmentation of images -->
 * <View>
 *   <Image name="image" value="$image" />
 *   <PolygonLabels name="labels" toName="image">
 *     <Label value="Car" />
 *     <Label value="Sign" />
 *   </PolygonLabels>
 * </View>
 * @name PolygonLabels
 * @regions PolygonRegion
 * @meta_title Polygon Label Tag for Labeling Polygons in Images
 * @meta_description Customize Label Studio with the PolygonLabels tag and label polygons in images for semantic segmentation machine learning and data science projects.
 * @param {string} name                             - Name of tag
 * @param {string} toName                           - Name of image to label
 * @param {single|multiple=} [choice=single]        - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]                      - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]               - Show labels in the same visual line
 * @param {number} [opacity=0.2]                    - Opacity of polygon
 * @param {string} [fillColor]                      - Polygon fill color in hexadecimal
 * @param {string} [strokeColor]                    - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]                  - Width of stroke
 * @param {small|medium|large} [pointSize=medium]   - Size of polygon handle points
 * @param {rectangle|circle} [pointStyle=rectangle] - Style of points
 * @param {pixel|none} [snap=none]                  - Snap polygon to image pixels
 */

const Validation = types.model({
  controlledTags: Types.unionTag(['Image']),
});

const ModelAttrs = types.model('PolygonLabelsModel', {
  type: 'polygonlabels',
  children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
});

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  PolygonModel,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const PolygonLabelsModel = types.compose('PolygonLabelsModel', Composition);

const HtxPolygonLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('polygonlabels', PolygonLabelsModel, HtxPolygonLabels);

export { HtxPolygonLabels, PolygonLabelsModel };
