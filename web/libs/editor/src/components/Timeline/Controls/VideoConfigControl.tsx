import type React from "react";
import { type FC, type MouseEvent, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Toggle } from "@humansignal/ui";

import { IconConfig } from "@humansignal/icons";
import { ControlButton } from "../Controls";
import { Slider } from "./Slider";
import styles from "./VideoConfigControl.module.css";

const MIN_SPEED = 0.25;
const MAX_SPEED = 10;

export interface VideoConfigControlProps {
  configModal: boolean;
  onSetModal?: (isOpen: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  loopTimelineRegion: boolean;
  onLoopTimelineRegionChange: (loopRegion: boolean) => void;
  minSpeed?: number;
}

export const VideoConfigControl: FC<VideoConfigControlProps> = ({
  configModal,
  onSetModal,
  speed,
  onSpeedChange,
  loopTimelineRegion,
  onLoopTimelineRegionChange,
  minSpeed = MIN_SPEED,
}) => {
  // Refs for positioning
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Handler for clicks outside the modal
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      // Check if the click is outside both the modal and the button
      if (
        configModal &&
        modalRef.current &&
        buttonRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        // Close the modal
        onSetModal?.(false);
      }
    },
    [configModal, onSetModal],
  );

  const handleButtonClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onSetModal?.(!configModal);
    },
    [configModal, onSetModal],
  );

  const handleContainerClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  // Effect to handle clicks outside the modal
  useEffect(() => {
    if (configModal) {
      // Add event listener when modal is open
      document.addEventListener("click", handleClickOutside as any);
    } else {
      // Remove event listener when modal is closed
      document.removeEventListener("click", handleClickOutside as any);
    }

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("click", handleClickOutside as any);
    };
  }, [configModal, handleClickOutside]);

  // Effect to dynamically position the modal within the viewport
  useEffect(() => {
    // Check if modal is open and refs are attached
    if (configModal && modalRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const modal = modalRef.current;
      // Temporarily make it visible off-screen to measure its actual size
      modal.style.opacity = "0";
      modal.style.position = "fixed"; // Ensure fixed for measurement
      modal.style.top = "-9999px";
      modal.style.left = "-9999px";

      const calculatePosition = () => {
        if (!modalRef.current || !buttonRef.current) return; // Refs might detach
        const modalRect = modal.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const margin = 10; // Margin from viewport edges

        // Default position: below the button, aligned left
        let top = buttonRect.bottom + 5;
        let left = buttonRect.left;

        // Adjust top if modal goes below viewport
        if (top + modalRect.height > viewportHeight - margin) {
          // Try placing above the button first
          const topAbove = buttonRect.top - modalRect.height - 5;
          if (topAbove > margin) {
            top = topAbove; // Place above if enough space
          } else {
            top = viewportHeight - modalRect.height - margin; // Stick to bottom edge
          }
        }

        // Adjust top if modal goes above viewport
        if (top < margin) {
          top = margin;
        }

        // Adjust left if modal goes beyond right edge
        if (left + modalRect.width > viewportWidth - margin) {
          left = viewportWidth - modalRect.width - margin;
        }

        // Adjust left if modal goes beyond left edge
        if (left < margin) {
          left = margin;
        }

        // Apply calculated styles
        modal.style.top = `${top}px`;
        modal.style.left = `${left}px`;
        modal.style.opacity = "1"; // Make visible after positioning
      };

      // Calculate after a short delay or next frame to allow measurement
      requestAnimationFrame(calculatePosition);
    } else if (modalRef.current) {
      // Reset opacity when closing
      modalRef.current.style.opacity = "0";
    }
  }, [configModal]); // Rerun effect when modal visibility changes

  const handleChangePlaybackSpeed = (e: React.FormEvent<HTMLInputElement>) => {
    const _playbackSpeed = Number.parseFloat(e.currentTarget.value);
    if (isNaN(_playbackSpeed)) return;
    onSpeedChange(_playbackSpeed);
  };

  const renderModal = () => {
    const modalJSX = (
      <div
        className={styles.modal}
        ref={modalRef}
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{ opacity: 0, position: "fixed" }}
      >
        <div className={styles.scrollContent}>
          <div className={styles.sectionHeader}>Playback Settings</div>
          <Slider
            min={minSpeed}
            max={MAX_SPEED}
            step={0.05}
            value={speed}
            description={"Playback speed"}
            info={"Increase or decrease the playback speed"}
            onChange={handleChangePlaybackSpeed}
          />
          <div className={styles.toggle}>
            <Toggle
              checked={loopTimelineRegion}
              onChange={(e) => onLoopTimelineRegionChange(e.target.checked)}
              label="Loop Timeline Regions"
              labelProps={{ size: "small" }}
            />
          </div>
        </div>
      </div>
    );

    return typeof document !== "undefined" ? createPortal(modalJSX, document.body) : null;
  };

  return (
    <div className={styles.videoConfig} ref={buttonRef} onClick={handleContainerClick}>
      <ControlButton look={configModal ? "filled" : undefined} onClick={handleButtonClick} aria-label="Video settings">
        {<IconConfig />}
      </ControlButton>
      {configModal && renderModal()}
    </div>
  );
};
