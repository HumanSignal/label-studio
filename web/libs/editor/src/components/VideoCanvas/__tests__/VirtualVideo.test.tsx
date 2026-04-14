import { act, render, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, mock } from "bun:test";
// InfoModal mock must be pre-registered before requireActual evaluates VirtualVideo
import "./virtualVideoTestMockSetup";

type VirtualVideoComponent = Awaited<typeof import("../VirtualVideo")>["VirtualVideo"];

let VirtualVideo: VirtualVideoComponent;

describe("VirtualVideo", () => {
  beforeEach(async () => {
    // Use requireActual directly instead of dynamic import. This isolates this test
    // from any `mockModule` overrides applied concurrently by `VideoCanvas.test.tsx`.
    // We fixed `VideoCanvas.test.tsx` to restore the true real modules rather than re-registering
    // the poisoned `requireActual` returns, so this is safe again.
    const realVirtualVideo = requireActual("../VirtualVideo.tsx") as Record<string, unknown>;

    VirtualVideo = realVirtualVideo.VirtualVideo as VirtualVideoComponent;
  });

  it("should call canPlayUrl and return false if no url specified", async () => {
    const canPlayType = mock();

    await act(async () => {
      render(<VirtualVideo canPlayType={canPlayType} />);
    });

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(false);
    });
  });

  it("should call canPlayUrl and return true if valid url specified", async () => {
    const canPlayType = mock();

    await act(async () => {
      render(<VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.mp4" canPlayType={canPlayType} />);
    });

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(true);
    });
  });

  it("should call canPlayUrl and return true if valid relative url specified", async () => {
    const canPlayType = mock();

    await act(async () => {
      render(<VirtualVideo src="/files/opossum_intro.webm" canPlayType={canPlayType} />);
    });

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(true);
    });
  });

  it("should call canPlayUrl and return true if valid url specified, even if content-type is binary/octet-stream", async () => {
    const canPlayType = mock();

    // Use explicit globalThis.fetch override instead of fetchMock or spyOn,
    // to insulate against concurrent mock.restoreAllMocks() calls from other test suites on CI.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock().mockResolvedValueOnce(
      new Response("", { headers: { "content-type": "binary/octet-stream" } }),
    ) as any;

    try {
      await act(async () => {
        render(<VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.mp4" canPlayType={canPlayType} />);
      });

      await waitFor(() => {
        expect(canPlayType).toHaveBeenCalledWith(true);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should call canPlayUrl and return true if valid file is specified, and content-type is binary/octet-stream but no file extension", async () => {
    const canPlayType = mock();

    // Use explicit globalThis.fetch override instead of fetchMock or spyOn,
    // to insulate against concurrent mock.restoreAllMocks() calls from other test suites on CI.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock().mockResolvedValueOnce(
      new Response("", { headers: { "content-type": "binary/octet-stream" } }),
    ) as any;

    try {
      await act(async () => {
        render(<VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow" canPlayType={canPlayType} />);
      });

      await waitFor(() => {
        expect(canPlayType).toHaveBeenCalledWith(true);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should call canPlayUrl and return false if invalid url specified", async () => {
    const canPlayType = mock();

    await act(async () => {
      render(<VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.avi" canPlayType={canPlayType} />);
    });

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(false);
    });
  });

  it("should call canPlayUrl and return false if invalid url specified, even if content-type is binary/octet-stream", async () => {
    const canPlayType = mock();

    // Use explicit globalThis.fetch override instead of fetchMock or spyOn,
    // to insulate against concurrent mock.restoreAllMocks() calls from other test suites on CI.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock().mockResolvedValueOnce(
      new Response("", { headers: { "content-type": "binary/octet-stream" } }),
    ) as any;

    try {
      await act(async () => {
        render(<VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow.avi" canPlayType={canPlayType} />);
      });

      await waitFor(() => {
        expect(canPlayType).toHaveBeenCalledWith(false);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
