/**
 * Shared utility functions for SegmentAnything — DOM queries and coordinate helpers.
 */

/**
 * Compute the centroid of foreground pixels in a binary mask.
 * Returns a single-element array with the centroid point, or empty if no foreground.
 */
export function computeCentroidFromMask(
  mask: Uint8Array,
  width: number,
  height: number,
): Array<{ x: number; y: number; positive: boolean }> {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }
  if (count === 0) return [];
  return [{ x: sumX / count, y: sumY / count, positive: true }];
}

/**
 * Find the actual <video> DOM element for a given image/video tag.
 * VirtualVideo creates a <video> via document.createElement and appends it
 * offscreen. VideoCanvas exposes a VideoRef API, not the raw element.
 * This helper queries the DOM by matching the <source> URL.
 */
export function findVideoElement(imageTag: any): HTMLVideoElement | null {
  const videoUrl = imageTag?._value;
  if (!videoUrl) return null;

  const videos = document.querySelectorAll<HTMLVideoElement>("video");
  for (const v of videos) {
    const src = v.querySelector("source")?.getAttribute("src");
    if (src === videoUrl) return v;
  }
  return videos[0] ?? null;
}

/**
 * Returns the native pixel dimensions for the target object tag.
 * Handles both Image (naturalWidth/Height) and Video (videoDimensions or videoWidth/Height).
 */
export function getNativeDimensions(imageTag: any, isVideo: boolean): { width: number; height: number } {
  if (isVideo) {
    const vd = imageTag?.ref?.current?.videoDimensions;
    if (vd?.width && vd?.height) return { width: vd.width, height: vd.height };
    const el = findVideoElement(imageTag);
    return { width: el?.videoWidth ?? 0, height: el?.videoHeight ?? 0 };
  }
  return { width: imageTag?.naturalWidth ?? 0, height: imageTag?.naturalHeight ?? 0 };
}
