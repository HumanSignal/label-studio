/**
 * PdfLabels control tag for PDF region annotation.
 *
 * Works like RectangleLabels but for PdfOcr object tag.
 * Creates labeled rectangular regions on PDF documents.
 */

import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import LabelMixin from "../../../mixins/LabelMixin";
import Registry from "../../../core/Registry";
import SelectedModelMixin from "../../../mixins/SelectedModel";
import Types from "../../../core/Types";
import { HtxLabels, LabelsModel } from "../Labels/Labels";
import { RectangleModel } from "../Rectangle";
import { guidGenerator } from "../../../core/Helpers";
import ControlBase from "../Base";

/**
 * The `PdfLabels` tag creates labeled rectangular regions on PDF documents.
 * Use with the PdfOcr object tag to annotate regions in PDF files.
 *
 * @example
 * <View>
 *   <PdfLabels name="labels" toName="pdf">
 *     <Label value="Header" />
 *     <Label value="Table" />
 *     <Label value="Paragraph" />
 *   </PdfLabels>
 *   <PdfOcr name="pdf" value="$pdf_url" />
 * </View>
 *
 * @name PdfLabels
 * @regions PdfRegion
 * @meta_title PDF Labels Tag for PDF Document Annotation
 * @meta_description Label rectangular regions in PDF documents for document understanding tasks
 * @param {string} name              - Name of the element
 * @param {string} toName            - Name of the PdfOcr element to label
 * @param {single|multiple=} [choice=single] - Configure whether you can select one or multiple labels
 * @param {number} [maxUsages]       - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true] - Show labels in the same visual line
 * @param {float} [opacity=0.6]      - Opacity of rectangle
 * @param {string} [fillColor]       - Rectangle fill color in hexadecimal
 * @param {string} [strokeColor]     - Stroke color in hexadecimal
 * @param {number} [strokeWidth=1]   - Width of stroke
 */

const Validation = types.model({
  controlledTags: Types.unionTag(["PdfOcr"]),
});

const ModelAttrs = types.model("PdfLabelsModel", {
  pid: types.optional(types.string, guidGenerator),
  type: "pdflabels",
  children: Types.unionArray(["label", "header", "view", "hypertext"]),
});

/**
 * Override to NOT use Konva-based tools since PdfOcr handles its own drawing.
 * The Rect tools expect Konva stage events (stageX/stageY) which don't exist
 * in the DOM-based PDF viewer.
 */
const PdfToolOverride = types.model().volatile(() => ({
  toolNames: [], // Empty - PdfOcr component handles drawing directly
}));

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  RectangleModel,
  PdfToolOverride, // Override toolNames AFTER RectangleModel
  Validation,
  LabelMixin,
  SelectedModelMixin.props({ _child: "LabelModel" }),
);

const PdfLabelsModel = types.compose("PdfLabelsModel", Composition);

const HtxPdfLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
});

Registry.addTag("pdflabels", PdfLabelsModel, HtxPdfLabels);

export { HtxPdfLabels, PdfLabelsModel };
