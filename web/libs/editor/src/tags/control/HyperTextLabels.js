import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import LabelMixin from '../../mixins/LabelMixin';
import Registry from '../../core/Registry';
import SelectedModelMixin from '../../mixins/SelectedModel';
import Types from '../../core/Types';
import { HtxLabels, LabelsModel } from './Labels/Labels';
import ControlBase from './Base';

/**
 * The `HyperTextLabels` tag creates labeled hyper text (HTML). Use with the HyperText object tag to annotate HTML text or HTML elements for named entity recognition tasks.
 *
 * Use with the following data types: HTML.
 * @example
 * <!--Basic semantic text labeling configuration-->
 * <View>
 *   <HyperTextLabels name="labels" toName="ht">
 *     <Label value="Header" />
 *     <Label value="Body Text" />
 *   </HyperTextLabels>
 *   <HyperText name="ht" value="$html" />
 * </View>
 * @name HyperTextLabels
 * @regions HyperTextRegion
 * @meta_title Hypertext Label Tag to Create Labeled Hypertext (HTML)
 * @meta_description Customize Label Studio with the HyperTextLabels tag to label hypertext (HTML) for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the HTML element to label
 * @param {single|multiple=} [choice=single] - Configure if you can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 */

const Validation = types.model({
  controlledTags: Types.unionTag(['HyperText']),
});

const ModelAttrs = types
  .model('HyperTextLabelsModel', {
    type: 'hypertextlabels',
    children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },

    get serializableValue() {
      const obj = {};

      obj[self.resultType] = self.selectedValues();

      return obj;
    },

    get resultType() {
      return 'hypertextlabels';
    },

    get valueType() {
      return 'hypertextlabels';
    },
  }));

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const HyperTextLabelsModel = types.compose('HyperTextLabelsModel', Composition);

const HtxHyperTextLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('hypertextlabels', HyperTextLabelsModel, HtxHyperTextLabels);

export { HtxHyperTextLabels, HyperTextLabelsModel };
