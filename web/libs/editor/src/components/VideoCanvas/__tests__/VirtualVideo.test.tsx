import { render, waitFor } from "@testing-library/react";
import fetchMock from "jest-fetch-mock";
import { pathToFileURL } from "node:url";

let VirtualVideo: any;

const loadVirtualVideo = async () => {
  const preloaded = (globalThis as any).__realVirtualVideo;
  if (preloaded?.VirtualVideo) return preloaded;
  const abs = require.resolve("../VirtualVideo");
  const moduleUrl = `${pathToFileURL(abs).href}?bun_actual=${Date.now()}`;
  const mod = await import(moduleUrl);
  return mod?.default ? { ...mod, ...mod.default } : mod;
};

describe("VirtualVideo", () => {
  beforeEach(async () => {
    fetchMock.resetMocks();
    VirtualVideo = await loadVirtualVideo();
  });

  it("should call canPlayUrl and return false if no url specified", async () => {
    const canPlayType = mock();

    render(<VirtualVideo.VirtualVideo canPlayType={canPlayType} />);

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(false);
    });
  });

  it("should call canPlayUrl and return true if valid url specified", async () => {
    const canPlayType = mock();

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.mp4"
        canPlayType={canPlayType}
      />,
    );

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(true);
    });
  });

  it("should call canPlayUrl and return true if valid relative url specified", async () => {
    const canPlayType = mock();

    render(<VirtualVideo.VirtualVideo src="/files/opossum_intro.webm" canPlayType={canPlayType} />);

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(true);
    });
  });

  it("should call canPlayUrl and return true if valid url specified, even if content-type is binary/octet-stream", async () => {
    const canPlayType = mock();

    // return binary/octet-stream for all requests, mimicking the situation where
    // the server doesn't set the content-type header and defaults to binary/octet-stream
    fetchMock.mockResponseOnce("", {
      headers: {
        "content-type": "binary/octet-stream",
      },
    });

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.mp4"
        canPlayType={canPlayType}
      />,
    );

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(true);
    });
  });

  it("should call canPlayUrl and return true if valid file is specified, and content-type is binary/octet-stream but no file extension", async () => {
    const canPlayType = mock();

    // This test is the only one that actually triggers a fetch() call (no file extension
    // means canPlayUrl must probe the server). Use spyOn directly on globalThis.fetch
    // because the fetchMock shim may lose its mock API after mock.restore() on Linux.
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { headers: { "content-type": "binary/octet-stream" } }),
    );

    try {
      render(
        <VirtualVideo.VirtualVideo
          src="https://app.heartex.ai/static/samples/opossum_snow"
          canPlayType={canPlayType}
        />,
      );

      await waitFor(() => {
        expect(canPlayType).toHaveBeenCalledWith(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("should call canPlayUrl and return false if invalid url specified", async () => {
    const canPlayType = mock();

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.avi"
        canPlayType={canPlayType}
      />,
    );

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(false);
    });
  });

  it("should call canPlayUrl and return false if invalid url specified, even if content-type is binary/octet-stream", async () => {
    const canPlayType = mock();

    // return binary/octet-stream for all requests, mimicking the situation where
    // the server doesn't set the content-type header and defaults to binary/octet-stream
    fetchMock.mockResponseOnce("", {
      headers: {
        "content-type": "binary/octet-stream",
      },
    });

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.avi"
        canPlayType={canPlayType}
      />,
    );

    await waitFor(() => {
      expect(canPlayType).toHaveBeenCalledWith(false);
    });
  });
});
