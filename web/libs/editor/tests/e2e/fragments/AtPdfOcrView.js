/**
 * PDF OCR View fragment for e2e tests
 */

const { I } = inject();

module.exports = {
  _container: '.lsf-pdfocr',
  _toolbar: '.lsf-pdfocr-toolbar',
  _viewer: '.lsf-pdfocr-viewer',
  _canvas: '.lsf-pdfocr-canvas',
  _tokenOverlay: '.lsf-pdfocr-tokens',
  _prevButton: '[data-testid="pdf-prev-page"]',
  _nextButton: '[data-testid="pdf-next-page"]',
  _zoomInButton: '[data-testid="pdf-zoom-in"]',
  _zoomOutButton: '[data-testid="pdf-zoom-out"]',
  _rotateButton: '[data-testid="pdf-rotate"]',
  _pageIndicator: '[data-testid="pdf-page-indicator"]',

  /**
   * Wait for PDF to load
   */
  async waitForPdfLoad() {
    I.waitForElement(this._canvas, 30);
    I.waitForInvisible('.lsf-pdfocr-loading', 30);
  },

  /**
   * Get current page number
   */
  async getCurrentPage() {
    const text = await I.grabTextFrom(this._pageIndicator);
    const match = text.match(/(\d+)\s*\/\s*\d+/);
    return match ? parseInt(match[1], 10) : 1;
  },

  /**
   * Get total pages
   */
  async getTotalPages() {
    const text = await I.grabTextFrom(this._pageIndicator);
    const match = text.match(/\d+\s*\/\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  },

  /**
   * Go to next page
   */
  goToNextPage() {
    I.click(this._nextButton);
  },

  /**
   * Go to previous page
   */
  goToPrevPage() {
    I.click(this._prevButton);
  },

  /**
   * Zoom in
   */
  zoomIn() {
    I.click(this._zoomInButton);
  },

  /**
   * Zoom out
   */
  zoomOut() {
    I.click(this._zoomOutButton);
  },

  /**
   * Rotate page
   */
  rotate() {
    I.click(this._rotateButton);
  },

  /**
   * Get canvas size
   */
  async getCanvasSize() {
    return await I.executeScript(() => {
      const canvas = document.querySelector('.lsf-pdfocr-canvas');
      if (!canvas) return { width: 0, height: 0 };
      return {
        width: canvas.offsetWidth,
        height: canvas.offsetHeight,
      };
    });
  },

  /**
   * Get visible tokens count
   */
  async getVisibleTokensCount() {
    return await I.executeScript(() => {
      const tokens = document.querySelectorAll('.lsf-pdfocr-token');
      return tokens.length;
    });
  },

  /**
   * Click on a token by text
   */
  clickToken(text) {
    I.click(`//*[contains(@class, 'lsf-pdfocr-token') and contains(., '${text}')]`);
  },

  /**
   * Draw a region on the PDF
   */
  async drawRegion(x, y, width, height) {
    const size = await this.getCanvasSize();
    const startX = (x * size.width) / 100;
    const startY = (y * size.height) / 100;
    const endX = startX + (width * size.width) / 100;
    const endY = startY + (height * size.height) / 100;

    I.moveMouse(startX, startY);
    I.pressMouseDown();
    I.moveMouse(endX, endY);
    I.releaseMouseUp();
  },

  /**
   * Check if PDF is displayed
   */
  seePdfDisplayed() {
    I.seeElement(this._canvas);
  },

  /**
   * Check if tokens are visible
   */
  seeTokensDisplayed() {
    I.seeElement(this._tokenOverlay);
  },

  /**
   * Check if on specific page
   */
  async seeOnPage(pageNum) {
    const current = await this.getCurrentPage();
    I.assertEqual(current, pageNum, `Expected to be on page ${pageNum}, but was on page ${current}`);
  },
};
