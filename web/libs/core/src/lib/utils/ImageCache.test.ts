/**
 * Tests for ImageCache: Content-Type validation, cache lifecycle (refs,
 * forceClear, dedup), and the fetch-based loader contract from TRIAG-2331.
 */

import { imageCache } from "./ImageCache";

// Mock URL.createObjectURL / revokeObjectURL (not available in jsdom).
// Use a counter so each blob URL is unique; otherwise forceClear() revokes the same URL
// and later tests see it in revokedUrls and get() returns undefined.
let blobUrlCounter = 0;
global.URL.createObjectURL = mock(() => `blob:http://localhost/mock-${++blobUrlCounter}`);
global.URL.revokeObjectURL = mock();

// Minimal valid image data (> 100 bytes to pass minBlobSize check)
const FAKE_IMAGE_DATA = new Uint8Array(200).fill(0xff);

type FetchInvocation = { url: string; init: RequestInit | undefined };

/**
 * Install a fetch mock that returns a 200 response with a blob of the given content type.
 * Captures every invocation in `calls` for assertions about request shape.
 */
function mockFetchWithContentType(contentType: string): { restore: () => void; calls: FetchInvocation[] } {
  const calls: FetchInvocation[] = [];
  const original = global.fetch;
  global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    calls.push({ url, init });
    const blob = new Blob([FAKE_IMAGE_DATA], { type: contentType });
    return new Response(blob, {
      status: 200,
      headers: contentType ? { "Content-Type": contentType } : undefined,
    });
  }) as unknown as typeof fetch;

  return {
    restore: () => {
      global.fetch = original;
    },
    calls,
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
    mock.clearAllMocks();
  });

  it("should reject text/html content type", async () => {
    const { restore } = mockFetchWithContentType("text/html");
    try {
      await expect(imageCache.load("https://example.com/page.html")).rejects.toThrow("Invalid content type for image");
    } finally {
      restore();
    }
  });

  it("should reject application/json content type", async () => {
    const { restore } = mockFetchWithContentType("application/json");
    try {
      await expect(imageCache.load("https://example.com/data.json")).rejects.toThrow("Invalid content type for image");
    } finally {
      restore();
    }
  });

  /**
   * S3 objects uploaded without explicit Content-Type often have binary/octet-stream
   * but are valid images. Browsers detect format via magic bytes.
   */
  it("should not reject binary/octet-stream content type", async () => {
    const { restore } = mockFetchWithContentType("binary/octet-stream");
    try {
      const result = await imageCache.load("https://s3.amazonaws.com/bucket/image.jpg");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
      expect(result.naturalWidth).toBe(100);
    } finally {
      restore();
    }
  });

  it("should not reject application/octet-stream content type", async () => {
    const { restore } = mockFetchWithContentType("application/octet-stream");
    try {
      const result = await imageCache.load("https://s3.amazonaws.com/bucket/photo.png");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
    } finally {
      restore();
    }
  });

  it("should not reject empty blob type", async () => {
    const { restore } = mockFetchWithContentType("");
    try {
      const result = await imageCache.load("https://storage.example.com/img.tiff");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
    } finally {
      restore();
    }
  });

  it("should accept image/jpeg content type", async () => {
    const { restore } = mockFetchWithContentType("image/jpeg");
    try {
      const result = await imageCache.load("https://example.com/photo.jpg");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
      expect(result.naturalWidth).toBe(100);
      expect(result.naturalHeight).toBe(100);
    } finally {
      restore();
    }
  });

  it("should accept image/png content type", async () => {
    const { restore } = mockFetchWithContentType("image/png");
    try {
      const result = await imageCache.load("https://example.com/screenshot.png");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
    } finally {
      restore();
    }
  });

  it("should reject blob smaller than minBlobSize", async () => {
    const original = global.fetch;
    global.fetch = mock(
      async () =>
        new Response(new Blob([new Uint8Array(50)], { type: "image/png" }), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
    ) as unknown as typeof fetch;
    try {
      await expect(imageCache.load("https://example.com/tiny.png")).rejects.toThrow("Empty or invalid image data");
    } finally {
      global.fetch = original;
    }
  });
});

describe("ImageCache get, refs, and cache lifecycle", () => {
  beforeEach(() => {
    imageCache.forceClear();
    mock.clearAllMocks();
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
    const { restore } = mockFetchWithContentType("image/png");
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
    const { restore } = mockFetchWithContentType("image/png");
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
    const { restore } = mockFetchWithContentType("image/png");
    try {
      await imageCache.load("https://example.com/clear1.png");
      imageCache.forceClear();
      expect(imageCache.get("https://example.com/clear1.png")).toBeUndefined();
    } finally {
      restore();
    }
  });

  it("load returns cached result and calls onProgress(1)", async () => {
    const { restore } = mockFetchWithContentType("image/png");
    const onProgress = mock();
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
    const { restore } = mockFetchWithContentType("image/png");
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

describe("ImageCache fetch-based loader (TRIAG-2331)", () => {
  beforeEach(() => {
    imageCache.forceClear();
    mock.clearAllMocks();
  });

  // Guards against a regression back to XHR — XHR with responseType="blob"
  // on cross-origin requests surfaces 304 to JS as a status, fetch lets the
  // browser HTTP cache merge it with the cached body and surface 200.
  it("uses global fetch (not XMLHttpRequest) so the browser cache can merge 304 responses", async () => {
    const original = global.fetch;
    const fetchSpy = mock(
      async () =>
        new Response(new Blob([FAKE_IMAGE_DATA], { type: "image/png" }), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
    ) as unknown as typeof fetch;
    global.fetch = fetchSpy;
    try {
      await imageCache.load("https://example.com/uses-fetch.png");
      expect((fetchSpy as unknown as ReturnType<typeof mock>).mock.calls.length).toBe(1);
    } finally {
      global.fetch = original;
    }
  });

  // The loader must not pass Cache-Control: no-cache, which would force the
  // browser to revalidate without serving from cache and defeat the 304 merge.
  it("does NOT set Cache-Control: no-cache on the request", async () => {
    const { restore, calls } = mockFetchWithContentType("image/png");
    try {
      await imageCache.load("https://example.com/no-cache-control.png");
      expect(calls.length).toBe(1);
      const headers = calls[0]?.init?.headers;
      // Headers may be undefined, a plain object, or a Headers instance — normalize.
      const headerEntries: Array<[string, string]> = [];
      if (headers instanceof Headers) {
        headers.forEach((v, k) => headerEntries.push([k.toLowerCase(), v]));
      } else if (Array.isArray(headers)) {
        for (const [k, v] of headers) headerEntries.push([k.toLowerCase(), v]);
      } else if (headers) {
        for (const [k, v] of Object.entries(headers)) headerEntries.push([k.toLowerCase(), v as string]);
      }
      const cacheControl = headerEntries.find(([k]) => k === "cache-control");
      // Strongest assertion: no Cache-Control header at all. If a future
      // change adds one, it still must not contain "no-cache".
      if (cacheControl !== undefined) {
        expect(cacheControl[1]).not.toMatch(/no-cache/i);
      } else {
        expect(cacheControl).toBeUndefined();
      }
    } finally {
      restore();
    }
  });

  // The browser merges server 304 + cached body into a 200 before fetch
  // resolves, so we simulate the post-merge state directly.
  it("resolves with cached image when fetch returns 200 (post-merge of server 304 + browser cache)", async () => {
    const original = global.fetch;
    global.fetch = mock(
      async () =>
        new Response(new Blob([FAKE_IMAGE_DATA], { type: "image/png" }), {
          status: 200,
          headers: { "Content-Type": "image/png", ETag: '"merged-from-304"' },
        }),
    ) as unknown as typeof fetch;
    try {
      const result = await imageCache.load("https://example.com/post-304.png");
      expect(result.blobUrl).toMatch(/^blob:http:\/\/localhost\/mock-\d+$/);
      expect(result.originalUrl).toBe("https://example.com/post-304.png");
    } finally {
      global.fetch = original;
    }
  });

  it("rejects with status when fetch returns a non-OK response (e.g. 404)", async () => {
    const original = global.fetch;
    global.fetch = mock(async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    try {
      await expect(imageCache.load("https://example.com/missing.png")).rejects.toThrow("Failed to download image: 404");
    } finally {
      global.fetch = original;
    }
  });

  it("rejects with network error when fetch throws", async () => {
    const original = global.fetch;
    global.fetch = mock(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    try {
      await expect(imageCache.load("https://example.com/network-fail.png")).rejects.toThrow(
        "Network error loading image",
      );
    } finally {
      global.fetch = original;
    }
  });

  // Stream errors (connection reset post-headers) must surface as
  // ImageCacheError, not a raw stream TypeError.
  it("rejects with network error when the response body errors mid-stream", async () => {
    const original = global.fetch;
    const failingStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new TypeError("connection reset"));
      },
    });
    global.fetch = mock(
      async () =>
        new Response(failingStream, {
          status: 200,
          headers: { "Content-Type": "image/png", "Content-Length": "2048" },
        }),
    ) as unknown as typeof fetch;
    try {
      await expect(imageCache.load("https://example.com/midstream-fail.png")).rejects.toThrow(
        "Network error loading image",
      );
    } finally {
      global.fetch = original;
    }
  });

  // Regression: "omit" would strip Django session cookies on same-origin
  // /data/upload/... and /storage-data/uploaded/... requests (401).
  it("uses credentials='same-origin' for crossOrigin='anonymous' so cookies still flow on same-origin requests", async () => {
    const { restore, calls } = mockFetchWithContentType("image/png");
    try {
      await imageCache.load("https://example.com/cross.png", "anonymous");
      expect(calls[0]?.init?.credentials).toBe("same-origin");
    } finally {
      restore();
    }
  });

  it("uses credentials='include' for crossOrigin='use-credentials'", async () => {
    const { restore, calls } = mockFetchWithContentType("image/png");
    try {
      await imageCache.load("https://example.com/with-creds.png", "use-credentials");
      expect(calls[0]?.init?.credentials).toBe("include");
    } finally {
      restore();
    }
  });

  it("uses credentials='same-origin' by default (no crossOrigin) so same-origin proxy URLs keep cookies", async () => {
    const { restore, calls } = mockFetchWithContentType("image/png");
    try {
      await imageCache.load("/projects/1/file-proxy?fileuri=s3://bucket/img.png");
      expect(calls[0]?.init?.credentials).toBe("same-origin");
    } finally {
      restore();
    }
  });
});
