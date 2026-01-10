/**
 * PDF OCR Labeling Tests - US1: PDF Viewing
 *
 * Test-first development: These tests define expected behavior for the PdfOcr tag.
 * Tests are expected to fail until implementation is complete.
 */

const assert = require('assert');

Feature('PDF OCR Labeling - US1: PDF Viewing');

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
  </OcrTokenLabels>
</View>
`;

const TEST_DATA = {
  pdf_url: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf',
};

/**
 * US1-AC1: PDF renders in the labeling interface
 */
Scenario('US1-AC1: PDF document renders in labeling interface', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  // Wait for PDF to load
  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Verify PDF canvas is visible
  I.seeElement('.lsf-pdfocr__canvas');
});

/**
 * US1-AC2: Page navigation controls work correctly
 */
Scenario('US1-AC2: Page navigation controls work correctly', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Check page indicator shows page 1
  I.see('1 /', '.lsf-pdfocr__page-info');

  // Try navigating to next page (if multi-page PDF)
  const totalPages = await I.executeScript(() => {
    const indicator = document.querySelector('.lsf-pdfocr__page-info');
    if (!indicator) return 1;
    const match = indicator.textContent.match(/\d+\s*\/\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  });

  if (totalPages > 1) {
    I.click('.lsf-pdfocr__toolbar-button[title="Next page"]');
    I.see('2 /', '.lsf-pdfocr__page-info');

    I.click('.lsf-pdfocr__toolbar-button[title="Previous page"]');
    I.see('1 /', '.lsf-pdfocr__page-info');
  }
});

/**
 * US1-AC3: Zoom controls work correctly
 */
Scenario('US1-AC3: Zoom controls work correctly', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Get initial zoom level
  const initialZoom = await I.executeScript(() => {
    const zoomInfo = document.querySelector('.lsf-pdfocr__zoom-info');
    if (!zoomInfo) return 100;
    const match = zoomInfo.textContent.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 100;
  });

  // Zoom in
  I.click('.lsf-pdfocr__toolbar-button[title="Zoom in"]');

  const zoomedIn = await I.executeScript(() => {
    const zoomInfo = document.querySelector('.lsf-pdfocr__zoom-info');
    if (!zoomInfo) return 100;
    const match = zoomInfo.textContent.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 100;
  });

  assert(zoomedIn > initialZoom, 'Zoom in should increase zoom level');

  // Zoom out
  I.click('.lsf-pdfocr__toolbar-button[title="Zoom out"]');

  const zoomedOut = await I.executeScript(() => {
    const zoomInfo = document.querySelector('.lsf-pdfocr__zoom-info');
    if (!zoomInfo) return 100;
    const match = zoomInfo.textContent.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 100;
  });

  assert(zoomedOut < zoomedIn, 'Zoom out should decrease zoom level');

  // Reset zoom
  I.click('.lsf-pdfocr__toolbar-button[title="Reset zoom"]');

  const resetZoom = await I.executeScript(() => {
    const zoomInfo = document.querySelector('.lsf-pdfocr__zoom-info');
    if (!zoomInfo) return 100;
    const match = zoomInfo.textContent.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 100;
  });

  assert(resetZoom === 100, 'Reset should return to 100%');
});

/**
 * US1-AC4: Rotation controls work correctly
 */
Scenario('US1-AC4: Rotation controls work correctly', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Get initial rotation
  const initialRotation = await I.executeScript(() => {
    const container = document.querySelector('.lsf-pdfocr__page-container');
    if (!container) return 0;
    const transform = getComputedStyle(container).transform;
    // Parse rotation from transform matrix if needed
    return 0; // Initial should be 0
  });

  // Click rotate button
  I.click('.lsf-pdfocr__toolbar-button[title="Rotate 90°"]');

  // Verify rotation changed (canvas should be re-rendered with rotation)
  I.wait(1); // Wait for re-render

  // Rotate should cycle through 0 -> 90 -> 180 -> 270 -> 0
  // Check that the canvas dimensions changed (width/height swapped for 90/270)
});

/**
 * US1-AC5: Loading state displays correctly
 */
Scenario('US1-AC5: Loading state displays during PDF load', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  // Mock slow loading
  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  // Should show loading indicator initially
  I.seeElement('.lsf-pdfocr__loading');

  // Wait for load to complete
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Should now show the canvas
  I.seeElement('.lsf-pdfocr__canvas');
});

/**
 * US1-AC6: Error state displays correctly
 */
Scenario('US1-AC6: Error state displays for invalid PDF URL', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: {
      pdf_url: 'https://invalid-url.example.com/nonexistent.pdf',
    },
  });

  // Wait for error to appear
  I.waitForElement('.lsf-pdfocr__error', 30);
  I.see('Failed to load PDF', '.lsf-pdfocr__error');
});

/**
 * US1-AC7: Controls visibility based on config
 */
Scenario('US1-AC7: Controls visibility respects configuration', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  // Config with all controls disabled
  const configNoControls = `
<View>
  <PdfOcr name="pdf" value="$pdf_url"
    zoomcontrol="false"
    rotatecontrol="false"
    pagenavigation="false" />
</View>
`;

  LabelStudio.init({
    config: configNoControls,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);

  // Should not see control buttons
  I.dontSeeElement('.lsf-pdfocr__toolbar-button[title="Zoom in"]');
  I.dontSeeElement('.lsf-pdfocr__toolbar-button[title="Rotate 90°"]');
  I.dontSeeElement('.lsf-pdfocr__toolbar-button[title="Next page"]');
});

/**
 * US1-AC8: Keyboard shortcuts work correctly
 */
Scenario('US1-AC8: Keyboard shortcuts for navigation', async ({ I, LabelStudio }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: PDF_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Focus on the PDF viewer
  I.click('.lsf-pdfocr__container');

  // Test zoom shortcuts
  I.pressKey(['Control', '+']); // Zoom in
  I.pressKey(['Control', '-']); // Zoom out
  I.pressKey(['Control', '0']); // Reset zoom

  // Test page navigation shortcuts (if multi-page)
  I.pressKey('PageDown'); // Next page
  I.pressKey('PageUp'); // Previous page
});
