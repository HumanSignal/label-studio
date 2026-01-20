/**
 * Constants for the preview components
 */

/** Message shown when using lightweight preview for large configs */
export const LIGHTWEIGHT_PREVIEW_MESSAGE =
  "Using lightweight preview due to large interface size. Audio, video, and images are shown as placeholders.";

/**
 * Threshold in tag count for switching to lightweight preview.
 * MST performance degrades with many nodes - each XML tag becomes an MST node.
 * ~200 tags is where initialization/updates start showing noticeable delays.
 */
export const LIGHTWEIGHT_PREVIEW_TAG_THRESHOLD = 200;
