import { clamp } from "../../../../utils/utilities";
import type { TimelineRegionKeyframe } from "../../Types";

/** Default timeline viewport height when `timelineHeight` is not set on `<Video>`. */
export const DEFAULT_TIMELINE_VIEWPORT_HEIGHT = 64;

const KEYPOINT_ROW_HEIGHT = 24;
const KEYPOINT_VIRTUAL_OVERSCAN = 5;

export const computeKeypointsVirtualBounds = (
  scrollTop: number,
  regionsLength: number,
  viewportHeight: number,
  rowHeight = KEYPOINT_ROW_HEIGHT,
  extra = KEYPOINT_VIRTUAL_OVERSCAN,
): [number, number] => {
  const sIdx = clamp(Math.ceil(scrollTop / rowHeight) - 1, 0, regionsLength);
  const visibleRows = Math.max(1, Math.ceil(viewportHeight / rowHeight));
  const eIdx = clamp(sIdx + visibleRows - 1, 0, regionsLength);

  return [clamp(sIdx - extra, 0, regionsLength), clamp(eIdx + extra, 0, regionsLength)];
};

export interface Lifespan {
  offset: number;
  width: number;
  length: number;
  enabled: boolean;
  start: number;
  points: TimelineRegionKeyframe[];
  locked?: boolean;
}

export const visualizeLifespans = (keyframes: TimelineRegionKeyframe[], step: number, locked = false) => {
  if (keyframes.length === 0) return [];

  const lifespans: Lifespan[] = [];
  const start = keyframes[0].frame - 1;

  for (let i = 0, l = keyframes.length; i < l; i++) {
    const lastSpan = lifespans[lifespans.length - 1];
    const point = keyframes[i];
    const prevPoint = keyframes[i - 1];
    const offset = (point.frame - start - 1) * step;

    if (!lastSpan || !lastSpan?.enabled) {
      lifespans.push({
        offset,
        width: 0,
        length: 0,
        enabled: point.enabled,
        start: point.frame,
        points: [point],
        locked,
      });
    } else if (prevPoint?.enabled) {
      lastSpan.width = (point.frame - lastSpan.points[0].frame) * step;
      lastSpan.length = point.frame - lastSpan.start;
      lastSpan.enabled = point.enabled;
      lastSpan.points.push(point);
    }
  }

  return lifespans;
};

export const findClosestKeypoint = (frames: number[], position: number, direction: -1 | 1) => {
  const targetFrames = frames.filter((f) => (direction === -1 ? f < position : f > position));

  return targetFrames[direction === -1 ? targetFrames.length - 1 : 0] ?? position;
};
