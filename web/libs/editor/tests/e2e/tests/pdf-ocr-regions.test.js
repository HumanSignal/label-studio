/**
 * PDF OCR Labeling Tests - US2: Region Labeling
 *
 * Test-first development: These tests define expected behavior for region annotation.
 * Tests are expected to fail until implementation is complete.
 */

const assert = require('assert');

Feature('PDF OCR Labeling - US2: Region Labeling');

const PDF_CONFIG = `
<View>
  <PdfOcr name="pdf" value="$pdf_url"
    zoomcontrol="true"
    rotatecontrol="true"
    pagenavigation="true"
    tokenoverlay="true" />
  <OcrTokenLabels name="labels" toName="pdf">
    <Label value="Title" background="#4E86C8" />
    <Label value="Paragraph" background="#944BFF" />
    <Label value="Table" background="#F88B16" />
  </OcrTokenLabels>
  <TextArea name="transcription" toName="pdf" editable="true" perRegion="true"
    placeholder="Extracted Text" displayMode="region-list" />
</View>
`;

const TEST_DATA = {
  pdf_url: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf',
};

/**
 * US2-AC1: User can draw rectangle regions on PDF
 */
Scenario('US2-AC1: Draw rectangle region on PDF page', async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  // Wait for PDF to load
  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Select a label first
  AtLabels.clickLabel('Title');

  // Draw a rectangle region on the PDF
  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    if (!canvas) return { width: 500, height: 700 };
    return {
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
    };
  });

  // Draw region at 10%, 5% with 80% width and 8% height
  const startX = canvasSize.width * 0.1;
  const startY = canvasSize.height * 0.05;
  const endX = canvasSize.width * 0.9;
  const endY = canvasSize.height * 0.13;

  I.moveMouse(startX, startY);
  I.pressMouseDown();
  I.moveMouse(endX, endY);
  I.releaseMouseUp();

  // Verify region was created
  AtOutliner.seeRegions(1);
});

/**
 * US2-AC2: Regions are labeled with selected label
 */
Scenario('US2-AC2: Region receives selected label', async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Select "Paragraph" label
  AtLabels.clickLabel('Paragraph');

  // Draw a region
  await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    if (!canvas) return;

    // Simulate drawing
    const rect = canvas.getBoundingClientRect();
    const startX = rect.left + rect.width * 0.1;
    const startY = rect.top + rect.height * 0.2;
    const endX = rect.left + rect.width * 0.9;
    const endY = rect.top + rect.height * 0.35;

    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: endX, clientY: endY, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));
  });

  // Verify region has the label
  const results = await LabelStudio.serialize();
  const regionWithLabel = results.find(
    (r) => r.type === 'ocrtokenlabels' && r.value.ocrtokenlabels?.includes('Paragraph')
  );

  assert(regionWithLabel, 'Region should have Paragraph label');
});

/**
 * US2-AC3: OCR text is extracted from region
 */
Scenario('US2-AC3: OCR text extracted from region automatically', async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Select a label
  AtLabels.clickLabel('Title');

  // Draw a region over text area
  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    if (!canvas) return { width: 500, height: 700 };
    return { width: canvas.offsetWidth, height: canvas.offsetHeight };
  });

  const startX = canvasSize.width * 0.1;
  const startY = canvasSize.height * 0.05;
  const endX = canvasSize.width * 0.5;
  const endY = canvasSize.height * 0.1;

  I.moveMouse(startX, startY);
  I.pressMouseDown();
  I.moveMouse(endX, endY);
  I.releaseMouseUp();

  // Wait for OCR extraction
  I.wait(1);

  // Check that textarea has extracted text
  const results = await LabelStudio.serialize();
  const textResult = results.find((r) => r.type === 'textarea' && r.value.text?.length > 0);

  // Text should be extracted (actual content depends on the PDF)
  assert(textResult, 'Text should be extracted from region');
});

/**
 * US2-AC4: Regions persist across page navigation
 */
Scenario('US2-AC4: Regions persist across page navigation', async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create region on page 1
  AtLabels.clickLabel('Title');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.1);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.5, canvasSize.height * 0.2);
  I.releaseMouseUp();

  AtOutliner.seeRegions(1);

  // Check if multi-page PDF
  const totalPages = await I.executeScript(() => {
    const indicator = document.querySelector('.lsf-pdfocr__page-info');
    if (!indicator) return 1;
    const match = indicator.textContent.match(/\d+\s*\/\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  });

  if (totalPages > 1) {
    // Navigate to page 2
    I.click('[title="Next page"]');
    I.wait(1);

    // Region count should still show (filtered to current page in outliner)
    // But total regions in annotation should persist

    // Navigate back to page 1
    I.click('[title="Previous page"]');
    I.wait(1);

    // Region should still be visible
    AtOutliner.seeRegions(1);
  }

  // Serialize and verify region persists
  const results = await LabelStudio.serialize();
  const region = results.find((r) => r.type === 'ocrtokenlabels');
  assert(region, 'Region should persist');
  assert(region.value.page === 1, 'Region should be on page 1');
});

/**
 * US2-AC5: Region stores page number
 */
Scenario('US2-AC5: Region stores page number in annotation', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create region on page 1
  AtLabels.clickLabel('Paragraph');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.2, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.8, canvasSize.height * 0.4);
  I.releaseMouseUp();

  // Serialize and check page number
  const results = await LabelStudio.serialize();
  const region = results.find((r) => r.type === 'ocrtokenlabels');

  assert(region, 'Region should exist');
  assert(region.value.page !== undefined, 'Region should have page property');
  assert(region.value.page === 1, 'Region should be on page 1');
});

/**
 * US2-AC6: Region selection and editing
 */
Scenario('US2-AC6: Region can be selected and modified', async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create a region
  AtLabels.clickLabel('Title');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.1);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.5, canvasSize.height * 0.2);
  I.releaseMouseUp();

  AtOutliner.seeRegions(1);

  // Click on the region to select it
  I.click('.lsf-region');

  // Verify region is selected (has selection indicator)
  I.seeElement('.lsf-region.lsf-region_selected');

  // Change the label
  AtLabels.clickLabel('Paragraph');

  // Verify label changed
  const results = await LabelStudio.serialize();
  const region = results.find((r) => r.type === 'ocrtokenlabels');
  assert(region.value.ocrtokenlabels?.includes('Paragraph'), 'Label should be changed to Paragraph');
});

/**
 * US2-AC7: Region deletion
 */
Scenario('US2-AC7: Region can be deleted', async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create a region
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.5);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.9);
  I.releaseMouseUp();

  AtOutliner.seeRegions(1);

  // Select the region
  I.click('.lsf-region');

  // Delete the region using keyboard
  I.pressKey('Backspace');

  // Verify region was deleted
  AtOutliner.seeRegions(0);

  const results = await LabelStudio.serialize();
  const region = results.find((r) => r.type === 'ocrtokenlabels');
  assert(!region, 'Region should be deleted');
});

/**
 * US2-AC8: Coordinates stored in percentage (0-100)
 */
Scenario('US2-AC8: Region coordinates stored as percentages', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  AtLabels.clickLabel('Title');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  // Draw at known percentage positions
  const xPercent = 25;
  const yPercent = 10;
  const widthPercent = 50;
  const heightPercent = 15;

  const startX = canvasSize.width * (xPercent / 100);
  const startY = canvasSize.height * (yPercent / 100);
  const endX = canvasSize.width * ((xPercent + widthPercent) / 100);
  const endY = canvasSize.height * ((yPercent + heightPercent) / 100);

  I.moveMouse(startX, startY);
  I.pressMouseDown();
  I.moveMouse(endX, endY);
  I.releaseMouseUp();

  const results = await LabelStudio.serialize();
  const region = results.find((r) => r.type === 'ocrtokenlabels');

  assert(region, 'Region should exist');

  // Coordinates should be in 0-100 range
  assert(region.value.x >= 0 && region.value.x <= 100, 'x should be 0-100');
  assert(region.value.y >= 0 && region.value.y <= 100, 'y should be 0-100');
  assert(region.value.width >= 0 && region.value.width <= 100, 'width should be 0-100');
  assert(region.value.height >= 0 && region.value.height <= 100, 'height should be 0-100');

  // Check approximate values (with some tolerance for mouse precision)
  const tolerance = 5;
  assert(Math.abs(region.value.x - xPercent) < tolerance, `x should be ~${xPercent}`);
  assert(Math.abs(region.value.y - yPercent) < tolerance, `y should be ~${yPercent}`);
});

/**
 * US2-AC9: Deserialization of regions
 */
Scenario('US2-AC9: Regions deserialize correctly', async ({ I, LabelStudio, AtOutliner }) => {
  const existingAnnotation = {
    id: 'test-annotation',
    result: [
      {
        id: 'region-1',
        from_name: 'labels',
        to_name: 'pdf',
        type: 'ocrtokenlabels',
        value: {
          x: 10,
          y: 5,
          width: 80,
          height: 10,
          rotation: 0,
          page: 1,
          ocrtokenlabels: ['Title'],
        },
      },
      {
        id: 'text-1',
        from_name: 'transcription',
        to_name: 'pdf',
        type: 'textarea',
        value: {
          text: ['Sample Document Title'],
        },
      },
    ],
  };

  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
    annotations: [existingAnnotation],
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Verify region is displayed
  AtOutliner.seeRegions(1);

  // Verify region is visible on the PDF
  I.seeElement('.lsf-region');
});
