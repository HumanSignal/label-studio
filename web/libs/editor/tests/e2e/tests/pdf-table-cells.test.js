/**
 * E2E tests for PDF Table Cell Text - User Story 4
 *
 * Tests:
 * - Cell text display
 * - Cell text editing
 * - Keyboard navigation (Tab, Enter, Arrow keys)
 * - OCR text extraction into cells
 * - Cell selection and highlighting
 */

const { test, expect } = require('@playwright/test');

// Test data: Sample table configuration with OCR tokens
const tableConfig = `
<View>
  <TableLabels name="tables" toName="pdf">
    <Label value="Table" />
  </TableLabels>
  <PdfOcr name="pdf" value="$pdf_url" ocrvalue="$ocr_url" />
</View>
`;

const taskDataWithTable = {
  pdf_url: '/tests/fixtures/sample-table.pdf',
  ocr_url: '/tests/fixtures/sample-table-ocr.json',
};

// Mock OCR tokens for a 3x3 table
const mockOcrTokens = [
  // Row 1
  { id: 'tok-1', text: 'Name', bbox: [0.1, 0.1, 0.15, 0.05] },
  { id: 'tok-2', text: 'Age', bbox: [0.35, 0.1, 0.1, 0.05] },
  { id: 'tok-3', text: 'City', bbox: [0.6, 0.1, 0.1, 0.05] },
  // Row 2
  { id: 'tok-4', text: 'Alice', bbox: [0.1, 0.2, 0.15, 0.05] },
  { id: 'tok-5', text: '30', bbox: [0.35, 0.2, 0.05, 0.05] },
  { id: 'tok-6', text: 'NYC', bbox: [0.6, 0.2, 0.1, 0.05] },
  // Row 3
  { id: 'tok-7', text: 'Bob', bbox: [0.1, 0.3, 0.1, 0.05] },
  { id: 'tok-8', text: '25', bbox: [0.35, 0.3, 0.05, 0.05] },
  { id: 'tok-9', text: 'LA', bbox: [0.6, 0.3, 0.1, 0.05] },
];

test.describe('PDF Table Cell Text - US4', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Label Studio with test configuration
    await page.goto('/projects/1/data?task=1');

    // Wait for PDF to load
    await page.waitForSelector('[data-testid="pdfocr-container"]', { timeout: 10000 });
  });

  test('should display cell text overlay when table region is selected', async ({ page }) => {
    // Create a table region
    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');

    // Select Table label
    await page.click('text=Table');

    // Draw a table region
    const box = await pdfContainer.boundingBox();
    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Verify region is created
    const tableRegion = page.locator('[data-is-table="true"]');
    await expect(tableRegion).toBeVisible();

    // Click to select the region
    await tableRegion.click();

    // Verify cell overlay is visible
    const cellOverlay = page.locator('.lsf-table-editor__cell-overlay');
    await expect(cellOverlay).toBeVisible();
  });

  test('should extract OCR text into cells automatically', async ({ page }) => {
    // Create and select table region
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    // Draw region covering mock OCR tokens
    await page.mouse.move(box.x + 30, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 450, box.y + 250);
    await page.mouse.up();

    // Add gridlines (2 rows, 2 columns for 3x3 table)
    await page.click('[data-testid="table-add-row"]');
    await pdfContainer.click({ position: { x: 200, y: 120 } });
    await pdfContainer.click({ position: { x: 200, y: 180 } });

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 150, y: 150 } });
    await pdfContainer.click({ position: { x: 300, y: 150 } });

    // Verify cells contain extracted text
    const cell11 = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await expect(cell11).toContainText('Name');

    const cell12 = page.locator('[data-cell-row="0"][data-cell-col="1"]');
    await expect(cell12).toContainText('Age');
  });

  test('should allow editing cell text', async ({ page }) => {
    // Create table with cells
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Select the table region
    const tableRegion = page.locator('[data-is-table="true"]');
    await tableRegion.click();

    // Double-click to edit a cell
    const cell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await cell.dblclick();

    // Verify cell editor appears
    const cellEditor = page.locator('[data-testid="cell-editor-input"]');
    await expect(cellEditor).toBeVisible();

    // Type new text
    await cellEditor.fill('Modified Text');
    await page.keyboard.press('Enter');

    // Verify text is updated
    await expect(cell).toContainText('Modified Text');
  });

  test('should navigate cells with Tab key', async ({ page }) => {
    // Create table with cells
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Add gridlines for 2x2 table
    await page.click('[data-testid="table-add-row"]');
    await pdfContainer.click({ position: { x: 200, y: 150 } });

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 200, y: 150 } });

    // Select table and first cell
    const tableRegion = page.locator('[data-is-table="true"]');
    await tableRegion.click();

    const firstCell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await firstCell.click();

    // Verify first cell is selected
    await expect(firstCell).toHaveClass(/selected/);

    // Press Tab to navigate to next cell
    await page.keyboard.press('Tab');

    const secondCell = page.locator('[data-cell-row="0"][data-cell-col="1"]');
    await expect(secondCell).toHaveClass(/selected/);
  });

  test('should navigate cells with Arrow keys', async ({ page }) => {
    // Create table with cells
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

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 200, y: 150 } });

    // Select first cell
    const tableRegion = page.locator('[data-is-table="true"]');
    await tableRegion.click();

    const cell00 = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await cell00.click();

    // Navigate right
    await page.keyboard.press('ArrowRight');
    const cell01 = page.locator('[data-cell-row="0"][data-cell-col="1"]');
    await expect(cell01).toHaveClass(/selected/);

    // Navigate down
    await page.keyboard.press('ArrowDown');
    const cell11 = page.locator('[data-cell-row="1"][data-cell-col="1"]');
    await expect(cell11).toHaveClass(/selected/);

    // Navigate left
    await page.keyboard.press('ArrowLeft');
    const cell10 = page.locator('[data-cell-row="1"][data-cell-col="0"]');
    await expect(cell10).toHaveClass(/selected/);

    // Navigate up
    await page.keyboard.press('ArrowUp');
    await expect(cell00).toHaveClass(/selected/);
  });

  test('should start editing on Enter key', async ({ page }) => {
    // Create table
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Select table and cell
    const tableRegion = page.locator('[data-is-table="true"]');
    await tableRegion.click();

    const cell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await cell.click();

    // Press Enter to start editing
    await page.keyboard.press('Enter');

    const cellEditor = page.locator('[data-testid="cell-editor-input"]');
    await expect(cellEditor).toBeFocused();
  });

  test('should cancel editing on Escape key', async ({ page }) => {
    // Create table
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Select and edit cell
    const tableRegion = page.locator('[data-is-table="true"]');
    await tableRegion.click();

    const cell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await cell.dblclick();

    const cellEditor = page.locator('[data-testid="cell-editor-input"]');
    const originalText = await cell.textContent();

    // Type new text
    await cellEditor.fill('Should be cancelled');

    // Press Escape to cancel
    await page.keyboard.press('Escape');

    // Verify editor is closed and text is unchanged
    await expect(cellEditor).not.toBeVisible();
    await expect(cell).toHaveText(originalText);
  });

  test('should preserve cell text after page navigation', async ({ page }) => {
    // Create table on page 1
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Edit cell text
    const cell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await cell.dblclick();

    const cellEditor = page.locator('[data-testid="cell-editor-input"]');
    await cellEditor.fill('Persistent Text');
    await page.keyboard.press('Enter');

    // Navigate away and back
    await page.click('[title="Next page"]');
    await page.click('[title="Previous page"]');

    // Verify text is preserved
    await expect(cell).toContainText('Persistent Text');
  });

  test('should display cell boundaries in spreadsheet panel', async ({ page }) => {
    // Create table
    await page.click('text=Table');

    const pdfContainer = page.locator('[data-testid="pdfocr-container"]');
    const box = await pdfContainer.boundingBox();

    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();

    // Select table
    const tableRegion = page.locator('[data-is-table="true"]');
    await tableRegion.click();

    // Click edit table structure button
    await page.click('[data-testid="edit-table-structure"]');

    // Verify spreadsheet panel is visible
    const spreadsheetPanel = page.locator('.lsf-table-editor__spreadsheet');
    await expect(spreadsheetPanel).toBeVisible();

    // Verify cell grid is rendered
    const cells = page.locator('.lsf-table-editor__spreadsheet-cell');
    expect(await cells.count()).toBeGreaterThan(0);
  });

  test('should highlight corresponding cell in PDF when selecting in spreadsheet', async ({ page }) => {
    // Create table with gridlines
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

    await page.click('[data-testid="table-add-col"]');
    await pdfContainer.click({ position: { x: 200, y: 150 } });

    // Open spreadsheet panel
    const tableRegion = page.locator('[data-is-table="true"]');
    await tableRegion.click();
    await page.click('[data-testid="edit-table-structure"]');

    // Click a cell in the spreadsheet
    const spreadsheetCell = page.locator('.lsf-table-editor__spreadsheet-cell').first();
    await spreadsheetCell.click();

    // Verify corresponding cell in PDF overlay is highlighted
    const pdfCell = page.locator('[data-cell-row="0"][data-cell-col="0"]');
    await expect(pdfCell).toHaveClass(/highlighted/);
  });
});
