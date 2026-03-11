/**
 * Tests for ImageCache content type validation.
 *
 * These tests verify that ImageCache correctly handles various Content-Type
 * scenarios from cloud storages, particularly the common case where S3 objects
 * are uploaded without explicit Content-Type and default to binary/octet-stream.
 */

import { imageCache } from "./ImageCache";

// Mock URL.createObjectURL / revokeObjectURL (not available in jsdom).
// Use a counter so each blob URL is unique; otherwise forceClear() revokes the same URL
// and later tests see it in revokedUrls and get() returns undefined.
let blobUrlCounter = 0;
global.URL.createObjectURL = jest.fn(() => `blob:http://localhost/mock-${++blobUrlCounter}`);
global.URL.revokeObjectURL = jest.fn();

// Minimal valid image data (> 100 bytes to pass minBlobSize check)
const FAKE_IMAGE_DATA = new Uint8Array(200).fill(0xff);

/**
 * Helper: create a mock XHR that returns a blob with the given MIME type.
 * Simulates what happens when S3 returns a file with a specific Content-Type.
 */
function mockXHRWithContentType(contentType: string) {
  const blob = new Blob([FAKE_IMAGE_DATA], { type: contentType });

  const originalXHR = global.XMLHttpRequest;
  const mockXHRClass = jest.fn().mockImplementation(() => {
    const listeners: Record<string, Function> = {};
    return {
      responseType: "",
      readyState: 4,
      status: 200,
      response: blob,
      open: jest.fn(),
      send: jest.fn(() => {
        setTimeout(() => listeners.load?.(new Event("load")), 0);
      }),
      addEventListener: jest.fn((event: string, handler: Function) => {
        listeners[event] = handler;
      }),
    };
  });

  global.XMLHttpRequest = mockXHRClass as unknown as typeof XMLHttpRequest;
  return () => {
    global.XMLHttpRequest = originalXHR;
  };
}

// Mock Image globally to simulate successful loading with valid dimensions
beforeAll(() => {
  Object.defineProperty(global, "Image", {
    writable: true,
    value: class MockImage {
      crossOrigin = "";
      naturalWidth = 100;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      get src() {
        return this._src;
      }

      set src(value: string) {
        this._src = value;
        if (value) {
          setTimeout(() => this.onload?.(), 0);
        }
      }
    },
  });
});

describe("ImageCache content type validation", () => {
  beforeEach(() => {
    imageCache.forceClear();
    jest.clearAllMocks();
  });

  /**
   * Test that known non-image content types (e.g. text/html) are rejected.
   * This prevents caching of non-image resources.
   */
  it("should reject text/html content type", async () => {
    const restore = mockXHRWithContentType("text/html");
    try {
      await expect(imageCache.load("https://example.com/page.html")).rejects.toThrow("Invalid content type for image");
    } finally {
      restore();
    }
  });

  /**
   * Test that application/json content type is rejected.
   */
  it("should reject application/json content type", async () => {
    const restore = mockXHRWithContentType("application/json");
    try {
      await expect(imageCache.load("https://example.com/data.json")).rejects.toThrow("Invalid content type for image");
    } finally {
      restore();
    }
  });

  /**
   * Test that binary/octet-stream (common S3 default) is NOT rejected.
   * S3 objects uploaded without explicit Content-Type often have this type.
   * The browser can render them as images by detecting format via magic bytes.
   * This was the root cause of image display regression after FIT-720.
   */
  it("should not reject binary/octet-stream content type", async () => {
    const restore = mockXHRWithContentType("binary/octet-stream");
    try {
      const result = await imageCache.load("https://s3.amazonaws.com/bucket/image.jpg");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
      expect(result.naturalWidth).toBe(100);
    } finally {
      restore();
    }
  });

  /**
   * Test that application/octet-stream is NOT rejected.
   * This is another common generic type from cloud storages.
   */
  it("should not reject application/octet-stream content type", async () => {
    const restore = mockXHRWithContentType("application/octet-stream");
    try {
      const result = await imageCache.load("https://s3.amazonaws.com/bucket/photo.png");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
    } finally {
      restore();
    }
  });

  /**
   * Test that empty/missing blob type is NOT rejected.
   * Some storages may return responses without Content-Type header.
   */
  it("should not reject empty blob type", async () => {
    const restore = mockXHRWithContentType("");
    try {
      const result = await imageCache.load("https://storage.example.com/img.tiff");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
    } finally {
      restore();
    }
  });

  /**
   * Test that valid image content types are accepted as before.
   */
  it("should accept image/jpeg content type", async () => {
    const restore = mockXHRWithContentType("image/jpeg");
    try {
      const result = await imageCache.load("https://example.com/photo.jpg");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
      expect(result.naturalWidth).toBe(100);
      expect(result.naturalHeight).toBe(100);
    } finally {
      restore();
    }
  });

  /**
   * Test that image/png content type is accepted.
   */
  it("should accept image/png content type", async () => {
    const restore = mockXHRWithContentType("image/png");
    try {
      const result = await imageCache.load("https://example.com/screenshot.png");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
    } finally {
      restore();
    }
  });

  /**
   * Reject empty or too-small blob (minBlobSize check).
   */
  it("should reject blob smaller than minBlobSize", async () => {
    const smallBlob = new Blob([new Uint8Array(50)], { type: "image/png" });
    const originalXHR = global.XMLHttpRequest;
    let loadHandler: (() => void) | null = null;
    (global as any).XMLHttpRequest = jest.fn().mockImplementation(function (this: any) {
      const xhr = {
        responseType: "",
        readyState: 4,
        status: 200,
        response: smallBlob,
        open: jest.fn(),
        send: jest.fn(() => {
          setTimeout(() => {
            if (loadHandler) loadHandler();
          }, 0);
        }),
        addEventListener: jest.fn((event: string, handler: Function) => {
          if (event === "load") loadHandler = handler as () => void;
        }),
      };
      return xhr;
    });
    try {
      await expect(imageCache.load("https://example.com/tiny.png")).rejects.toThrow("Empty or invalid image data");
    } finally {
      global.XMLHttpRequest = originalXHR;
    }
  });
});

describe("ImageCache get, refs, and cache lifecycle", () => {
  beforeEach(() => {
    imageCache.forceClear();
    jest.clearAllMocks();
  });

  it("get returns undefined when url not in cache", () => {
    expect(imageCache.get("https://example.com/not-cached.png")).toBeUndefined();
  });

  it("isLoading returns false when not loading", () => {
    expect(imageCache.isLoading("https://example.com/any.png")).toBe(false);
  });

  it("getPendingLoad returns undefined when not loading", () => {
    expect(imageCache.getPendingLoad("https://example.com/any.png")).toBeUndefined();
  });

  it("addRef and releaseRef update refCount on cached entry", async () => {
    const restore = mockXHRWithContentType("image/png");
    try {
      const result = await imageCache.load("https://example.com/ref-test.png");
      expect(result.refCount).toBe(0);
      imageCache.addRef("https://example.com/ref-test.png");
      const cached = imageCache.get("https://example.com/ref-test.png");
      expect(cached?.refCount).toBe(1);
      imageCache.addRef("https://example.com/ref-test.png");
      expect(imageCache.get("https://example.com/ref-test.png")?.refCount).toBe(2);
      imageCache.releaseRef("https://example.com/ref-test.png");
      imageCache.releaseRef("https://example.com/ref-test.png");
      expect(imageCache.get("https://example.com/ref-test.png")?.refCount).toBe(0);
    } finally {
      restore();
    }
  });

  it("forceRemove removes entry and revokes blob", async () => {
    const restore = mockXHRWithContentType("image/png");
    try {
      await imageCache.load("https://example.com/force-remove.png");
      expect(imageCache.get("https://example.com/force-remove.png")).toBeDefined();
      imageCache.forceRemove("https://example.com/force-remove.png");
      expect(imageCache.get("https://example.com/force-remove.png")).toBeUndefined();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("forceClear clears cache and pending loads", async () => {
    const restore = mockXHRWithContentType("image/png");
    try {
      await imageCache.load("https://example.com/clear1.png");
      imageCache.forceClear();
      expect(imageCache.get("https://example.com/clear1.png")).toBeUndefined();
    } finally {
      restore();
    }
  });

  it("load returns cached result and calls onProgress(1)", async () => {
    const restore = mockXHRWithContentType("image/png");
    const onProgress = jest.fn();
    try {
      await imageCache.load("https://example.com/cached.png", undefined, onProgress);
      onProgress.mockClear();
      const result = await imageCache.load("https://example.com/cached.png", undefined, onProgress);
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
      expect(onProgress).toHaveBeenCalledWith(1);
    } finally {
      restore();
    }
  });

  it("load deduplicates concurrent loads for same url", async () => {
    const restore = mockXHRWithContentType("image/png");
    try {
      const [a, b] = await Promise.all([
        imageCache.load("https://example.com/same.png"),
        imageCache.load("https://example.com/same.png"),
      ]);
      expect(a).toBe(b);
      expect(imageCache.isLoading("https://example.com/same.png")).toBe(false);
    } finally {
      restore();
    }
  });
});
