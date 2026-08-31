/**
 * Hook: resolves the interactive ML backend for the current project and
 * provides a `predict` callback that calls `/api/ml/:pk/interactive-annotating`.
 *
 * This is the ML-backend counterpart to `useWorkerLifecycle` — same mask
 * contract (`item.setMask`), different inference transport.
 */

import { useCallback, useEffect, useRef } from "react";
import { ToastType, useToast } from "@humansignal/ui";
import type { InteractiveController } from "../controller";
import type { PromptBox, PromptPoint } from "./types";
import { findVideoElement } from "./utils";

const API_BASE = window.APP_SETTINGS?.hostname ?? "";
const PREWARM_WINDOW = 20;

function getCsrfToken(): string {
  const match = document.cookie.split(";").find((c) => c.trim().startsWith("csrftoken="));
  return match ? match.trim().split("=")[1] : "";
}

async function decodePngToMask(dataURL: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const mask = new Uint8Array(img.width * img.height);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = imageData.data[i * 4] > 127 ? 1 : 0;
      }
      resolve({ data: mask, width: img.width, height: img.height });
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

export type PredictFn = (prompts: PromptPoint[], width: number, height: number) => Promise<void>;
export type PredictBoxFn = (box: PromptBox, width: number, height: number) => Promise<void>;

export interface TrackRequest {
  prompts: PromptPoint[];
  /**
   * Optional bounding-box prompt derived from the accepted mask. When
   * present, the backend uses the box to anchor SAM2 tracking — this is
   * far more robust than a single centroid point for masks that cover
   * multiple touching objects (e.g. person + vehicle), where the
   * centroid can fall on just one part and SAM2 then tracks only that
   * sub-region.
   */
  box?: PromptBox;
  width: number;
  height: number;
  frame: number;
  /** Current video time in ms — fps-agnostic, preferred by the BE. */
  timeMs?: number;
  maxFrames: number;
  /** Tracking horizon in ms. If omitted, BE falls back to maxFrames. */
  maxDurationMs?: number;
  direction: "forward" | "backward" | "both";
}

export interface TrackFrameResult {
  frame: number;
  /** Time of this frame in ms (ground truth for FE/BE frame alignment). */
  time_ms?: number;
  imageDataURL: string;
  width: number;
  height: number;
}

export type TrackFn = (
  req: TrackRequest,
  onFrames: (frames: TrackFrameResult[], produced: number, total: number) => Promise<void>,
) => Promise<void>;

export function useBackendInference(item: InteractiveController | null): {
  predict: PredictFn | null;
  predictBox: PredictBoxFn | null;
  track: TrackFn | null;
  /** Abort any in-flight predict — used when the user removes the last
   * prompt before the backend has returned, so a late response doesn't
   * resurrect a mask the user already cancelled. */
  abortInflight: () => void;
} {
  const backendIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const trackAbortRef = useRef<AbortController | null>(null);
  const toast = useToast();

  const reportError = useCallback(
    (msg: string) => {
      // Mixin handles UI recovery (resets the failed prompt + draft box,
      // returns state to "started"/"prompting"); we surface the message
      // via the standardized toast so the bottombar stays presentational.
      item?.setError(msg);
      toast?.show({ type: ToastType.error, message: msg });
    },
    [item, toast],
  );

  useEffect(() => {
    if (!item || !item.annotation) return;
    let cancelled = false;

    // Fast path: caller already resolved the backend id (new control-tag
    // capability-binding flow). Skip the project-wide fetch.
    if (typeof item.backendId === "number" && item.backendId > 0) {
      backendIdRef.current = item.backendId;
      if (item.state === "idle" || item.state === "resolving") {
        item.setState("stopped");
      }
      return () => {
        cancelled = true;
      };
    }

    // Legacy path: controller doesn't carry a backendId — resolve by
    // project-wide query (used by the original SegmentAnything tag flow).
    (async () => {
      const store = item.annotation?.store;
      const projectId = store?.project?.id ?? window.DM?.project?.id;
      if (!projectId) {
        reportError("Cannot determine project ID");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/ml/?project=${projectId}&is_interactive=true`);
        if (!res.ok) {
          reportError(`Failed to fetch ML backends: HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        const backends = data.results ?? data;
        if (!backends?.length) {
          reportError("No interactive ML backend connected. Go to Settings → Model to connect one.");
          return;
        }
        if (cancelled) return;
        backendIdRef.current = backends[0].id;
        item.setState("stopped");
      } catch (err: any) {
        if (!cancelled) reportError(err?.message ?? "Failed to resolve ML backend");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.annotation, reportError]);

  // Helper: fire a context event to the backend (prewarm / release)
  const sendEvent = useCallback(
    async (event: string, extra: Record<string, any> = {}) => {
      const pk = backendIdRef.current;
      if (!pk) return;
      const store = item?.annotation?.store;
      const taskId = store?.task?.id;
      if (!taskId) return;

      const context = { event, ...extra };
      try {
        await fetch(`${API_BASE}/api/ml/${pk}/interactive-annotating`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrfToken() },
          credentials: "same-origin",
          body: JSON.stringify({ task: taskId, context }),
        });
      } catch {
        // best-effort, don't block the UI
      }
    },
    [item],
  );

  // On Start → prewarm (download + cache video); on Stop → abort + release cache
  useEffect(() => {
    if (!item) return;

    if (item.state === "started" && item.isVideo && backendIdRef.current) {
      sendEvent("prewarm", {
        frame: item.currentVideoFrame,
        window: PREWARM_WINDOW,
        direction: "forward",
      });
    }

    if (item.state === "stopped") {
      // Abort any in-flight predict/track requests
      abortRef.current?.abort();
      trackAbortRef.current?.abort();
    }
  }, [item?.state]);

  // On unmount or annotation change → release backend cache
  useEffect(() => {
    if (!item) return;
    return () => {
      abortRef.current?.abort();
      trackAbortRef.current?.abort();
      sendEvent("release");
    };
  }, [item?.annotation]);

  const runPredict = useCallback(
    async (result: Array<Record<string, any>>) => {
      const pk = backendIdRef.current;
      if (!pk || !item) return;

      const store = item.annotation?.store;
      const taskId = store?.task?.id;
      if (!taskId) {
        reportError("Cannot determine task ID");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const context: Record<string, any> = { result };
      if (item.isVideo) {
        const videoEl = findVideoElement(item.imageTag);
        // time_ms is the FE/BE-independent ground truth — see Note in BE.
        if (videoEl && Number.isFinite(videoEl.currentTime)) {
          context.time_ms = videoEl.currentTime * 1000;
        }
        context.frame = item.currentVideoFrame;
      }

      try {
        const res = await fetch(`${API_BASE}/api/ml/${pk}/interactive-annotating`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrfToken() },
          credentials: "same-origin",
          signal: controller.signal,
          body: JSON.stringify({ task: taskId, context }),
        });

        if (controller.signal.aborted) return;
        if (!res.ok) {
          const text = await res.text().catch(() => `HTTP ${res.status}`);
          reportError(`ML backend error: ${text}`);
          return;
        }

        const data = await res.json();
        if (data.errors?.length) {
          reportError(data.errors[0]);
          return;
        }

        const prediction = data.data;
        if (!prediction?.result?.length) {
          item.setState("prompting");
          return;
        }

        const value = prediction.result[0].value;
        if (value?.imageDataURL) {
          const mask = await decodePngToMask(value.imageDataURL);
          if (mask && !controller.signal.aborted) {
            item.setMask(mask.data, mask.width, mask.height);
          }
        }

        if (!controller.signal.aborted) item.setState("prompting");
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        reportError(err?.message ?? "ML backend request failed");
      }
    },
    [item, reportError],
  );

  const predict = useCallback(
    (prompts: PromptPoint[], width: number, height: number) =>
      runPredict(
        prompts.map((p) => ({
          type: "keypointlabels",
          value: {
            x: (p.x / width) * 100,
            y: (p.y / height) * 100,
            positive: p.positive,
          },
        })),
      ),
    [runPredict],
  );

  const predictBox = useCallback(
    (box: PromptBox, width: number, height: number) =>
      runPredict([
        {
          type: "rectanglelabels",
          value: {
            x: (box.x / width) * 100,
            y: (box.y / height) * 100,
            width: (box.width / width) * 100,
            height: (box.height / height) * 100,
          },
        },
      ]),
    [runPredict],
  );

  const mlCall = useCallback(
    async (context: Record<string, any>, signal?: AbortSignal) => {
      const pk = backendIdRef.current;
      if (!pk) return null;
      const store = item?.annotation?.store;
      const taskId = store?.task?.id;
      if (!taskId) return null;

      const res = await fetch(`${API_BASE}/api/ml/${pk}/interactive-annotating`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrfToken() },
        credentials: "same-origin",
        signal,
        body: JSON.stringify({ task: taskId, context }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.errors?.length) return null;
      return data.data;
    },
    [item],
  );

  const track = useCallback(
    async (
      req: TrackRequest,
      onFrames: (frames: TrackFrameResult[], produced: number, total: number) => Promise<void>,
    ): Promise<void> => {
      if (!item) return;
      trackAbortRef.current?.abort();
      const controller = new AbortController();
      trackAbortRef.current = controller;
      let sessionId: string | null = null;

      const sendCancel = () => {
        if (!sessionId) return;
        // Fire-and-forget; don't piggyback on the aborted controller.
        mlCall({ event: "track_cancel", session_id: sessionId }).catch(() => {});
      };

      // A box prompt is preferred over points for tracking: SAM2 segments
      // the whole object inside the box rather than whichever blob sits at
      // a single centroid. Fall back to points when no box is supplied
      // (e.g. caller is using a pure point-prompt flow).
      const result = req.box
        ? [
            {
              type: "rectanglelabels",
              value: {
                x: (req.box.x / req.width) * 100,
                y: (req.box.y / req.height) * 100,
                width: (req.box.width / req.width) * 100,
                height: (req.box.height / req.height) * 100,
              },
            },
          ]
        : req.prompts.map((p) => ({
            type: "keypointlabels",
            value: {
              x: (p.x / req.width) * 100,
              y: (p.y / req.height) * 100,
              positive: p.positive,
            },
          }));

      const context: Record<string, any> = {
        event: "track",
        frame: req.frame,
        max_frames: req.maxFrames,
        direction: req.direction,
        result,
      };
      if (req.timeMs != null) context.time_ms = req.timeMs;
      if (req.maxDurationMs != null) context.max_duration_ms = req.maxDurationMs;

      try {
        const startResp = await mlCall(context, controller.signal);
        if (!startResp?.result?.length || controller.signal.aborted) return;

        sessionId = startResp.result[0].value?.session_id ?? null;
        if (!sessionId) {
          reportError("Backend did not return a tracking session id");
          return;
        }

        // Long-polled: each track_progress hangs on the BE until frames land
        // (or ~5s timeout). No per-iteration sleep — the server paces us by
        // holding the request.
        while (!controller.signal.aborted) {
          if (item.trackingCancelled) {
            sendCancel();
            return;
          }

          const progress = await mlCall({ event: "track_progress", session_id: sessionId }, controller.signal);
          if (controller.signal.aborted) break;
          if (item.trackingCancelled) {
            sendCancel();
            return;
          }
          if (!progress?.result?.length) continue;

          const value = progress.result[0].value;
          if (value?.error) {
            reportError(String(value.error));
            return;
          }

          const newFrames = (value?.frames ?? []) as TrackFrameResult[];
          const produced = value?.produced ?? 0;
          const total = value?.total ?? req.maxFrames;
          const done = value?.done ?? false;

          if (newFrames.length > 0) {
            await onFrames(newFrames, produced, total);
          }

          if (done) break;
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          sendCancel();
        }
      }
    },
    [item, mlCall, reportError],
  );

  const abortInflight = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const ready = backendIdRef.current !== null;
  return {
    predict: ready ? predict : null,
    predictBox: ready ? predictBox : null,
    track: ready ? track : null,
    abortInflight,
  };
}
