import { type MutableRefObject, useCallback, useEffect, useRef } from "react";
import { FF_VIDEO_FRAME_SEEK_PRECISION, isFF } from "../../../utils/feature-flags";
import type { VideoRef } from "../VideoCanvas";

type UseLoopRangeProps = {
  loopFrameRange?: boolean;
  selectedFrameRange?: { start: number; end: number };
  framerate: number;
  onRedrawRequest?: () => void;
  videoRef: MutableRefObject<HTMLVideoElement | undefined>;
  refSource: VideoRef;
};

type UseLoopRangeReturn = {
  prepareLoop: () => void;
};

export const useLoopRange = ({
  loopFrameRange,
  selectedFrameRange,
  framerate,
  onRedrawRequest,
  videoRef,
  refSource,
}: UseLoopRangeProps): UseLoopRangeReturn => {
  const framerateRef = useRef(framerate);
  framerateRef.current = framerate;
  const sourceRef = useRef(refSource);
  sourceRef.current = refSource;
  const onRedrawRequestRef = useRef(onRedrawRequest);
  onRedrawRequestRef.current = onRedrawRequest;
  const videoFrameCallbackIdRef = useRef<number | null>(null);
  const loopFrameRangeRef = useRef(loopFrameRange ?? false);
  loopFrameRangeRef.current = loopFrameRange ?? false;
  const handleFrameChange = useCallback(
    (_timestamp: number, { mediaTime }: { mediaTime: number }) => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      if (!selectedFrameRange) return;
      const startFrame = selectedFrameRange.start;
      const endFrame = selectedFrameRange.end;

      const currentFrame = isFF(FF_VIDEO_FRAME_SEEK_PRECISION)
        ? Math.ceil(mediaTime * framerateRef.current)
        : Math.round(mediaTime * framerateRef.current);

      if (currentFrame < startFrame) {
        // If current time is before the start of the range, seek to the start
        sourceRef.current.goToFrame(startFrame);
      } else if (currentFrame >= endFrame) {
        if (loopFrameRangeRef.current) {
          // If looping is enabled, reset to the start of the range
          sourceRef.current.goToFrame(endFrame);
          onRedrawRequestRef.current?.();
          videoFrameCallbackIdRef.current = video.requestVideoFrameCallback(() => {
            sourceRef.current.goToFrame(startFrame);
            onRedrawRequestRef.current?.();
            videoFrameCallbackIdRef.current = video.requestVideoFrameCallback(handleFrameChange);
          });
          return;
        }
        // If not looping, pause the video at the end of the range
        sourceRef.current.pause();
        sourceRef.current.goToFrame(endFrame);
        onRedrawRequestRef.current?.();
        return;
      }
      videoFrameCallbackIdRef.current = video.requestVideoFrameCallback(handleFrameChange);
    },
    [selectedFrameRange],
  );
  const watchFrameChange = useCallback(() => {
    const cancelCallback = () => {
      if (videoFrameCallbackIdRef.current) {
        videoRef.current?.cancelVideoFrameCallback(videoFrameCallbackIdRef.current);
        videoFrameCallbackIdRef.current = null;
      }
    };

    cancelCallback();
    const video = videoRef.current;
    if (video && selectedFrameRange) {
      videoFrameCallbackIdRef.current = video.requestVideoFrameCallback(handleFrameChange);
    }
    return cancelCallback;
  }, [selectedFrameRange]);
  useEffect(() => {
    return watchFrameChange();
  }, [selectedFrameRange]);

  const prepareLoop = useCallback(() => {
    if (selectedFrameRange && videoRef.current) {
      const startTime = (selectedFrameRange.start - 1) / framerateRef.current;
      const endTime = (selectedFrameRange.end - 1) / framerateRef.current;

      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        sourceRef.current.goToFrame(selectedFrameRange.start);
      }
      watchFrameChange();
    }
  }, [selectedFrameRange]);

  return { prepareLoop };
};
