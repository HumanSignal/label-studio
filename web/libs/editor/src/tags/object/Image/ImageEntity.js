import { types, getParent, addDisposer } from "mobx-state-tree";
import { FileLoader } from "../../../utils/FileLoader";
import { imageCache } from "@humansignal/core";
import { clamp } from "../../../utils/utilities";
import { FF_IMAGE_MEMORY_USAGE, isFF } from "../../../utils/feature-flags";

const fileLoader = new FileLoader();

export const ImageEntity = types
  .model("ImageEntity", {
    id: types.identifier,
    src: types.string,
    index: types.number,

    rotation: types.optional(types.number, 0),

    /**
     * Natural sizes of Image
     * Constants
     */
    naturalWidth: types.optional(types.integer, 1),
    naturalHeight: types.optional(types.integer, 1),

    stageWidth: types.optional(types.number, 1),
    stageHeight: types.optional(types.number, 1),

    /**
     * Zoom Scale
     */
    zoomScale: types.optional(types.number, 1),

    /**
     * Coordinates of left top corner
     * Default: { x: 0, y: 0 }
     */
    zoomingPositionX: types.optional(types.number, 0),
    zoomingPositionY: types.optional(types.number, 0),

    /**
     * Brightness of Canvas
     */
    brightnessGrade: types.optional(types.number, 100),

    contrastGrade: types.optional(types.number, 100),
  })
  .volatile(() => ({
    stageRatio: 1,
    // Container's sizes causing limits to calculate a scale factor
    containerWidth: 1,
    containerHeight: 1,

    stageZoom: 1,
    stageZoomX: 1,
    stageZoomY: 1,
    currentZoom: 1,

    /** Is image downloaded to local cache */
    downloaded: false,
    /** Is image being downloaded */
    downloading: false,
    /** If error happened during download */
    error: false,
    /** Download progress 0..1 */
    progress: 0,
    /** Local image src created with URL.createURLObject */
    currentSrc: undefined,
    /** Is image loaded using `<img/>` tag and cached by the browser */
    imageLoaded: false,
    /** Track if we've attempted a retry after error */
    _retryAttempted: false,
    /** Track the original URL for error recovery */
    _originalUrl: undefined,
    /** Track if we've added a cache reference (to avoid double-release) */
    _hasCacheRef: false,
  }))
  .views((self) => ({
    get parent() {
      // Get the ImageEntityMixin
      return getParent(self, 2);
    },
    get imageCrossOrigin() {
      return self.parent?.imageCrossOrigin ?? "anonymous";
    },
  }))
  .actions((self) => ({
    preload() {
      if (self.ensurePreloaded() || !self.src) return;

      // Store original URL for error recovery
      self._originalUrl = self.src;

      const crossOrigin = self.imageCrossOrigin;

      // Check if already cached in global cache
      const cached = imageCache.get(self.src);
      if (cached) {
        self.markAsLoaded(cached.blobUrl, { addCacheRef: true });
        return;
      }

      // Check if currently loading (deduplication)
      if (imageCache.isLoading(self.src)) {
        self.setDownloading(true);
        imageCache
          .getPendingLoad(self.src)
          ?.then((result) => {
            self.markAsLoaded(result.blobUrl, { addCacheRef: true });
          })
          .catch(() => {
            self.markAsFailed();
          });
        return;
      }

      self.setDownloading(true);

      // Use the global cache for loading
      imageCache
        .load(self.src, crossOrigin, (progress) => {
          self.setProgress(progress);
        })
        .then((result) => {
          self.markAsLoaded(result.blobUrl, { addCacheRef: true });
        })
        .catch(() => {
          // Fallback to old behavior if global cache fails
          if (isFF(FF_IMAGE_MEMORY_USAGE)) {
            const img = new Image();
            if (crossOrigin) img.crossOrigin = crossOrigin;
            img.onload = () => {
              self.markAsLoaded(self.src);
            };
            img.onerror = () => {
              self.markAsFailed();
            };
            img.src = self.src;
          } else {
            fileLoader
              .download(self.src, (_t, _l, progress) => {
                self.setProgress(progress);
              })
              .then((url) => {
                self.markAsLoaded(url);
              })
              .catch(() => {
                self.markAsFailed();
              });
          }
        });
    },

    ensurePreloaded() {
      const cached = imageCache.get(self.src);
      if (cached) {
        self.markAsLoaded(cached.blobUrl, { addCacheRef: true });
        return true;
      }

      if (isFF(FF_IMAGE_MEMORY_USAGE)) return self.currentSrc !== undefined;

      if (fileLoader.isError(self.src)) {
        self.markAsFailed();
        return true;
      }
      if (fileLoader.isPreloaded(self.src)) {
        self.markAsLoaded(fileLoader.getPreloadedURL(self.src));
        return true;
      }
      return false;
    },

    /**
     * Release the reference to the cached image
     * Should be called when the component unmounts or switches images
     */
    releaseImage() {
      if (self.src && self._hasCacheRef) {
        imageCache.releaseRef(self.src);
        self._hasCacheRef = false;
      }
    },

    setImageLoaded(value) {
      self.imageLoaded = value;
    },

    setProgress(progress) {
      self.progress = clamp(progress, 0, 100);
    },

    setDownloading(downloading) {
      self.downloading = downloading;
    },

    setDownloaded(downloaded) {
      self.downloaded = downloaded;
    },

    setCurrentSrc(src) {
      self.currentSrc = src;
    },

    /**
     * Set error state and attempt recovery if not already retried
     * @param {boolean} value - Whether to set error state
     */
    setError(value = true) {
      if (value) {
        // Always reset imageLoaded when setting error
        self.setImageLoaded(false);

        if (!self._retryAttempted && self._originalUrl) {
          // Attempt recovery: force re-fetch from original URL
          self._retryAttempted = true;
          self.error = false;

          // Remove potentially corrupt cache entry
          imageCache.forceRemove(self.src);

          // Re-attempt load
          self.setDownloading(true);
          self.setDownloaded(false);
          self.setCurrentSrc(undefined);

          const crossOrigin = self.imageCrossOrigin;

          imageCache
            .load(self.src, crossOrigin, (progress) => {
              self.setProgress(progress);
            })
            .then((result) => {
              self.markAsLoaded(result.blobUrl, { addCacheRef: true });
            })
            .catch(() => {
              // Final failure - set error state (async-safe via action)
              self.markAsFailed();
            });
          return;
        }
      }
      self.error = value;
    },

    /**
     * Mark image as successfully loaded with the given source URL
     * Consolidates the common pattern of setting download state after successful load
     * @param {string} src - The source URL (blob URL or original URL)
     * @param {Object} options - Optional configuration
     * @param {boolean} options.addCacheRef - Whether to add a reference to the image cache
     */
    markAsLoaded(src, { addCacheRef = false } = {}) {
      if (addCacheRef && !self._hasCacheRef) {
        imageCache.addRef(self.src);
        self._hasCacheRef = true;
      }
      self.setCurrentSrc(src);
      self.setDownloaded(true);
      self.setProgress(1);
      self.setDownloading(false);
      // Note: imageLoaded is NOT set here - wait for the actual <img> onLoad event
    },

    /**
     * Mark image as failed to load
     * Consolidates the common error handling pattern
     */
    markAsFailed() {
      self.setError(true);
      self.setDownloading(false);
    },
  }))
  .actions((self) => ({
    setRotation(angle) {
      self.rotation = angle;
    },

    setNaturalWidth(width) {
      self.naturalWidth = width;
    },

    setNaturalHeight(height) {
      self.naturalHeight = height;
    },

    setStageWidth(width) {
      self.stageWidth = width;
    },

    setStageHeight(height) {
      self.stageHeight = height;
    },

    setStageRatio(ratio) {
      self.stageRatio = ratio;
    },

    setContainerWidth(width) {
      self.containerWidth = width;
    },

    setContainerHeight(height) {
      self.containerHeight = height;
    },

    setStageZoom(zoom) {
      self.stageZoom = zoom;
    },

    setStageZoomX(zoom) {
      self.stageZoomX = zoom;
    },

    setStageZoomY(zoom) {
      self.stageZoomY = zoom;
    },

    setCurrentZoom(zoom) {
      self.currentZoom = zoom;
    },

    setZoomScale(zoomScale) {
      self.zoomScale = zoomScale;
    },

    setZoomingPositionX(x) {
      self.zoomingPositionX = x;
    },

    setZoomingPositionY(y) {
      self.zoomingPositionY = y;
    },

    setBrightnessGrade(grade) {
      self.brightnessGrade = grade;
    },

    setContrastGrade(grade) {
      self.contrastGrade = grade;
    },
  }))
  .actions((self) => ({
    /**
     * Register cleanup to release cache reference when this entity is destroyed
     */
    afterCreate() {
      addDisposer(self, () => {
        self.releaseImage();
      });
    },
  }));
