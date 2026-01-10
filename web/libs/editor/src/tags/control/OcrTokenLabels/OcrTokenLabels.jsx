/**
 * OcrTokenLabels control tag for PDF OCR labeling.
 *
 * Provides:
 * - Label selection for OCR regions
 * - Text extraction from OCR tokens
 * - Rectangle region annotation on PDF pages
 */

import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import LabelMixin from '../../../mixins/LabelMixin';
import Registry from '../../../core/Registry';
import SelectedModelMixin from '../../../mixins/SelectedModel';
import Types from '../../../core/Types';
import { HtxLabels, LabelsModel } from '../Labels/Labels';
import { RectangleModel } from '../Rectangle';
import { guidGenerator } from '../../../core/Helpers';
import ControlBase from '../Base';

/**
 * The `OcrTokenLabels` tag creates labeled rectangles for OCR token regions.
 * Use with the PdfOcr object tag to label text regions with OCR token extraction.
 *
 * @example
 * <View>
 *   <OcrTokenLabels name="labels" toName="pdf">
 *     <Label value="Title" />
 *     <Label value="Paragraph" />
 *     <Label value="Table" />
 *   </OcrTokenLabels>
 *   <PdfOcr name="pdf" value="$pdf_url" ocrvalue="$ocr_url" />
 * </View>
 *
 * @name OcrTokenLabels
 * @regions RectRegion
 * @meta_title OCR Token Labels Tag for PDF Labeling
 * @meta_description Label PDF documents with OCR token extraction support
 * @param {string} name              - Name of the element
 * @param {string} toName            - Name of the PdfOcr element to label
 * @param {single|multiple=} [choice=single] - Configure label selection mode
 * @param {number} [maxUsages]       - Maximum uses per label
 * @param {boolean} [showInline=true] - Show labels inline
 * @param {float} [opacity=0.6]      - Region opacity
 * @param {string} [fillColor]       - Region fill color
 * @param {string} [strokeColor]     - Region stroke color
 * @param {number} [strokeWidth=1]   - Region stroke width
 */

const Validation = types.model({
  controlledTags: Types.unionTag(['PdfOcr']),
});

const ModelAttrs = types.model('OcrTokenLabelsModel', {
  pid: types.optional(types.string, guidGenerator),
  type: 'ocrtokenlabels',
  children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
});

/**
 * OcrTokenLabels-specific functionality
 */
const OcrTokenMixin = types
  .model({
    // Extracted text from OCR tokens within region
    _extractedText: types.maybeNull(types.string),
  })
  .views((self) => ({
    /**
     * Get the PdfOcr object this control is attached to
     */
    get pdfOcrObject() {
      return self.annotation?.names?.get(self.toname);
    },
  }))
  .actions((self) => ({
    /**
     * Extract text from OCR tokens within a region
     * @param {Object} region - The region to extract text from
     * @param {Array} tokens - Available OCR tokens on the page
     */
    extractTokenText(region, tokens) {
      if (!tokens || tokens.length === 0) {
        return '';
      }

      // Find tokens that intersect with the region
      const intersectingTokens = tokens.filter((token) => {
        const [tx, ty, tw, th] = token.bbox;
        const rx = region.x / 100;
        const ry = region.y / 100;
        const rw = region.width / 100;
        const rh = region.height / 100;

        // Check intersection
        return (
          tx < rx + rw &&
          tx + tw > rx &&
          ty < ry + rh &&
          ty + th > ry
        );
      });

      // Sort by reading order (top to bottom, left to right)
      intersectingTokens.sort((a, b) => {
        const [ax, ay] = a.bbox;
        const [bx, by] = b.bbox;
        const yDiff = ay - by;
        if (Math.abs(yDiff) > 0.01) return yDiff;
        return ax - bx;
      });

      return intersectingTokens.map((t) => t.text).join(' ');
    },
  }));

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  RectangleModel,
  Validation,
  LabelMixin,
  OcrTokenMixin,
  SelectedModelMixin.props({ _child: 'LabelModel' })
);

const OcrTokenLabelsModel = types.compose('OcrTokenLabelsModel', Composition);

const HtxOcrTokenLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag('ocrtokenlabels', OcrTokenLabelsModel, HtxOcrTokenLabels);

export { HtxOcrTokenLabels, OcrTokenLabelsModel };
