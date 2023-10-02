import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import LabelMixin from '../../mixins/LabelMixin';
import Registry from '../../core/Registry';
import SelectedModelMixin from '../../mixins/SelectedModel';
import Types from '../../core/Types';
import { HtxLabels, LabelsModel } from './Labels/Labels';
import { guidGenerator } from '../../core/Helpers';
import ControlBase from './Base';

/**
 * The `TimeSeriesLabels` tag is used to create a labeled time range.
 *
 * Use with the following data types: time series.
 * @example
 * <!--Basic labeling configuration to apply labels to identified regions of a time series with one channel -->
 * <View>
 *   <TimeSeriesLabels name="label" toName="ts">
 *       <Label value="Run"/>
 *       <Label value="Walk"/>
 *   </TimeSeriesLabels>
 *
 *   <TimeSeries name="ts" value="$csv" valueType="url">
 *      <Channel column="first_column"/>
 *   </TimeSeries>
 * </View>
 *
 * @name TimeSeriesLabels
 * @meta_title Time Series Label Tag for Labeling Time Series Data
 * @meta_description Customize Label Studio for with the TimeSeriesLabel tag to label time series data for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toname                    - Name of the timeseries to label
 * @param {single|multiple=} [choice=single] - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 * @param {float=} [opacity=0.9]             - Opacity of the range
 * @param {string=} [fillColor=transparent]  - Range fill color in hexadecimal or HTML color name
 * @param {string} [strokeColor=#f48a42]     - Stroke color in hexadecimal
 * @param {number=} [strokeWidth=1]          - Width of the stroke
 */
const TagAttrs = types.model({
  opacity: types.optional(types.string, '0.9'),
  fillcolor: types.maybeNull(types.string),

  strokeWidth: types.optional(types.number, 1),
  strokeColor: types.optional(types.string, '#f48a42'),
});

const ModelAttrs = types
  .model('TimeSeriesLabelesModel', {
    pid: types.optional(types.string, guidGenerator),
    type: 'timeserieslabels',
    children: Types.unionArray(['labels', 'label', 'choice']),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },

    states() {
      return self.annotation.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();

      return states ? states.filter(c => c.isSelected === true) : null;
    },
  }));

const Model = LabelMixin.props({ _type: 'timeserieslabels' }).views(self => ({
  get shouldBeUnselected() {
    return self.choice === 'single';
  },
}));

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  TagAttrs,
  Model,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const TimeSeriesLabelsModel = types.compose('TimeSeriesLabelsModel', Composition);

const HtxTimeSeriesLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('timeserieslabels', TimeSeriesLabelsModel, HtxTimeSeriesLabels);

export { HtxTimeSeriesLabels, TimeSeriesLabelsModel };
