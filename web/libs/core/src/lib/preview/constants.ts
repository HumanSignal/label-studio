/**
 * Constants for the preview components
 */

/** Message shown when large config detected and manual update mode is active */
export const LARGE_CONFIG_MESSAGE = "Large interface detected. Preview auto-update is disabled for better performance.";

/**
 * Threshold in tag count for switching to manual update mode.
 * MST performance degrades with many nodes - each XML tag becomes an MST node.
 * ~200 tags is where initialization/updates start showing noticeable delays.
 */
export const LARGE_CONFIG_TAG_THRESHOLD = 200;
