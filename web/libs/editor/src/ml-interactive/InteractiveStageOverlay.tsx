/**
 * Stage overlay that owns interactive-ML prompting for one bound control.
 *
 * Renders inside an object tag (Image/Video). Mounted by a host component
 * that observes the annotation's controls, picks the one with a capability
 * binding + selected label, and passes it in. The overlay:
 *
 *   - attaches click/drag capture to the object tag's Konva stage
 *   - renders a mask-preview Konva layer when a proposal is in flight
 *   - draws prompt points / drag box overlays via an HTML portal
 *   - shows a floating Accept/Reject/Track toolbar on the proposed region
 *
 * The entire behaviour here is driven by the control's InteractivePromptMixin
 * state — no local state machine. Backend talks to LS Django's
 * /interactive-annotating proxy via the shared primitives.
 */

import { observer } from "mobx-react";
import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@humansignal/ui";

import { makeInteractiveController } from "./controller";
import { acceptInteractiveMask } from "./actions";
import { useBackendInference } from "./primitives/useBackendInference";
import { useInputHandlers } from "./primitives/useInputHandlers";
import { getNativeDimensions } from "./primitives/utils";
import type { InteractiveBinding } from "./types";
import type { InteractivePromptPoint } from "../mixins/InteractivePromptMixin";
// @ts-expect-error — CSS-module typings aren't generated in this workspace;
// the bundler resolves at build time.
import styles from "./InteractiveStageOverlay.module.css";

interface InteractiveStageOverlayProps {
  control: any;
  binding: InteractiveBinding;
  /** Sibling Labels tag when the drawing control doesn't carry labels. */
  labelSource?: any;
}

export const InteractiveStageOverlay = observer(({ control, binding, labelSource }: InteractiveStageOverlayProps) => {
  // A stable controller wrapping the MST control. Must be stable (same
  // object across renders) so the primitives' effect deps don't churn;
  // mobx getters on the wrapper are what provide reactivity.
  const controller = useMemo(() => makeInteractiveController(control, binding), [control, binding]);

  const { predict: predictFn, predictBox: predictBoxFn, abortInflight } = useBackendInference(controller);

  // Sync the global auto-annotation toggle → start/stop (matches the SAM
  // tag's existing behaviour; this is how the user enables/disables the
  // interactive mode without touching config).
  useEffect(() => {
    const s = controller.state;
    if (s === "resolving" || s === "error" || s === "idle") return;
    if (controller.autoAnnotationEnabled && s === "stopped") {
      controller.start();
    } else if (!controller.autoAnnotationEnabled && controller.isActive) {
      controller.stop();
    }
  }, [controller.autoAnnotationEnabled, controller.state, controller.isActive]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const konvaLayerRef = useRef<Konva.Layer | null>(null);
  const konvaImageRef = useRef<Konva.Image | null>(null);
  const konvaSourceRef = useRef<HTMLCanvasElement | null>(null);

  // Counter bumped whenever a new mask lands. Used as the canvas / glare
  // `key` so React remounts them — that's how we replay the CSS animation
  // each time the backend returns a fresh proposal. A plain ref mutated
  // in render is fine (no state / re-render triggered on our side; the
  // observer re-render that brought in `controller.maskData` is already
  // in flight).
  const maskKeyRef = useRef(0);
  const prevMaskRef = useRef<Uint8Array | null | undefined>(undefined);
  if (controller.maskData !== prevMaskRef.current) {
    prevMaskRef.current = controller.maskData;
    if (controller.maskData) maskKeyRef.current += 1;
  }

  const imageTag = controller.imageTag;
  const isVideo = controller.isVideo;
  const labelColor = (labelSource ?? control).selectedLabels?.[0]?.background;

  const maskColor = useMemo(() => {
    let r = 0;
    let g = 120;
    let b = 255;
    const hex = labelColor;
    if (hex && hex.length >= 7) {
      r = Number.parseInt(hex.slice(1, 3), 16);
      g = Number.parseInt(hex.slice(3, 5), 16);
      b = Number.parseInt(hex.slice(5, 7), 16);
    }
    return { r, g, b };
  }, [labelColor]);

  // Data URL of the alpha channel used by the glare's CSS mask-image so
  // the sweep is clipped to the mask shape rather than flashing across
  // the entire overlay. Regenerated each paint.
  const [glareMaskUrl, setGlareMaskUrl] = useState<string | null>(null);

  // HTML canvas mask preview — image path only (video uses Konva below).
  useEffect(() => {
    if (isVideo) return;
    if (!controller.maskData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = controller.maskWidth;
    canvas.height = controller.maskHeight;
    const imgData = ctx.createImageData(controller.maskWidth, controller.maskHeight);
    for (let i = 0; i < controller.maskData.length; i++) {
      if (controller.maskData[i]) {
        imgData.data[i * 4] = maskColor.r;
        imgData.data[i * 4 + 1] = maskColor.g;
        imgData.data[i * 4 + 2] = maskColor.b;
        imgData.data[i * 4 + 3] = 120;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Build a separate alpha-only canvas for the glare mask. Using the
    // color canvas directly would mask the glare by its own alpha (120),
    // dimming the shimmer; we want a binary 0/255 alpha silhouette so
    // the glare is fully visible inside the region.
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = controller.maskWidth;
    maskCanvas.height = controller.maskHeight;
    const mctx = maskCanvas.getContext("2d");
    if (mctx) {
      const md = mctx.createImageData(controller.maskWidth, controller.maskHeight);
      for (let i = 0; i < controller.maskData.length; i++) {
        if (controller.maskData[i]) {
          md.data[i * 4] = 255;
          md.data[i * 4 + 1] = 255;
          md.data[i * 4 + 2] = 255;
          md.data[i * 4 + 3] = 255;
        }
      }
      mctx.putImageData(md, 0, 0);
      setGlareMaskUrl(maskCanvas.toDataURL());
    }
  }, [isVideo, controller.maskData, controller.maskWidth, controller.maskHeight, maskColor]);

  // Drop the old data URL as soon as the mask clears so a stale URL
  // doesn't leak into the next prompt session.
  useEffect(() => {
    if (!controller.maskData) setGlareMaskUrl(null);
  }, [controller.maskData]);

  // Konva mask preview — video path. Two effects on purpose:
  //
  //   1. Paint when the mask itself changes (data, dims, color, tracking
  //      visibility). This is the expensive loop — one alpha write per
  //      mask pixel — so we don't want it re-running on zoom/pan deltas.
  //   2. Reposition when the stage's working area changes (zoom, pan,
  //      fullscreen, resize). Cheap setAttrs + batchDraw.
  //
  // Originally these were collapsed into one effect with `workingArea` in
  // its deps, which made every zoom step re-walk all maskData pixels and
  // janked the video.
  const workingArea = isVideo ? imageTag?.workingArea : null;
  const waKey = workingArea ? `${workingArea.x},${workingArea.y},${workingArea.width},${workingArea.height}` : "";

  useEffect(() => {
    if (!isVideo) return;
    const stage = imageTag?.stageRef as Konva.Stage | undefined;
    if (!stage || typeof stage.add !== "function") return;

    const hide = !controller.maskData || !controller.maskWidth || !controller.maskHeight || controller.isTracking;
    if (hide) {
      if (konvaImageRef.current?.visible()) {
        konvaImageRef.current.visible(false);
        konvaLayerRef.current?.batchDraw();
      }
      return;
    }

    if (!konvaLayerRef.current) {
      konvaLayerRef.current = new Konva.Layer({ name: "interactive-mask-preview", listening: false });
      stage.add(konvaLayerRef.current);
    }
    if (!konvaSourceRef.current) {
      konvaSourceRef.current = document.createElement("canvas");
    }

    const src = konvaSourceRef.current;
    if (src.width !== controller.maskWidth) src.width = controller.maskWidth;
    if (src.height !== controller.maskHeight) src.height = controller.maskHeight;
    const ctx = src.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.createImageData(controller.maskWidth, controller.maskHeight);
    for (let i = 0; i < controller.maskData!.length; i++) {
      if (controller.maskData![i]) {
        imgData.data[i * 4] = maskColor.r;
        imgData.data[i * 4 + 1] = maskColor.g;
        imgData.data[i * 4 + 2] = maskColor.b;
        imgData.data[i * 4 + 3] = 120;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const wa = workingArea ?? { x: 0, y: 0, width: stage.width(), height: stage.height() };
    if (!konvaImageRef.current) {
      konvaImageRef.current = new Konva.Image({
        image: src,
        x: wa.x,
        y: wa.y,
        width: wa.width,
        height: wa.height,
        listening: false,
        opacity: 0,
      });
      konvaLayerRef.current.add(konvaImageRef.current);
    } else {
      konvaImageRef.current.image(src);
      konvaImageRef.current.visible(true);
      konvaImageRef.current.opacity(0);
    }
    // Fade-in to mirror the image path's CSS animation. Each new mask
    // arrival (this effect re-runs on maskData identity) replays the
    // tween, so subsequent refinements read as fresh proposals too.
    konvaImageRef.current.to({ opacity: 1, duration: 0.24, easing: Konva.Easings.EaseOut });
    konvaLayerRef.current.batchDraw();
    // workingArea intentionally omitted — repositioning lives in a
    // separate effect below so zoom/pan don't trigger a full repaint.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see comment
  }, [
    isVideo,
    imageTag?.stageRef,
    controller.maskData,
    controller.maskWidth,
    controller.maskHeight,
    controller.isTracking,
    maskColor,
  ]);

  // Reposition-only: cheap setAttrs whenever the stage's working area
  // changes (zoom, pan, fullscreen). No pixel work.
  useEffect(() => {
    if (!isVideo) return;
    const img = konvaImageRef.current;
    const layer = konvaLayerRef.current;
    if (!img || !layer || !workingArea) return;
    img.setAttrs({
      x: workingArea.x,
      y: workingArea.y,
      width: workingArea.width,
      height: workingArea.height,
    });
    layer.batchDraw();
  }, [isVideo, waKey, workingArea]);

  useEffect(() => {
    return () => {
      konvaLayerRef.current?.destroy();
      konvaLayerRef.current = null;
      konvaImageRef.current = null;
      konvaSourceRef.current = null;
    };
  }, []);

  // Accept for the Enter keyboard shortcut (wired inside useInputHandlers);
  // the visible Accept/Reject/Track buttons live in the bottombar toolbar.
  const handleAccept = useCallback(() => {
    acceptInteractiveMask(control, binding, labelSource);
  }, [control, binding, labelSource]);

  useInputHandlers(controller, overlayRef, handleAccept, predictFn, predictBoxFn);

  const imgDisplayBounds = useMemo(() => {
    if (!imageTag) return { left: 0, top: 0, width: 0, height: 0 };
    if (isVideo) {
      const wa = imageTag.workingArea;
      if (wa) return { left: wa.x, top: wa.y, width: wa.width, height: wa.height };
      const stg = imageTag.stageRef;
      return { left: 0, top: 0, width: stg?.width?.() ?? 0, height: stg?.height?.() ?? 0 };
    }
    const nw = imageTag.naturalWidth ?? 0;
    const nh = imageTag.naturalHeight ?? 0;
    const sz = imageTag.stageZoom ?? 1;
    const zs = imageTag.zoomScale ?? 1;
    const align = imageTag.alignmentOffset ?? { x: 0, y: 0 };
    const panX = imageTag.zoomingPositionX ?? 0;
    const panY = imageTag.zoomingPositionY ?? 0;
    return {
      left: panX + align.x,
      top: panY + align.y,
      width: nw * sz * zs,
      height: nh * sz * zs,
    };
  }, [
    imageTag,
    isVideo,
    imageTag?.stageRef,
    imageTag?.workingArea,
    imageTag?.naturalWidth,
    imageTag?.naturalHeight,
    imageTag?.stageZoom,
    imageTag?.zoomScale,
    imageTag?.alignmentOffset?.x,
    imageTag?.alignmentOffset?.y,
    imageTag?.zoomingPositionX,
    imageTag?.zoomingPositionY,
  ]);

  const portalTarget = imageTag?.stageRef?.content ?? null;
  if (!portalTarget) return null;

  return createPortal(
    <div
      ref={isVideo ? undefined : overlayRef}
      style={{
        position: "absolute",
        left: imgDisplayBounds.left,
        top: imgDisplayBounds.top,
        width: imgDisplayBounds.width,
        height: imgDisplayBounds.height,
        cursor: isVideo ? undefined : "crosshair",
        zIndex: 50,
        pointerEvents: isVideo ? "none" : controller.isActive ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      {controller.maskData && !isVideo && (
        <>
          <canvas key={`mask-${maskKeyRef.current}`} ref={canvasRef} className={styles.maskCanvas} />
          {/* Glare sweep clipped to the mask shape via --mask-url (CSS
              mask-image). Waits until the URL is ready so we don't flash
              a full-overlay band during the one-frame window between
              paint effect and its data-URL export. */}
          {glareMaskUrl && (
            <div
              key={`glare-${maskKeyRef.current}`}
              className={styles.maskGlare}
              style={{
                maskImage: `url(${glareMaskUrl})`,
                WebkitMaskImage: `url(${glareMaskUrl})`,
              }}
              aria-hidden
            />
          )}
        </>
      )}

      {/* Busy indicator — a small pill at the bottom of the canvas so the
          user knows the backend is working without the scrim obscuring
          what they clicked on. Shows during the short window between
          sending a prompt and receiving the mask (or during tracking,
          when the Konva preview is hidden). `pointer-events: none` so
          clicks continue to reach the stage beneath. */}
      {(controller.state === "encoding" || controller.state === "resolving" || controller.isTracking) && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--spacing-tight)",
            padding: "var(--spacing-tight) var(--spacing-base)",
            borderRadius: 999,
            // High-contrast pill over arbitrary image — use the neutral
            // shadow triplet at high alpha so it reads cleanly on both
            // light and dark imagery (light theme → dark pill, dark
            // theme → equally dark pill).
            background: "rgb(var(--color-neutral-shadow-raw) / 65%)",
            color: "var(--color-neutral-background)",
            fontSize: "var(--font-size-body-small)",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 52,
          }}
        >
          <Spinner size={16} />
          <span>{controller.isTracking ? "Tracking…" : "Processing…"}</span>
        </div>
      )}

      {controller.box &&
        imageTag &&
        (() => {
          const nd = getNativeDimensions(imageTag, controller.isVideo);
          const nw = nd.width || 1;
          const nh = nd.height || 1;
          const box = controller.box as { x: number; y: number; width: number; height: number };
          return (
            <div
              style={{
                position: "absolute",
                left: `${(box.x / nw) * 100}%`,
                top: `${(box.y / nh) * 100}%`,
                width: `${(box.width / nw) * 100}%`,
                height: `${(box.height / nh) * 100}%`,
                // Primary brand color so the draft rect reads as "active
                // input in progress" — semantic match for a prompt that
                // hasn't been committed yet.
                border: "2px solid var(--color-primary-surface)",
                background: "rgb(var(--color-primary-surface-raw) / 12%)",
                boxShadow: "0 0 0 1px rgb(var(--color-neutral-shadow-raw) / 40%)",
                pointerEvents: "none",
                zIndex: 51,
              }}
            />
          );
        })()}

      {(controller.prompts as InteractivePromptPoint[]).map((p, i) => {
        if (!imageTag) return null;
        const nd = getNativeDimensions(imageTag, controller.isVideo);
        const nw = nd.width || 1;
        const nh = nd.height || 1;
        return (
          <button
            type="button"
            key={i}
            data-sa-point="true"
            aria-label={p.positive ? "Remove positive prompt" : "Remove negative prompt"}
            title="Click to remove"
            onMouseDown={(e) => {
              // Left-click only — right-click should fall through to the
              // browser's default context menu rather than removing the
              // prompt. Without this filter, right-clicking a point bound
              // to clear it (a leftover from when right-click was the
              // negative-prompt gesture).
              if (e.button !== 0) return;
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              e.preventDefault();
              controller.removePromptAt(i);
              // Re-run prediction after removing a prompt — equivalent to
              // SAM's `redecode` flow.
              if (controller.prompts.length > 0 && predictFn) {
                const nd2 = getNativeDimensions(imageTag, controller.isVideo);
                if (controller.state === "prompting") {
                  predictFn(controller.prompts, nd2.width, nd2.height);
                }
              } else if (controller.prompts.length === 0) {
                // User pulled every prompt — cancel any in-flight predict so
                // a late response doesn't bring the mask back, then reset
                // the visible state back to a clean "ready" surface.
                abortInflight();
                controller.clearMaskPreview();
                if (controller.state === "encoding") controller.setState("started");
              }
            }}
            className={`${styles.point} ${p.positive ? styles["point--positive"] : styles["point--negative"]}`}
            style={{
              left: `${(p.x / nw) * 100}%`,
              top: `${(p.y / nh) * 100}%`,
            }}
          />
        );
      })}
    </div>,
    portalTarget,
  );
});
