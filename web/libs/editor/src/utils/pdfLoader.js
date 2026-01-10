/**
 * PDF.js loader utility.
 *
 * Provides a unified interface for loading PDF documents using PDF.js.
 * Handles worker configuration and document loading.
 */

// Import PDF.js
// Note: When using webpack, use the webpack entry point
let pdfjsLib = null;

/**
 * Initialize PDF.js library
 * @returns {Promise<Object>} PDF.js library object
 */
export async function initPdfJs() {
  if (pdfjsLib) {
    return pdfjsLib;
  }

  try {
    // Try webpack integration first
    pdfjsLib = await import('pdfjs-dist/webpack.mjs');
    console.log('PDF.js loaded via webpack integration');
  } catch (e) {
    // Fallback to standard import
    pdfjsLib = await import('pdfjs-dist');

    // Configure worker manually
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    console.log('PDF.js loaded with manual worker configuration');
  }

  return pdfjsLib;
}

/**
 * Load a PDF document
 * @param {string|ArrayBuffer} source - URL or ArrayBuffer of PDF
 * @param {Object} options - Loading options
 * @returns {Promise<PDFDocumentProxy>} Loaded PDF document
 */
export async function loadPdf(source, options = {}) {
  const pdfjs = await initPdfJs();

  const loadingTask = pdfjs.getDocument({
    url: typeof source === 'string' ? source : undefined,
    data: typeof source !== 'string' ? source : undefined,
    ...options,
  });

  return loadingTask.promise;
}

/**
 * Render a PDF page to a canvas
 * @param {PDFPageProxy} page - PDF page object
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {Object} options - Rendering options
 * @returns {Promise<void>}
 */
export async function renderPage(page, canvas, options = {}) {
  const {
    scale = 1.0,
    rotation = 0,
    devicePixelRatio = window.devicePixelRatio || 1,
  } = options;

  // Get viewport with scale and rotation
  const viewport = page.getViewport({
    scale: scale,
    rotation: rotation,
  });

  // Set canvas dimensions for HiDPI
  const outputScale = devicePixelRatio;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const context = canvas.getContext('2d');

  // HiDPI transform
  const transform = outputScale !== 1
    ? [outputScale, 0, 0, outputScale, 0, 0]
    : null;

  const renderContext = {
    canvasContext: context,
    transform: transform,
    viewport: viewport,
  };

  return page.render(renderContext).promise;
}

/**
 * Get text content from a PDF page
 * @param {PDFPageProxy} page - PDF page object
 * @returns {Promise<Object>} Text content with items and styles
 */
export async function getTextContent(page) {
  return page.getTextContent();
}

/**
 * Convert PDF text items to OCR-like token format
 * @param {Object} textContent - PDF.js text content
 * @param {Object} viewport - Page viewport for coordinate conversion
 * @returns {Array} Array of token objects
 */
export function textContentToTokens(textContent, viewport) {
  const tokens = [];
  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  textContent.items.forEach((item, index) => {
    if (!item.str.trim()) return; // Skip empty items

    // Transform matrix [a, b, c, d, e, f] where e,f are x,y positions
    const transform = item.transform;
    const x = transform[4];
    const y = transform[5];
    const width = item.width;
    const height = item.height;

    // Convert to normalized coordinates (0-1)
    // Note: PDF origin is bottom-left, canvas is top-left
    const normalizedX = x / pageWidth;
    const normalizedY = 1 - (y + height) / pageHeight; // Flip y-axis
    const normalizedWidth = width / pageWidth;
    const normalizedHeight = height / pageHeight;

    tokens.push({
      id: `pdf_t${index}`,
      text: item.str,
      bbox: [normalizedX, normalizedY, normalizedWidth, normalizedHeight],
      confidence: 1.0, // PDF text layer is always high confidence
      // Could add font info here if needed
    });
  });

  return tokens;
}

/**
 * PDF document wrapper class for easier management
 */
export class PdfDocument {
  constructor(source) {
    this.source = source;
    this.pdf = null;
    this.pages = new Map();
  }

  /**
   * Load the PDF document
   * @returns {Promise<PdfDocument>}
   */
  async load() {
    this.pdf = await loadPdf(this.source);
    return this;
  }

  /**
   * Get total number of pages
   * @returns {number}
   */
  get numPages() {
    return this.pdf ? this.pdf.numPages : 0;
  }

  /**
   * Get a specific page (cached)
   * @param {number} pageNum - 1-based page number
   * @returns {Promise<PDFPageProxy>}
   */
  async getPage(pageNum) {
    if (!this.pdf) {
      throw new Error('PDF not loaded');
    }

    if (!this.pages.has(pageNum)) {
      const page = await this.pdf.getPage(pageNum);
      this.pages.set(pageNum, page);
    }

    return this.pages.get(pageNum);
  }

  /**
   * Render a page to canvas
   * @param {number} pageNum - 1-based page number
   * @param {HTMLCanvasElement} canvas - Target canvas
   * @param {Object} options - Render options
   * @returns {Promise<void>}
   */
  async renderPage(pageNum, canvas, options = {}) {
    const page = await this.getPage(pageNum);
    return renderPage(page, canvas, options);
  }

  /**
   * Get text content from a page
   * @param {number} pageNum - 1-based page number
   * @returns {Promise<Object>}
   */
  async getTextContent(pageNum) {
    const page = await this.getPage(pageNum);
    return getTextContent(page);
  }

  /**
   * Get tokens from embedded text layer
   * @param {number} pageNum - 1-based page number
   * @param {number} scale - Scale for viewport
   * @returns {Promise<Array>}
   */
  async getTokens(pageNum, scale = 1.0) {
    const page = await this.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const textContent = await getTextContent(page);
    return textContentToTokens(textContent, viewport);
  }

  /**
   * Destroy the document and release resources
   */
  destroy() {
    if (this.pdf) {
      this.pdf.destroy();
      this.pdf = null;
      this.pages.clear();
    }
  }
}

export default {
  initPdfJs,
  loadPdf,
  renderPage,
  getTextContent,
  textContentToTokens,
  PdfDocument,
};
