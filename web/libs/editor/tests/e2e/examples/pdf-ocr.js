/**
 * PdfOcr test example configuration
 */

const config = `
<View>
  <PdfOcr name="pdf" value="$pdf_url" ocrvalue="$ocr_url"
    zoomcontrol="true" rotatecontrol="true" pagenavigation="true" tokenoverlay="true" />
  <OcrTokenLabels name="labels" toName="pdf">
    <Label value="Title" background="#4E86C8" />
    <Label value="Paragraph" background="#944BFF" />
    <Label value="Table" background="#F88B16" />
  </OcrTokenLabels>
  <TextArea name="extracted_text" toName="pdf" editable="true" perRegion="true"
    placeholder="Extracted Text" displayMode="region-list" />
</View>
`;

const data = {
  pdf_url: '/static/samples/sample-document.pdf',
  ocr_url: '/api/ocr/tasks/1/pages',
};

const result = [
  {
    from_name: 'labels',
    id: 'pdf_region_1',
    to_name: 'pdf',
    type: 'ocrtokenlabels',
    origin: 'manual',
    value: {
      x: 10,
      y: 5,
      width: 80,
      height: 8,
      rotation: 0,
      page: 1,
      ocrtokenlabels: ['Title'],
    },
  },
  {
    from_name: 'extracted_text',
    id: 'text_1',
    to_name: 'pdf',
    type: 'textarea',
    origin: 'manual',
    value: {
      text: ['Sample Document Title'],
    },
  },
];

const title = 'PDF OCR Labeling';

module.exports = { config, data, result, title };
