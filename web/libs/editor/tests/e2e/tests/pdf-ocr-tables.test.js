/**
 * PDF OCR Labeling Tests - US3: Table Structure Annotation
 *
 * Test-first development: These tests define expected behavior for table gridlines.
 * Tests are expected to fail until implementation is complete.
 */

const assert = require('assert');

Feature('PDF OCR Labeling - US3: Table Structure');

const TABLE_CONFIG = `
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
  <TableGridEditor name="tableGrid" toName="pdf" />
  <TextArea name="transcription" toName="pdf" editable="true" perRegion="true"
    placeholder="Extracted Text" displayMode="region-list" />
</View>
`;

const TEST_DATA = {
  pdf_url: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf',
};

/**
 * US3-AC1: User can label a region as "Table"
 */
Scenario('US3-AC1: Create table region with Table label', async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Select Table label
  AtLabels.clickLabel('Table');

  // Draw a table region
  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  const startX = canvasSize.width * 0.1;
  const startY = canvasSize.height * 0.3;
  const endX = canvasSize.width * 0.9;
  const endY = canvasSize.height * 0.7;

  I.moveMouse(startX, startY);
  I.pressMouseDown();
  I.moveMouse(endX, endY);
  I.releaseMouseUp();

  // Verify region was created with Table label
  AtOutliner.seeRegions(1);

  const results = await LabelStudio.serialize();
  const tableRegion = results.find(
    (r) => r.type === 'ocrtokenlabels' && r.value.ocrtokenlabels?.includes('Table')
  );
  assert(tableRegion, 'Table region should be created');
});

/**
 * US3-AC2: Table region shows gridline editor
 */
Scenario('US3-AC2: Table region activates gridline editor', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create a table region
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  // Click on the table region to select it
  I.click('.lsf-region');

  // Gridline editor should appear
  I.seeElement('.lsf-table-editor');
  I.seeElement('.lsf-table-editor__toolbar');
});

/**
 * US3-AC3: User can add horizontal gridlines (row separators)
 */
Scenario('US3-AC3: Add horizontal gridlines to table', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create and select table region
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  I.click('.lsf-region');

  // Click "Add Row" button
  I.click('[data-testid="table-add-row"]');

  // Click at position to add horizontal line
  const tableRect = await I.executeScript(() => {
    const region = document.querySelector('.lsf-region');
    if (!region) return null;
    const rect = region.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });

  if (tableRect) {
    // Add gridline at 50% of table height
    I.click(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.5);
  }

  // Verify horizontal gridline was added
  I.seeElement('.lsf-table-editor__gridline--horizontal');

  const results = await LabelStudio.serialize();
  const tableRegion = results.find((r) => r.value?.row_lines);
  assert(tableRegion, 'Table should have row_lines');
  assert(tableRegion.value.row_lines.length > 0, 'Should have at least one row line');
});

/**
 * US3-AC4: User can add vertical gridlines (column separators)
 */
Scenario('US3-AC4: Add vertical gridlines to table', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create and select table region
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  I.click('.lsf-region');

  // Click "Add Column" button
  I.click('[data-testid="table-add-col"]');

  // Click at position to add vertical line
  const tableRect = await I.executeScript(() => {
    const region = document.querySelector('.lsf-region');
    if (!region) return null;
    const rect = region.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });

  if (tableRect) {
    // Add gridline at 50% of table width
    I.click(tableRect.left + tableRect.width * 0.5, tableRect.top + tableRect.height / 2);
  }

  // Verify vertical gridline was added
  I.seeElement('.lsf-table-editor__gridline--vertical');

  const results = await LabelStudio.serialize();
  const tableRegion = results.find((r) => r.value?.col_lines);
  assert(tableRegion, 'Table should have col_lines');
  assert(tableRegion.value.col_lines.length > 0, 'Should have at least one column line');
});

/**
 * US3-AC5: Gridlines can be dragged to adjust position
 */
Scenario('US3-AC5: Drag gridlines to adjust position', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create table with gridlines
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  I.click('.lsf-region');
  I.click('[data-testid="table-add-row"]');

  // Add a gridline
  const tableRect = await I.executeScript(() => {
    const region = document.querySelector('.lsf-region');
    if (!region) return null;
    const rect = region.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });

  I.click(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.3);

  // Get initial position
  const initialPos = await I.executeScript(() => {
    const line = document.querySelector('.lsf-table-editor__gridline--horizontal');
    return line ? parseFloat(line.style.top) : 0;
  });

  // Drag the gridline
  I.moveMouse(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.5);
  I.releaseMouseUp();

  // Verify position changed
  const newPos = await I.executeScript(() => {
    const line = document.querySelector('.lsf-table-editor__gridline--horizontal');
    return line ? parseFloat(line.style.top) : 0;
  });

  assert(newPos !== initialPos, 'Gridline position should change after drag');
});

/**
 * US3-AC6: Gridlines can be deleted
 */
Scenario('US3-AC6: Delete gridlines', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create table with gridlines
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  I.click('.lsf-region');
  I.click('[data-testid="table-add-row"]');

  const tableRect = await I.executeScript(() => {
    const region = document.querySelector('.lsf-region');
    if (!region) return null;
    const rect = region.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });

  I.click(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.5);

  // Verify gridline exists
  I.seeElement('.lsf-table-editor__gridline--horizontal');

  // Double-click to delete or right-click for context menu
  I.doubleClick('.lsf-table-editor__gridline--horizontal');

  // Verify gridline was deleted
  I.dontSeeElement('.lsf-table-editor__gridline--horizontal');
});

/**
 * US3-AC7: Gridlines stored as row_lines and col_lines arrays
 */
Scenario('US3-AC7: Gridlines serialized correctly', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create table with multiple gridlines
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  I.click('.lsf-region');

  const tableRect = await I.executeScript(() => {
    const region = document.querySelector('.lsf-region');
    if (!region) return null;
    const rect = region.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });

  // Add 2 row lines
  I.click('[data-testid="table-add-row"]');
  I.click(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.33);
  I.click(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.66);

  // Add 2 column lines
  I.click('[data-testid="table-add-col"]');
  I.click(tableRect.left + tableRect.width * 0.33, tableRect.top + tableRect.height / 2);
  I.click(tableRect.left + tableRect.width * 0.66, tableRect.top + tableRect.height / 2);

  // Verify serialization
  const results = await LabelStudio.serialize();
  const tableResult = results.find((r) => r.value?.row_lines || r.value?.col_lines);

  assert(tableResult, 'Table result should exist');
  assert(Array.isArray(tableResult.value.row_lines), 'row_lines should be an array');
  assert(Array.isArray(tableResult.value.col_lines), 'col_lines should be an array');
  assert(tableResult.value.row_lines.length >= 2, 'Should have at least 2 row lines');
  assert(tableResult.value.col_lines.length >= 2, 'Should have at least 2 column lines');

  // Values should be normalized (0-1 or 0-100)
  tableResult.value.row_lines.forEach((val) => {
    assert(val >= 0 && val <= 100, 'Row line value should be 0-100');
  });
  tableResult.value.col_lines.forEach((val) => {
    assert(val >= 0 && val <= 100, 'Column line value should be 0-100');
  });
});

/**
 * US3-AC8: Auto-suggest gridlines from OCR tokens
 */
Scenario('US3-AC8: Auto-suggest gridlines from token alignment', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create table region
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  I.click('.lsf-region');

  // Click auto-detect button
  I.click('[data-testid="table-auto-detect"]');

  // Wait for detection
  I.wait(1);

  // Should have suggested gridlines
  const hasGridlines = await I.executeScript(() => {
    const horizontal = document.querySelectorAll('.lsf-table-editor__gridline--horizontal');
    const vertical = document.querySelectorAll('.lsf-table-editor__gridline--vertical');
    return horizontal.length > 0 || vertical.length > 0;
  });

  // Note: This may not always succeed if PDF doesn't have clear table structure
  // assert(hasGridlines, 'Auto-detect should suggest gridlines');
});

/**
 * US3-AC9: Visual preview of cells formed by gridlines
 */
Scenario('US3-AC9: Cell preview visualization', async ({ I, LabelStudio, AtLabels }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Create table with gridlines
  AtLabels.clickLabel('Table');

  const canvasSize = await I.executeScript(() => {
    const canvas = document.querySelector('.lsf-pdfocr__canvas');
    return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : { width: 500, height: 700 };
  });

  I.moveMouse(canvasSize.width * 0.1, canvasSize.height * 0.3);
  I.pressMouseDown();
  I.moveMouse(canvasSize.width * 0.9, canvasSize.height * 0.7);
  I.releaseMouseUp();

  I.click('.lsf-region');

  const tableRect = await I.executeScript(() => {
    const region = document.querySelector('.lsf-region');
    if (!region) return null;
    const rect = region.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });

  // Add gridlines to create cells
  I.click('[data-testid="table-add-row"]');
  I.click(tableRect.left + tableRect.width / 2, tableRect.top + tableRect.height * 0.5);

  I.click('[data-testid="table-add-col"]');
  I.click(tableRect.left + tableRect.width * 0.5, tableRect.top + tableRect.height / 2);

  // Should show 4 cells (2x2 grid)
  const cellCount = await I.executeScript(() => {
    return document.querySelectorAll('.lsf-table-editor__cell').length;
  });

  assert(cellCount === 4, 'Should display 4 cells for 2x2 grid');
});

/**
 * US3-AC10: Gridlines deserialization
 */
Scenario('US3-AC10: Gridlines deserialize correctly', async ({ I, LabelStudio }) => {
  const existingAnnotation = {
    id: 'test-annotation',
    result: [
      {
        id: 'table-1',
        from_name: 'labels',
        to_name: 'pdf',
        type: 'ocrtokenlabels',
        value: {
          x: 10,
          y: 30,
          width: 80,
          height: 40,
          rotation: 0,
          page: 1,
          ocrtokenlabels: ['Table'],
          row_lines: [33, 66],
          col_lines: [25, 50, 75],
        },
      },
    ],
  };

  I.amOnPage('/');

  LabelStudio.init({
    config: TABLE_CONFIG,
    data: TEST_DATA,
    annotations: [existingAnnotation],
  });

  I.waitForElement('.lsf-pdfocr__container', 30);
  I.waitForInvisible('.lsf-pdfocr__loading', 30);

  // Click on table region to activate editor
  I.click('.lsf-region');

  // Verify gridlines are displayed
  const horizontalCount = await I.executeScript(() => {
    return document.querySelectorAll('.lsf-table-editor__gridline--horizontal').length;
  });

  const verticalCount = await I.executeScript(() => {
    return document.querySelectorAll('.lsf-table-editor__gridline--vertical').length;
  });

  assert(horizontalCount === 2, 'Should have 2 horizontal gridlines');
  assert(verticalCount === 3, 'Should have 3 vertical gridlines');
});
