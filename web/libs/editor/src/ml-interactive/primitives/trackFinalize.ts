/**
 * Pure helpers for finalizing SAM2 video tracking after cancel or completion.
 * Keeps incomplete / malformed keyframes out of VideoVectorRegion.sequence
 * (BROS-1511).
 */

export type BackendTrackFrame = {
  frame: number;
  time_ms?: number;
};

/**
 * Map backend frame metadata into the editor's one-based display frame space.
 * `time_ms` is preferred because backend frame indices can use a different FPS.
 */
export function backendFrameToDisplayFrame(frame: BackendTrackFrame, fps: number): number {
  return frame.time_ms != null ? Math.max(1, Math.round((frame.time_ms / 1000) * fps) + 1) : frame.frame + 1;
}

export type TrackKeyframe = {
  frame: number;
  enabled?: boolean;
  closed?: boolean;
  vertices?: Array<{ id?: string; x: number; y: number }>;
  [key: string]: unknown;
};

export type TrackShapeConstraints = {
  closable?: boolean;
  minPoints?: number;
};

/**
 * A keyframe is "shape-bearing" when it carries drawable geometry.
 * Lifespan terminators are `{ frame, enabled: false }` with no vertices.
 */
export function isShapeBearingKeyframe(keyframe: TrackKeyframe | null | undefined): boolean {
  return Array.isArray(keyframe?.vertices) && keyframe.vertices.length > 0;
}

/**
 * Whether a tracked shape keyframe is complete enough to keep after cancel.
 */
export function isValidTrackKeyframe(
  keyframe: TrackKeyframe | null | undefined,
  constraints: TrackShapeConstraints = {},
): boolean {
  if (!isShapeBearingKeyframe(keyframe)) return false;

  const vertices = keyframe!.vertices!;
  const minPoints = constraints.minPoints;
  if (minPoints != null && vertices.length < minPoints) return false;

  if (constraints.closable === true && keyframe!.closed !== true) return false;

  return true;
}

export type FinalizeTrackSequenceResult = {
  /** Keyframes to keep (shape-bearing valid + non-shape lifespan markers filtered out for rewrite). */
  retained: TrackKeyframe[];
  /** True when no valid shape remains — caller should delete the region. */
  shouldDelete: boolean;
  firstValidFrame: number | null;
  lastValidFrame: number | null;
};

/**
 * After tracking stops (cancel or complete), keep only valid shape keyframes.
 * Lifespan terminators are dropped here; the caller re-applies caps from
 * first/last valid frames.
 */
export function finalizeTrackSequence(
  sequence: TrackKeyframe[],
  constraints: TrackShapeConstraints = {},
): FinalizeTrackSequenceResult {
  const retained: TrackKeyframe[] = [];

  for (const keyframe of sequence) {
    // Drop lifespan-only markers; caller re-caps after prune.
    if (!isShapeBearingKeyframe(keyframe)) continue;
    if (!isValidTrackKeyframe(keyframe, constraints)) continue;
    retained.push(keyframe);
  }

  if (retained.length === 0) {
    return {
      retained: [],
      shouldDelete: true,
      firstValidFrame: null,
      lastValidFrame: null,
    };
  }

  const sorted = [...retained].sort((a, b) => a.frame - b.frame);
  const frames = sorted.map((k) => k.frame);
  return {
    retained: sorted,
    shouldDelete: false,
    firstValidFrame: Math.min(...frames),
    lastValidFrame: Math.max(...frames),
  };
}

export type TrackLifespanCutoffs = {
  left?: number;
  right?: number;
};

export type TrackDirection = "forward" | "backward" | "both";

/**
 * Lifespan terminators must sit strictly outside the first/last valid frames.
 */
export function getTrackLifespanCutoffs(
  direction: TrackDirection,
  firstValidFrame: number | null,
  lastValidFrame: number | null,
  totalFrames: number,
): TrackLifespanCutoffs {
  if (firstValidFrame === null || lastValidFrame === null) return {};

  const cutoffs: TrackLifespanCutoffs = {};
  if ((direction === "backward" || direction === "both") && firstValidFrame > 1) {
    cutoffs.left = firstValidFrame - 1;
  }
  if ((direction === "forward" || direction === "both") && lastValidFrame < totalFrames) {
    cutoffs.right = lastValidFrame + 1;
  }
  return cutoffs;
}
