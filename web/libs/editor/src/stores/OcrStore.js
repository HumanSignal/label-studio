/**
 * OCR Store - MobX-State-Tree store for OCR token management.
 *
 * Provides:
 * - OCR data fetching and caching per page
 * - Token state management
 * - Reading order utilities
 */

import { flow, types } from 'mobx-state-tree';

/**
 * OCR Token model
 */
const OcrToken = types.model('OcrToken', {
  id: types.identifier,
  text: types.string,
  bbox: types.array(types.number), // [x, y, width, height] normalized 0-1
  confidence: types.optional(types.number, 1.0),
  line_id: types.maybeNull(types.string),
  block_id: types.maybeNull(types.string),
});

/**
 * OCR Page model - tokens for a single page
 */
const OcrPage = types.model('OcrPage', {
  page_index: types.number,
  width: types.number,
  height: types.number,
  rotation: types.optional(types.number, 0),
  tokens: types.array(OcrToken),
  loading: types.optional(types.boolean, false),
  error: types.maybeNull(types.string),
});

/**
 * OCR Store model - manages OCR data for a task
 */
const OcrStore = types
  .model('OcrStore', {
    taskId: types.maybeNull(types.number),
    documentId: types.maybeNull(types.string),
    totalPages: types.optional(types.number, 0),
    ocrAvailable: types.optional(types.boolean, false),
    pages: types.map(OcrPage), // keyed by page_index
    ocrEngine: types.maybeNull(types.string),
    ocrVersion: types.maybeNull(types.string),
    loading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
  })
  .views((self) => ({
    /**
     * Get tokens for a specific page
     */
    getPageTokens(pageIndex) {
      const page = self.pages.get(String(pageIndex));
      return page ? page.tokens : [];
    },

    /**
     * Check if a page's tokens are loaded
     */
    isPageLoaded(pageIndex) {
      return self.pages.has(String(pageIndex));
    },

    /**
     * Check if a page is currently loading
     */
    isPageLoading(pageIndex) {
      const page = self.pages.get(String(pageIndex));
      return page ? page.loading : false;
    },
  }))
  .actions((self) => ({
    /**
     * Initialize OCR store for a task
     */
    setTask(taskId) {
      self.taskId = taskId;
      self.pages.clear();
      self.ocrAvailable = false;
      self.error = null;
    },

    /**
     * Fetch OCR metadata for the task
     */
    fetchMetadata: flow(function* () {
      if (!self.taskId) return;

      self.loading = true;
      self.error = null;

      try {
        const response = yield fetch(`/api/ocr/tasks/${self.taskId}/pages`);
        if (!response.ok) {
          if (response.status === 404) {
            self.ocrAvailable = false;
            return;
          }
          throw new Error(`Failed to fetch OCR metadata: ${response.statusText}`);
        }

        const data = yield response.json();
        self.documentId = data.document_id;
        self.totalPages = data.total_pages;
        self.ocrAvailable = data.ocr_available;
        self.ocrEngine = data.ocr_engine;
        self.ocrVersion = data.ocr_version;
      } catch (error) {
        self.error = error.message;
        console.error('OCR metadata fetch error:', error);
      } finally {
        self.loading = false;
      }
    }),

    /**
     * Fetch tokens for a specific page
     */
    fetchPageTokens: flow(function* (pageIndex) {
      if (!self.taskId) return;

      // Skip if already loaded or loading
      if (self.isPageLoaded(pageIndex) || self.isPageLoading(pageIndex)) {
        return;
      }

      // Create placeholder page entry
      self.pages.set(String(pageIndex), {
        page_index: pageIndex,
        width: 612,
        height: 792,
        rotation: 0,
        tokens: [],
        loading: true,
        error: null,
      });

      try {
        const response = yield fetch(
          `/api/ocr/tasks/${self.taskId}/pages/${pageIndex}/tokens`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch tokens: ${response.statusText}`);
        }

        const data = yield response.json();

        self.pages.set(String(pageIndex), {
          page_index: pageIndex,
          width: data.width,
          height: data.height,
          rotation: data.rotation || 0,
          tokens: data.tokens,
          loading: false,
          error: null,
        });
      } catch (error) {
        const page = self.pages.get(String(pageIndex));
        if (page) {
          page.loading = false;
          page.error = error.message;
        }
        console.error(`OCR page ${pageIndex} fetch error:`, error);
      }
    }),

    /**
     * Get tokens within a region
     */
    fetchRegionTokens: flow(function* (pageIndex, region) {
      if (!self.taskId) return { tokens: [], suggested_text: '' };

      const params = new URLSearchParams({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        threshold: region.threshold || 0.5,
      });

      try {
        const response = yield fetch(
          `/api/ocr/tasks/${self.taskId}/pages/${pageIndex}/tokens/region?${params}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch region tokens: ${response.statusText}`);
        }

        return yield response.json();
      } catch (error) {
        console.error('Region tokens fetch error:', error);
        return { tokens: [], suggested_text: '', error: error.message };
      }
    }),

    /**
     * Clear all cached data
     */
    clear() {
      self.taskId = null;
      self.documentId = null;
      self.totalPages = 0;
      self.ocrAvailable = false;
      self.pages.clear();
      self.error = null;
    },
  }));

export { OcrStore, OcrToken, OcrPage };
export default OcrStore;
