import { isDefined } from "../../utils/utils";

/**
 * Formats seconds into a human-readable time string.
 * Format: [n]h [n]m [n]s (omitting zero-value components)
 * Examples:
 *   36922 -> "10h 15m 22s"
 *   322   -> "5m 22s"
 *   45    -> "45s"
 *   3600  -> "1h"
 *   0     -> ""
 */
const formatTime = (totalSeconds) => {
  const seconds = Math.floor(totalSeconds);

  if (seconds <= 0) {
    return "";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(" ");
};

export const TimeCell = (column) => (isDefined(column.value) ? formatTime(column.value) : "");
