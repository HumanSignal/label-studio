import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../../utils/bem";
import "./MediaSeeker.scss";

export const MediaSeeker = ({ currentTime, duration, buffer, onSeekStart, onSeekEnd, onChange, video }) => {
  /** @type {import("react").RefObject<HTMLElement>} */
  const seekerRef = useRef();
  const progress = duration && currentTime ? (currentTime / duration) * 100 : 0;
  const [buffered, setBuffered] = useState(0);

  /**
   * @param {MouseEvent} e
   */
  const handleMouseDown = useCallback(
    (e) => {
      if (cn("audio-seeker").closest(e.target)) {
        e.stopPropagation();
        e.preventDefault();

        const { left, width } = seekerRef.current.getBoundingClientRect();
        const initialX = e.pageX - (left + 5);
        const clickedProgress = duration * Math.max(0, Math.min(initialX / width, 1));

        const seekProgress = (e) => {
          const newX = e.pageX - (left + 5);
          const newProgress = duration * Math.max(0, Math.min(newX / width, 1));

          onChange(newProgress);
        };

        const cancelEvents = (e) => {
          e.stopPropagation();
          e.preventDefault();

          document.removeEventListener("mousemove", seekProgress);
          document.removeEventListener("mouseup", cancelEvents);
          onSeekEnd?.();
        };

        document.addEventListener("mousemove", seekProgress);
        document.addEventListener("mouseup", cancelEvents);

        onSeekStart?.();
        onChange?.(clickedProgress);
      }
    },
    [seekerRef, onChange, onSeekStart, onSeekEnd],
  );

  useEffect(() => {
    if (duration > 0 && buffer) {
      for (let i = 0; i < buffer.length; i++) {
        if (buffer.start(buffer.length - 1 - i) < currentTime) {
          const size = (buffer.end(buffer.length - 1 - i) / duration) * 100;

          setBuffered(size);
          break;
        }
      }
    }
  }, [buffer, duration, currentTime]);

  return (
    <div className={cn("audio-seeker").toClassName()} ref={seekerRef} onMouseDownCapture={handleMouseDown}>
      <div className={cn("audio-seeker").elem("wrapper").mod({ video }).toClassName()}>
        <div className={cn("audio-seeker").elem("progress").toClassName()} style={{ width: `${progress}%` }} />
        <div className={cn("audio-seeker").elem("buffer").toClassName()} style={{ width: `${buffered}%` }} />
      </div>
    </div>
  );
};
