/**
 * PdfOcr Model - MobX-State-Tree model for PDF OCR object tag.
 *
 * Provides:
 * - PDF document state management (pages, zoom, rotation)
 * - OCR token integration
 * - Region annotation support
 */

import { types, getRoot } from 'mobx-state-tree';
import Registry from '../../../core/Registry';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import ProcessAttrsMixin from '../../../mixins/ProcessAttrs';
import ObjectBase from '../Base';
import { parseValue } from '../../../utils/data';

// Import PdfRegionModel to ensure it's registered with Registry before region creation
import { PdfRegionModel } from '../../../regions/PdfRegion';

/**
 * Tag attributes from XML configuration
 */
const TagAttrs = types.model({
  // Data field references
  value: types.maybeNull(types.string),
  ocrvalue: types.maybeNull(types.string),

  // Display controls
  zoom: types.optional(types.boolean, true),
  zoomcontrol: types.optional(types.boolean, true),
  rotatecontrol: types.optional(types.boolean, true),
  pagenavigation: types.optional(types.boolean, true),
  tokenoverlay: types.optional(types.boolean, true),

  // Layout
  maxwidth: types.optional(types.string, '100%'),
  maxheight: types.optional(types.string, 'calc(100vh - 200px)'),
});

/**
 * Runtime state model
 */
const Model = types
  .model('PdfOcrModel', {
    type: 'pdfocr',

    // Resolved URLs from task data
    _pdfUrl: types.maybeNull(types.string),
    _ocrUrl: types.maybeNull(types.string),

    // PDF state
    _currentPage: types.optional(types.number, 1), // 1-based for PDF.js
    _totalPages: types.optional(types.number, 0),
    _scale: types.optional(types.number, 1.0),
    _rotation: types.optional(types.number, 0), // 0, 90, 180, 270

    // Page dimensions (for coordinate normalization)
    _pageWidth: types.optional(types.number, 612), // Default letter width in points
    _pageHeight: types.optional(types.number, 792), // Default letter height in points

    // Loading state
    _loading: types.optional(types.boolean, false),
    _error: types.maybeNull(types.string),

    // OCR state
    _ocrAvailable: types.optional(types.boolean, false),
    _ocrLoading: types.optional(types.boolean, false),
  })
  .volatile(() => ({
    // PDF document reference (not serialized)
    _pdfDocument: null,
  }))
  .views((self) => ({
    /**
     * Get the root store
     */
    get store() {
      return getRoot(self);
    },

    /**
     * Get the annotation
     */
    get annotation() {
      return self.store?.annotationStore?.selected;
    },

    /**
     * Get the control tag name that references this object
     */
    get controlTagName() {
      // Find the first control tag that has toName pointing to this object
      const annotation = self.annotation;
      if (!annotation) return null;

      for (const [name, tag] of annotation.names.entries()) {
        if (tag.toname === self.name && tag.type?.includes('labels')) {
          return name;
        }
      }
      return null;
    },

    /**
     * Get regions associated with this object
     */
    get regs() {
      const annotation = self.annotation;
      if (!annotation) return [];

      return annotation.regions.filter((r) => {
        return r.object === self || r.to_name === self.name;
      });
    },

    /**
     * Get regions for the current page
     */
    get currentPageRegions() {
      return self.regs.filter((r) => r.page === self._currentPage);
    },

    /**
     * Check if PDF is loaded
     */
    get isLoaded() {
      return self._totalPages > 0 && !self._loading;
    },

    /**
     * Check if there's an error
     */
    get hasError() {
      return !!self._error;
    },

    /**
     * Get current page index (0-based)
     */
    get currentPageIndex() {
      return self._currentPage - 1;
    },

    /**
     * Check if can navigate to previous page
     */
    get canGoPrev() {
      return self._currentPage > 1;
    },

    /**
     * Check if can navigate to next page
     */
    get canGoNext() {
      return self._currentPage < self._totalPages;
    },

    /**
     * Get display scale including device pixel ratio
     */
    get displayScale() {
      return self._scale * (window.devicePixelRatio || 1);
    },
  }))
  .actions((self) => ({
    /**
     * Initialize from task data
     */
    updateValue(store) {
      const taskData = store.task?.dataObj || {};

      // Parse value references
      self._pdfUrl = parseValue(self.value, taskData);
      self._ocrUrl = self.ocrvalue ? parseValue(self.ocrvalue, taskData) : null;

      // Reset state
      self._currentPage = 1;
      self._totalPages = 0;
      self._scale = 1.0;
      self._rotation = 0;
      self._loading = false;
      self._error = null;
    },

    /**
     * Set loading state
     */
    setLoading(loading) {
      self._loading = loading;
    },

    /**
     * Set error state
     */
    setError(error) {
      self._error = error;
      self._loading = false;
    },

    /**
     * Set PDF document info after loading
     */
    setPdfInfo(numPages, width, height) {
      self._totalPages = numPages;
      self._pageWidth = width;
      self._pageHeight = height;
      self._loading = false;
      self._error = null;
    },

    /**
     * Set current page dimensions (may vary per page)
     */
    setPageDimensions(width, height) {
      self._pageWidth = width;
      self._pageHeight = height;
    },

    /**
     * Navigate to specific page
     */
    goToPage(pageNum) {
      const page = Math.max(1, Math.min(pageNum, self._totalPages));
      if (page !== self._currentPage) {
        self._currentPage = page;
      }
    },

    /**
     * Go to previous page
     */
    prevPage() {
      if (self.canGoPrev) {
        self._currentPage -= 1;
      }
    },

    /**
     * Go to next page
     */
    nextPage() {
      if (self.canGoNext) {
        self._currentPage += 1;
      }
    },

    /**
     * Set zoom scale
     */
    setScale(scale) {
      // Clamp scale between 0.1 and 5.0
      self._scale = Math.max(0.1, Math.min(5.0, scale));
    },

    /**
     * Zoom in
     */
    zoomIn() {
      self.setScale(self._scale * 1.2);
    },

    /**
     * Zoom out
     */
    zoomOut() {
      self.setScale(self._scale / 1.2);
    },

    /**
     * Fit to width
     */
    fitToWidth(containerWidth) {
      if (self._pageWidth > 0) {
        self.setScale(containerWidth / self._pageWidth);
      }
    },

    /**
     * Fit to page (both dimensions)
     */
    fitToPage(containerWidth, containerHeight) {
      if (self._pageWidth > 0 && self._pageHeight > 0) {
        const scaleX = containerWidth / self._pageWidth;
        const scaleY = containerHeight / self._pageHeight;
        self.setScale(Math.min(scaleX, scaleY));
      }
    },

    /**
     * Reset zoom to 100%
     */
    resetZoom() {
      self._scale = 1.0;
    },

    /**
     * Rotate page by 90 degrees clockwise
     */
    rotate() {
      self._rotation = (self._rotation + 90) % 360;
    },

    /**
     * Set rotation directly
     */
    setRotation(rotation) {
      self._rotation = rotation % 360;
    },

    /**
     * Set OCR availability
     */
    setOcrAvailable(available) {
      self._ocrAvailable = available;
    },

    /**
     * Set OCR loading state
     */
    setOcrLoading(loading) {
      self._ocrLoading = loading;
    },

    /**
     * Convert page coordinates (0-100) to normalized (0-1)
     */
    normalizeCoords(x, y, width, height) {
      return {
        x: x / 100,
        y: y / 100,
        width: width / 100,
        height: height / 100,
      };
    },

    /**
     * Convert normalized coords (0-1) to page coords (0-100)
     */
    denormalizeCoords(x, y, width, height) {
      return {
        x: x * 100,
        y: y * 100,
        width: width * 100,
        height: height * 100,
      };
    },

    /**
     * Store PDF document reference (volatile)
     */
    setPdfDocument(doc) {
      self._pdfDocument = doc;
    },
  }));

/**
 * Compose the full PdfOcr model with mixins
 */
const PdfOcrModel = types.compose(
  'PdfOcrModel',
  ObjectBase,
  ProcessAttrsMixin,
  AnnotationMixin,
  TagAttrs,
  Model
);

export { PdfOcrModel };
export default PdfOcrModel;
