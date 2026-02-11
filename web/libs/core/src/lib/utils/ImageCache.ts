/**
 * Global image cache that persists across annotation switches
 * This prevents re-downloading the same images when switching between annotations on the same task
 */

/**
 * Custom error class for image cache errors that should not be sent to Sentry
 * These are expected errors (network issues, invalid images) not code bugs
 */
class ImageCacheError extends Error {
  sentry_skip = true;

  constructor(message: string) {
    super(message);
    this.name = "ImageCacheError";
  }
}

type CachedImage = {
  blobUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  timestamp: number;
  /** Reference count - number of active users of this blob URL */
  refCount: number;
  /** Original URL for re-fetching if blob URL becomes invalid */
  originalUrl: string;
};

class ImageCacheManager {
  private cache: Map<string, CachedImage> = new Map();
  private pendingLoads: Map<string, Promise<CachedImage>> = new Map();
  /** Track revoked blob URLs to detect invalid references */
  private revokedUrls: Set<string> = new Set();

  // Cache for 30 minutes by default
  private readonly maxAge = 30 * 60 * 1000;
  // Maximum cache size (100 images)
  private readonly maxSize = 100;
  // Minimum blob size in bytes (reject empty blobs)
  private readonly minBlobSize = 100;

  /**
   * Get a cached image's blob URL
   * Returns undefined if the cache entry is invalid or blob URL was revoked
   */
  get(url: string): CachedImage | undefined {
    const cached = this.cache.get(url);
    if (!cached) return undefined;

    // Check if cache entry is still valid (age check)
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.safeRevokeBlobUrl(cached);
      this.cache.delete(url);
      return undefined;
    }

    // Check if blob URL has been revoked (validity check)
    if (this.revokedUrls.has(cached.blobUrl)) {
      this.cache.delete(url);
      return undefined;
    }

    return cached;
  }

  /**
   * Increment reference count for a cached image
   * Call this when starting to use a cached blob URL
   */
  addRef(url: string): void {
    const cached = this.cache.get(url);
    if (cached) {
      cached.refCount++;
    }
  }

  /**
   * Decrement reference count for a cached image
   * Call this when done using a cached blob URL
   */
  releaseRef(url: string): void {
    const cached = this.cache.get(url);
    if (cached && cached.refCount > 0) {
      cached.refCount--;
    }
  }

  /**
   * Safely revoke a blob URL and track it as revoked
   */
  private safeRevokeBlobUrl(cached: CachedImage): void {
    if (cached.blobUrl && !this.revokedUrls.has(cached.blobUrl)) {
      URL.revokeObjectURL(cached.blobUrl);
      this.revokedUrls.add(cached.blobUrl);
      // Limit the size of revoked URLs set to prevent memory leaks
      if (this.revokedUrls.size > 1000) {
        const iterator = this.revokedUrls.values();
        for (let i = 0; i < 500; i++) {
          const next = iterator.next();
          if (next.done) break;
          this.revokedUrls.delete(next.value);
        }
      }
    }
  }

  /**
   * Check if an image is currently being loaded
   */
  isLoading(url: string): boolean {
    return this.pendingLoads.has(url);
  }

  /**
   * Get the pending load promise for an image
   */
  getPendingLoad(url: string): Promise<CachedImage> | undefined {
    return this.pendingLoads.get(url);
  }

  /**
   * Load an image and cache it
   * If the same image is already being loaded, return the existing promise (deduplication)
   */
  async load(url: string, crossOrigin?: string, onProgress?: (progress: number) => void): Promise<CachedImage> {
    // Check cache first
    const cached = this.get(url);
    if (cached) {
      onProgress?.(1);
      return cached;
    }

    // Check if already loading (deduplication)
    const pending = this.pendingLoads.get(url);
    if (pending) {
      return pending;
    }

    // Start new load
    const loadPromise = this.loadImage(url, crossOrigin, onProgress);
    this.pendingLoads.set(url, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.pendingLoads.delete(url);
    }
  }

  private async loadImage(
    url: string,
    crossOrigin?: string,
    onProgress?: (progress: number) => void,
  ): Promise<CachedImage> {
    return new Promise((resolve, reject) => {
      // Use fetch with XHR for progress tracking
      const xhr = new XMLHttpRequest();
      xhr.responseType = "blob";

      xhr.addEventListener("load", async () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const blob = xhr.response as Blob;

          // Validate blob size - reject empty or too small blobs
          if (!blob || blob.size < this.minBlobSize) {
            reject(
              new ImageCacheError(`Empty or invalid image data received: ${url} (size: ${blob?.size ?? 0} bytes)`),
            );
            return;
          }

          // Validate content type is an image
          if (blob.type && !blob.type.startsWith("image/")) {
            reject(new ImageCacheError(`Invalid content type for image: ${blob.type} (url: ${url})`));
            return;
          }

          const blobUrl = URL.createObjectURL(blob);

          // Get natural dimensions by loading into an Image
          const img = new Image();
          if (crossOrigin) img.crossOrigin = crossOrigin;

          img.onload = () => {
            // Validate dimensions - reject if image has no dimensions
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
              URL.revokeObjectURL(blobUrl);
              this.revokedUrls.add(blobUrl);
              reject(new ImageCacheError(`Image has invalid dimensions (0x0): ${url}`));
              return;
            }

            const cachedImage: CachedImage = {
              blobUrl,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              timestamp: Date.now(),
              refCount: 0,
              originalUrl: url,
            };

            // Ensure cache doesn't grow too large
            this.ensureCacheSize();
            this.cache.set(url, cachedImage);

            resolve(cachedImage);
          };

          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            this.revokedUrls.add(blobUrl);
            reject(new ImageCacheError(`Failed to load image dimensions: ${url}`));
          };

          img.src = blobUrl;
        } else {
          reject(new ImageCacheError(`Failed to download image: ${xhr.status}`));
        }
      });

      xhr.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress?.(e.loaded / e.total);
        }
      });

      xhr.addEventListener("error", () => {
        reject(new ImageCacheError(`Network error loading image: ${url}`));
      });

      xhr.open("GET", url);
      xhr.send();
    });
  }

  private ensureCacheSize(): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries that are not in use (refCount === 0)
      const entriesToRemove = this.cache.size - this.maxSize + 1;
      let removed = 0;

      // First pass: remove entries with refCount === 0
      for (const [key, value] of this.cache) {
        if (removed >= entriesToRemove) break;
        // Only remove entries that are not actively in use
        if (value.refCount === 0) {
          this.safeRevokeBlobUrl(value);
          this.cache.delete(key);
          removed++;
        }
      }

      // If we couldn't remove enough entries (all in use), log a warning
      // but don't force-remove in-use entries to prevent rendering failures
      if (removed < entriesToRemove) {
        console.warn(
          `ImageCache: Unable to evict ${entriesToRemove - removed} entries (all in use). ` +
            `Cache size: ${this.cache.size}, active refs: ${this.getActiveRefCount()}`,
        );
      }
    }
  }

  /**
   * Get count of images with active references
   */
  private getActiveRefCount(): number {
    let count = 0;
    for (const value of this.cache.values()) {
      if (value.refCount > 0) count++;
    }
    return count;
  }

  /**
   * Force remove a specific image from cache
   * Used for error recovery when a cached blob URL becomes invalid
   */
  forceRemove(url: string): void {
    const cached = this.cache.get(url);
    if (cached) {
      this.safeRevokeBlobUrl(cached);
      this.cache.delete(url);
    }
  }

  /**
   * Force clear all cached images and release memory
   * Called when LSF is destroyed to prevent memory leaks
   */
  forceClear(): void {
    for (const cached of this.cache.values()) {
      this.safeRevokeBlobUrl(cached);
    }
    this.cache.clear();
    this.pendingLoads.clear();
  }
}

// Singleton instance - persists across annotation switches
export const imageCache = new ImageCacheManager();
