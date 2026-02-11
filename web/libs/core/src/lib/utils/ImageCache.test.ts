/**
 * Tests for ImageCache content type validation.
 *
 * These tests verify that ImageCache correctly handles various Content-Type
 * scenarios from cloud storages, particularly the common case where S3 objects
 * are uploaded without explicit Content-Type and default to binary/octet-stream.
 */

import { imageCache } from "./ImageCache";

// Mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
const mockBlobUrl = "blob:http://localhost/mock-blob-url";
global.URL.createObjectURL = jest.fn(() => mockBlobUrl);
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
      expect(result.blobUrl).toBe(mockBlobUrl);
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
      expect(result.blobUrl).toBe(mockBlobUrl);
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
      expect(result.blobUrl).toBe(mockBlobUrl);
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
      expect(result.blobUrl).toBe(mockBlobUrl);
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
      expect(result.blobUrl).toBe(mockBlobUrl);
    } finally {
      restore();
    }
  });
});
