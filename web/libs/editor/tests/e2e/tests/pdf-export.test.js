/**
 * E2E tests for PDF Export - User Story 5
 *
 * Tests:
 * - Region annotation export format
 * - Table annotation export format
 * - Cell text export in structured format
 * - Annotation import/load
 * - Roundtrip consistency
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const exportConfig = `
<View>
  <TableLabels name="tables" toName="pdf">
    <Label value="Table" />
    <Label value="Header" />
  </TableLabels>
  <OcrTokenLabels name="regions" toName="pdf">
    <Label value="Title" />
    <Label value="Paragraph" />
  </OcrTokenLabels>
  <PdfOcr name="pdf" value="$pdf_url" ocrvalue="$ocr_url" />
</View>
`;

test.describe('PDF Export - US5', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Label Studio
    await page.goto('/projects/1/data?task=1');
    await page.waitForSelector('[data-testid="pdfocr-container"]', { timeout: 10000 });
  });

  test('should export region annotation in correct format', async ({ page }) => {
    // Create a region
    await page.click('text=Title');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 100);
    await page.mouse.up();

    // Submit annotation
    await page.click('[data-testid="submit-annotation"]');

    // Get annotation result from API
    const response = await page.waitForResponse((response) =>
      response.url().includes('/api/annotations/') && response.status() === 200
    );

    const annotation = await response.json();

    // Verify result format
    expect(annotation.result).toBeDefined();
    expect(annotation.result.length).toBeGreaterThan(0);

    const regionResult = annotation.result[0];
    expect(regionResult.type).toBe('pdfregion');
    expect(regionResult.value).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
      page: expect.any(Number),
    });

    // Verify coordinates are in 0-100 range (percentage)
    expect(regionResult.value.x).toBeGreaterThanOrEqual(0);
    expect(regionResult.value.x).toBeLessThanOrEqual(100);
    expect(regionResult.value.y).toBeGreaterThanOrEqual(0);
    expect(regionResult.value.y).toBeLessThanOrEqual(100);
  });

  test('should export table annotation with gridlines', async ({ page }) => {
    // Create a table region
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Add gridlines
    await page.click('[data-testid="table-add-row"]');
    await pdfContainer.click({ position: { x: 200, y: 150 } });
    await pdfContainer.click({ position: { x: 200, y: 220 } });

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 150, y: 180 } });
    await pdfContainer.click({ position: { x: 280, y: 180 } });

    // Submit annotation
    await page.click('[data-testid="submit-annotation"]');

    const response = await page.waitForResponse((response) =>
      response.url().includes('/api/annotations/') && response.status() === 200
    );

    const annotation = await response.json();

    // Find table result
    const tableResult = annotation.result.find(
      (r) => r.type === 'pdfregion' && r.value.isTable
    );

    expect(tableResult).toBeDefined();
    expect(tableResult.value.isTable).toBe(true);
    expect(tableResult.value.row_lines).toBeInstanceOf(Array);
    expect(tableResult.value.col_lines).toBeInstanceOf(Array);
    expect(tableResult.value.row_lines.length).toBe(2); // 2 row separators
    expect(tableResult.value.col_lines.length).toBe(2); // 2 col separators

    // Verify gridline values are in 0-100 range
    tableResult.value.row_lines.forEach((line) => {
      expect(line).toBeGreaterThan(0);
      expect(line).toBeLessThan(100);
    });
  });

  test('should export table with cells array', async ({ page }) => {
    // Create table with gridlines
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 250);
    await page.mouse.up();

    // Add one row and one column line for 2x2 table
    await page.click('[data-testid="table-add-row"]');
    await pdfContainer.click({ position: { x: 175, y: 175 } });

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 175, y: 175 } });

    // Submit
    await page.click('[data-testid="submit-annotation"]');

    const response = await page.waitForResponse((response) =>
      response.url().includes('/api/annotations/') && response.status() === 200
    );

    const annotation = await response.json();
    const tableResult = annotation.result.find(
      (r) => r.type === 'pdfregion' && r.value.isTable
    );

    // Verify cells array
    expect(tableResult.value.cells).toBeDefined();
    expect(tableResult.value.cells).toBeInstanceOf(Array);
    expect(tableResult.value.cells.length).toBe(4); // 2x2 = 4 cells

    // Verify cell structure
    tableResult.value.cells.forEach((cell) => {
      expect(cell).toMatchObject({
        row: expect.any(Number),
        col: expect.any(Number),
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
        text: expect.any(String),
      });
    });

    // Verify cell positions cover all combinations
    const positions = tableResult.value.cells.map((c) => `${c.row}-${c.col}`);
    expect(positions).toContain('0-0');
    expect(positions).toContain('0-1');
    expect(positions).toContain('1-0');
    expect(positions).toContain('1-1');
  });

  test('should export cell text in cells array', async ({ page }) => {
    // Create table
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 250);
    await page.mouse.up();

    // Add gridlines for 2x2
    await page.click('[data-testid="table-add-row"]');
    await pdfContainer.click({ position: { x: 175, y: 175 } });

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 175, y: 175 } });

    // Edit cell text
    const cell00 = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await cell00.dblclick();

    const cellEditor = page.locator('[data-testid="cell-editor-input"]');
    await cellEditor.fill('Header 1');
    await page.keyboard.press('Tab');

    // Edit next cell
    await cellEditor.fill('Header 2');
    await page.keyboard.press('Enter');

    // Submit
    await page.click('[data-testid="submit-annotation"]');

    const response = await page.waitForResponse((response) =>
      response.url().includes('/api/annotations/') && response.status() === 200
    );

    const annotation = await response.json();
    const tableResult = annotation.result.find(
      (r) => r.type === 'pdfregion' && r.value.isTable
    );

    // Verify cell texts
    const cell1 = tableResult.value.cells.find((c) => c.row === 0 && c.col === 0);
    expect(cell1.text).toBe('Header 1');

    const cell2 = tableResult.value.cells.find((c) => c.row === 0 && c.col === 1);
    expect(cell2.text).toBe('Header 2');
  });

  test('should load existing annotation', async ({ page }) => {
    // Create annotation with known values
    const existingAnnotation = {
      result: [
        {
          type: 'pdfregion',
          from_name: 'tables',
          to_name: 'pdf',
          value: {
            x: 10,
            y: 20,
            width: 30,
            height: 40,
            page: 1,
            isTable: true,
            row_lines: [50],
            col_lines: [50],
            cells: [
              { row: 0, col: 0, text: 'A1', x: 10, y: 20, width: 15, height: 20 },
              { row: 0, col: 1, text: 'B1', x: 25, y: 20, width: 15, height: 20 },
              { row: 1, col: 0, text: 'A2', x: 10, y: 40, width: 15, height: 20 },
              { row: 1, col: 1, text: 'B2', x: 25, y: 40, width: 15, height: 20 },
            ],
          },
        },
      ],
    };

    // Mock API to return existing annotation
    await page.route('**/api/annotations/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(existingAnnotation),
        });
      } else {
        await route.continue();
      }
    });

    // Reload page to trigger annotation load
    await page.reload();
    await page.waitForSelector('[data-testid="pdfocr-container"]');

    // Verify table region is displayed
    const tableRegion = page.locator('[data-is-table="true"]');
    await expect(tableRegion).toBeVisible();

    // Verify gridlines are rendered
    const rowLine = page.locator('[data-line-type="row"]');
    await expect(rowLine).toBeVisible();

    const colLine = page.locator('[data-line-type="col"]');
    await expect(colLine).toBeVisible();

    // Verify cell texts are loaded
    const cell00 = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await expect(cell00).toContainText('A1');
  });

  test('should maintain annotation after roundtrip', async ({ page }) => {
    // Create complex annotation
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 350);
    await page.mouse.up();

    // Add multiple gridlines
    await page.click('[data-testid="table-add-row"]');
    await pdfContainer.click({ position: { x: 225, y: 150 } });
    await pdfContainer.click({ position: { x: 225, y: 250 } });

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 150, y: 200 } });
    await pdfContainer.click({ position: { x: 300, y: 200 } });

    // Edit some cells
    const cell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await cell.dblclick();
    await page.locator('[data-testid="cell-editor-input"]').fill('Roundtrip Test');
    await page.keyboard.press('Enter');

    // Submit
    await page.click('[data-testid="submit-annotation"]');

    // Wait for save
    await page.waitForResponse((response) =>
      response.url().includes('/api/annotations/') && response.status() === 200
    );

    // Reload and verify
    await page.reload();
    await page.waitForSelector('[data-testid="pdfocr-container"]');

    // Verify table is loaded
    const tableRegion = page.locator('[data-is-table="true"]');
    await expect(tableRegion).toBeVisible();

    // Verify gridlines count
    const rowLines = page.locator('[data-line-type="row"]');
    expect(await rowLines.count()).toBe(2);

    const colLines = page.locator('[data-line-type="col"]');
    expect(await colLines.count()).toBe(2);

    // Verify cell text
    const loadedCell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await expect(loadedCell).toContainText('Roundtrip Test');
  });

  test('should export multiple annotations correctly', async ({ page }) => {
    // Create a regular region
    await page.click('text=Title');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 80);
    await page.mouse.up();

    // Create a table
    await page.click('text=Table');

    await page.mouse.move(box.x + 50, box.y + 150);
    await page.mouse.down();
    await page.mouse.move(box.x + 350, box.y + 350);
    await page.mouse.up();

    // Add gridlines
    await page.click('[data-testid="table-add-row"]');
    await pdfContainer.click({ position: { x: 200, y: 250 } });

    // Submit
    await page.click('[data-testid="submit-annotation"]');

    const response = await page.waitForResponse((response) =>
      response.url().includes('/api/annotations/') && response.status() === 200
    );

    const annotation = await response.json();

    // Verify both annotations are present
    expect(annotation.result.length).toBe(2);

    // Find regular region
    const regularRegion = annotation.result.find(
      (r) => r.type === 'pdfregion' && !r.value.isTable
    );
    expect(regularRegion).toBeDefined();

    // Find table region
    const tableRegion = annotation.result.find(
      (r) => r.type === 'pdfregion' && r.value.isTable
    );
    expect(tableRegion).toBeDefined();
  });
});
