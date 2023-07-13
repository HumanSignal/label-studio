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
 * The `ParagraphLabels` tag creates labeled paragraphs. Use with the `Paragraphs` tag to label a paragraph of text.
 *
 * Use with the following data types: paragraphs.
 * @example
 * <!--Basic labeling configuration to label paragraphs -->
 * <View>
 *   <ParagraphLabels name="labels" toName="prg">
 *     <Label value="Statement" />
 *     <Label value="Question" />
 *   </ParagraphLabels>
 *   <Paragraphs name="prg" value="$dialogue" layout="dialogue" />
 * </View>
 * @name ParagraphLabels
 * @meta_title Paragraph Label Tag for Paragraph Labels
 * @meta_description Customize Label Studio with paragraph labels for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the paragraph element to label
 * @param {single|multiple=} [choice=single] - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Show labels in the same visual line
 */

const ModelAttrs = types
  .model('ParagraphLabelsModel', {
    pid: types.optional(types.string, guidGenerator),
    type: 'paragraphlabels',
    children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },

    get serializableValue() {
      const obj = {};

      obj['paragraphlabels'] = self.selectedValues();

      return obj;
    },
  }));

const Model = LabelMixin.props({ _type: 'paragraphlabels' });

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  Model,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const ParagraphLabelsModel = types.compose('ParagraphLabelsModel', Composition);

const HtxParagraphLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('paragraphlabels', ParagraphLabelsModel, HtxParagraphLabels);

export { HtxParagraphLabels, ParagraphLabelsModel };
