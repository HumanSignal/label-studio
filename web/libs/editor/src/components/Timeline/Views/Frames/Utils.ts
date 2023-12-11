import { TimelineRegionKeyframe } from '../../Types';

export interface Lifespan {
  offset: number;
  width: number;
  length: number;
  enabled: boolean;
  start: number;
  points: TimelineRegionKeyframe[];
}

export const visualizeLifespans = (keyframes: TimelineRegionKeyframe[], step: number) => {
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
  const targetFrames = frames.filter(f => direction === -1 ? f < position : f > position);

  return targetFrames[direction === -1 ? targetFrames.length - 1 : 0] ?? position;
};
