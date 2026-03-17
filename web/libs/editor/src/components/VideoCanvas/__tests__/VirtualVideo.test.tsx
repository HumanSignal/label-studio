import React from "react";
import { render } from "@testing-library/react";
import * as VirtualVideo from "../VirtualVideo";

function mockFetchResponse(contentType: string) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    headers: { get: (name: string) => (name === "content-type" ? contentType : null) },
  });
}

describe("VirtualVideo", () => {
  beforeEach(() => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReset();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      headers: { get: () => null },
    });
  });

  it("should call canPlayUrl and return false if no url specified", async () => {
    const canPlayType = vi.fn();

    render(<VirtualVideo.VirtualVideo canPlayType={canPlayType} />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(canPlayType).toHaveBeenCalledWith(false);
  });

  it("should call canPlayUrl and return true if valid url specified", async () => {
    const canPlayType = vi.fn();

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.mp4"
        canPlayType={canPlayType}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(canPlayType).toHaveBeenCalledWith(true);
  });

  it("should call canPlayUrl and return true if valid relative url specified", async () => {
    const canPlayType = vi.fn();

    render(<VirtualVideo.VirtualVideo src="/files/opossum_intro.webm" canPlayType={canPlayType} />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(canPlayType).toHaveBeenCalledWith(true);
  });

  it("should call canPlayUrl and return true if valid url specified, even if content-type is binary/octet-stream", async () => {
    const canPlayType = vi.fn();

    mockFetchResponse("binary/octet-stream");

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.mp4"
        canPlayType={canPlayType}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(canPlayType).toHaveBeenCalledWith(true);
  });

  it("should call canPlayUrl and return true if valid file is specified, and content-type is binary/octet-stream but no file extension", async () => {
    const canPlayType = vi.fn();

    mockFetchResponse("binary/octet-stream");

    render(
      <VirtualVideo.VirtualVideo src="https://app.heartex.ai/static/samples/opossum_snow" canPlayType={canPlayType} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(canPlayType).toHaveBeenCalledWith(true);
  });

  it("should call canPlayUrl and return false if invalid url specified", async () => {
    const canPlayType = vi.fn();

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.avi"
        canPlayType={canPlayType}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(canPlayType).toHaveBeenCalledWith(false);
  });

  it("should call canPlayUrl and return false if invalid url specified, even if content-type is binary/octet-stream", async () => {
    const canPlayType = vi.fn();

    mockFetchResponse("binary/octet-stream");

    render(
      <VirtualVideo.VirtualVideo
        src="https://app.heartex.ai/static/samples/opossum_snow.avi"
        canPlayType={canPlayType}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(canPlayType).toHaveBeenCalledWith(false);
  });
});
