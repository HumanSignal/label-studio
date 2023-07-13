import { types } from 'mobx-state-tree';

import NormalizationMixin from '../mixins/Normalization';
import RegionsMixin from '../mixins/Regions';
import SpanTextMixin from '../mixins/SpanText';
import Utils from '../utils';
import { ParagraphLabelsModel } from '../tags/control/ParagraphLabels';
import { TextAreaModel } from '../tags/control/TextArea/TextArea';
import { ChoicesModel } from '../tags/control/Choices';
import { RatingModel } from '../tags/control/Rating';
import { ParagraphsModel } from '../tags/object/Paragraphs';
import { AreaMixin } from '../mixins/AreaMixin';
import Registry from '../core/Registry';

const Model = types
  .model('ParagraphsRegionModel', {
    type: 'textrange',
    object: types.late(() => types.reference(ParagraphsModel)),

    startOffset: types.integer,
    start: types.string,
    endOffset: types.integer,
    end: types.string,

    states: types.maybeNull(types.array(types.union(ParagraphLabelsModel, TextAreaModel, ChoicesModel, RatingModel))),
  })
  .volatile(() => ({
    text: '',
    hideable: true,
  }))
  .views(self => ({
    get parent() {
      return self.object;
    },
    getRegionElement() {
      return self._spans?.[0];
    },
  }))
  .actions(self => ({
    beforeDestroy() {
      Utils.HTML.removeSpans(self._spans);
    },

    setText(text) {
      self.text = text;
    },

    fixOffsets(startOffset, endOffset) {
      self.startOffset = startOffset;
      self.endOffset = endOffset;
    },

    /**
     * @example
     * {
     *   "value": {
     *     "start": 3,
     *     "end": 5,
     *     "startOffset": 2,
     *     "endOffset": 81,
     *     "paragraphlabels": ["Car"]
     *   }
     * }
     * @typedef {Object} ParagraphsRegionResult
     * @property {Object} value
     * @property {number} value.start index of paragraph where the region starts
     * @property {number} value.end index of paragraph where the region ends (xpath)
     * @property {number} value.startOffset offset within start paragraph
     * @property {number} value.endOffset offset within end paragraph
     * @property {string} [value.text] text content of the region, can be skipped
     */

    /**
     * @return {ParagraphsRegionResult}
     */
    serialize() {
      const { start, end } = self;

      const res = {
        value: {
          start,
          end,
          startOffset: self.startOffset,
          endOffset: self.endOffset,
        },
      };

      if (self.object.savetextresult === 'yes') {
        res.value['text'] = self.text;
      }

      return res;
    },
  }));

const ParagraphsRegionModel = types.compose(
  'ParagraphsRegionModel',
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  Model,
  SpanTextMixin,
);

Registry.addRegionType(ParagraphsRegionModel, 'paragraphs');

export { ParagraphsRegionModel };
