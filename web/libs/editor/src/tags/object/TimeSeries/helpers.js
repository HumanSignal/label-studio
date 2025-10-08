import * as d3 from "d3";
import Utils from "../../../utils";
import { defaultStyle } from "../../../core/Constants";

export const line = (x, y) =>
  d3
    .line()
    .x((d) => x(d[0]))
    .y((d) => y(d[1]));

export const idFromValue = (value) => value.substr(1);

export const getOptimalWidth = () => ((window.screen && window.screen.width) || 1440) * (window.devicePixelRatio || 2);

export const sparseValues = (values, max = 1e6) => {
  if (values.length <= max) return values;
  let next = 0;
  const step = (values.length - 1) / (max - 1);
  // return values.filter((_, i) => i > next && (next += step))

  return values.filter((_, i) => {
    if (i < next) return false;
    next += step;
    return true;
  });
};

export const getRegionColor = (region, alpha = 1) => {
  const color = (region.style || defaultStyle).fillcolor;

  return Utils.Colors.convertToRGBA(color, alpha);
};

// clear d3 sourceEvent via async call to prevent infinite loops
export const clearD3Event = (f) => setTimeout(f, 0);

// check if we are in recursive event loop, caused by `event`
export const checkD3EventLoop = (event) => {
  if (!d3.event.sourceEvent) return true;
  if (event) return d3.event.sourceEvent.type === event;
  return ["start", "brush", "end"].includes(d3.event.sourceEvent.type);
};

const formatDateDiff = (start, end) => {
  const dates = [start.toLocaleDateString(), end.toLocaleDateString()];

  if (dates[1] !== dates[0]) return dates;
  return [start.toLocaleTimeString(), end.toLocaleTimeString()];
};

export const formatRegion = (node) => {
  let ranges = [];

  if (node.parent.format === "date") {
    ranges = formatDateDiff(new Date(node.start), new Date(node.end));
  } else {
    ranges = [node.start, node.end];
  }
  return node.instant ? ranges[0] : ranges.join("–");
};

export const formatTrackerTime = (time) => new Date(time).toUTCString();

/**
 * Snap a time value to the nearest actual data point to avoid floating-point precision errors
 * @param {number} targetTime - The time to snap
 * @param {Array} timeData - Array of time values from the data
 * @returns {number} - The snapped time value (or original if no data)
 */
export const snapToNearestDataPoint = (targetTime, timeData) => {
  if (!timeData || timeData.length === 0) {
    return targetTime;
  }

  // Binary search to find the closest data point
  let left = 0;
  let right = timeData.length - 1;
  let closestIndex = 0;
  let minDiff = Math.abs(timeData[0] - targetTime);

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const diff = Math.abs(timeData[mid] - targetTime);

    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = mid;
    }

    if (timeData[mid] < targetTime) {
      left = mid + 1;
    } else if (timeData[mid] > targetTime) {
      right = mid - 1;
    } else {
      // Exact match found
      closestIndex = mid;
      break;
    }
  }

  // Also check adjacent points to ensure we have the absolute closest
  if (closestIndex > 0 && Math.abs(timeData[closestIndex - 1] - targetTime) < minDiff) {
    closestIndex = closestIndex - 1;
  }
  if (closestIndex < timeData.length - 1 && Math.abs(timeData[closestIndex + 1] - targetTime) < minDiff) {
    closestIndex = closestIndex + 1;
  }

  return timeData[closestIndex];
};
