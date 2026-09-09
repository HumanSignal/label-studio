import { fireEvent, render, screen } from "@testing-library/react";
import { MediaCard } from "./media-card";

const FILE = { name: "IMG_9180.mov", size: 16_497_221, contentType: "video/quicktime" };

describe("MediaCard", () => {
  it("failed state offers Retry, Replace and Remove", () => {
    const onRetry = jest.fn();
    render(
      <MediaCard
        state="failed"
        file={FILE}
        kind="video"
        previewUrl="blob:x"
        message="Upload failed"
        onRetry={onRetry}
        onReplace={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(screen.getByTestId("media-card-failed")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText("Replace…")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("uploading state shows progress chip and only Cancel", () => {
    render(
      <MediaCard
        state="uploading"
        file={FILE}
        kind="video"
        previewUrl="blob:x"
        progress={0.62}
        onCancel={() => undefined}
        onReplace={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(screen.getByText("Uploading 62%")).toBeInTheDocument();
    expect(screen.getByTestId("media-card-progress")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.queryByText("Replace…")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
  });

  it("submitted offers Replace only; readonly offers nothing", () => {
    const { rerender } = render(
      <MediaCard
        state="submitted"
        file={FILE}
        kind="video"
        previewUrl="u"
        onReplace={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(screen.getByText("Replace…")).toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();

    rerender(
      <MediaCard
        state="readonly"
        file={FILE}
        kind="video"
        previewUrl="u"
        onReplace={() => undefined}
        onRemove={() => undefined}
      />,
    );
    expect(screen.queryByText("Replace…")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("uploaded state carries a positive chip and offers Remove", () => {
    render(<MediaCard state="uploaded" file={FILE} kind="video" previewUrl="u" onRemove={() => undefined} />);
    expect(screen.getByTestId("media-card-uploaded")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("video renders a play overlay and reports metadata", () => {
    const onMeta = jest.fn();
    render(<MediaCard state="uploaded" file={FILE} kind="video" previewUrl="blob:v" onMediaMetadata={onMeta} />);
    expect(screen.getByTestId("media-card-play")).toBeInTheDocument();
    const video = screen.getByTestId("media-card-media").querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { value: 4.2 });
    Object.defineProperty(video, "videoWidth", { value: 1080 });
    Object.defineProperty(video, "videoHeight", { value: 1920 });
    fireEvent.loadedMetadata(video);
    expect(onMeta).toHaveBeenCalledWith({ durationSec: 4.2, width: 1080, height: 1920 });
  });

  it("image kind renders an img and reports dimensions", () => {
    const onMeta = jest.fn();
    render(
      <MediaCard
        state="uploaded"
        file={{ name: "photo.png", contentType: "image/png", size: 1000 }}
        kind="image"
        previewUrl="blob:i"
        onMediaMetadata={onMeta}
      />,
    );
    const img = screen.getByTestId("media-card-media").querySelector("img") as HTMLImageElement;
    Object.defineProperty(img, "naturalWidth", { value: 800 });
    Object.defineProperty(img, "naturalHeight", { value: 600 });
    fireEvent.load(img);
    expect(onMeta).toHaveBeenCalledWith({ width: 800, height: 600 });
    expect(screen.queryByTestId("media-card-play")).not.toBeInTheDocument();
  });

  it("broken preview shows the honest placeholder and a retry", () => {
    render(
      <MediaCard
        state="uploaded"
        file={FILE}
        kind="video"
        previewUrl="u"
        previewBroken
        onRetryPreview={() => undefined}
      />,
    );
    expect(screen.getByText(/stored safely/)).toBeInTheDocument();
    expect(screen.getByText("Retry preview")).toBeInTheDocument();
    expect(screen.getByTestId("media-card-media").querySelector("video")).toBeNull();
  });

  it("treats an image that loads with zero intrinsic size as broken (redirect/expired-signature failure)", () => {
    const onPreviewError = jest.fn();
    render(
      <MediaCard
        state="uploaded"
        file={{ name: "a.png" }}
        kind="image"
        previewUrl="blob:x"
        onPreviewError={onPreviewError}
      />,
    );
    const img = screen.getByTestId("media-card-media").querySelector("img") as HTMLImageElement;
    Object.defineProperty(img, "naturalWidth", { value: 0 });
    fireEvent.load(img);
    expect(onPreviewError).toHaveBeenCalled();
    // The card must show its own placeholder from INTERNAL state, without the
    // parent passing previewBroken back (the parent's URL-keyed flag desyncs).
    expect(screen.getByText(/stored safely/)).toBeInTheDocument();
    expect(screen.getByTestId("media-card-media").querySelector("img")).toBeNull();
  });

  it("flags the preview broken when it never settles within the timeout", () => {
    jest.useFakeTimers();
    const onPreviewError = jest.fn();
    render(
      <MediaCard
        state="uploaded"
        file={{ name: "a.png" }}
        kind="image"
        previewUrl="blob:never"
        onPreviewError={onPreviewError}
      />,
    );
    expect(onPreviewError).not.toHaveBeenCalled();
    jest.advanceTimersByTime(8000);
    expect(onPreviewError).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("survives a missing file (recovered stored submission) with a neutral header", () => {
    render(
      <MediaCard state="uploaded" file={null} kind="video" previewUrl="u" storedHint onRemove={() => undefined} />,
    );
    expect(screen.getByTestId("media-card-uploaded")).toBeInTheDocument();
    expect(screen.getByText("Submission")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
  });

  it("rejected state carries the metadata row when facts are known", () => {
    render(
      <MediaCard
        state="rejected"
        file={FILE}
        kind="video"
        previewUrl="u"
        meta={{ durationSec: 17.48, width: 480, height: 360 }}
        onRemove={() => undefined}
      />,
    );
    expect(screen.getByText("Not accepted")).toBeInTheDocument();
    expect(screen.getByTestId("media-card-meta")).toHaveTextContent("17.48s");
    expect(screen.getByTestId("media-card-meta")).toHaveTextContent("landscape");
  });
});
