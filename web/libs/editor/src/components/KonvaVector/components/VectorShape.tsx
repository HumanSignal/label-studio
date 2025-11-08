import type React from "react";
import { Path } from "react-konva";
import type { BezierPoint } from "../types";
import chroma from "chroma-js";
import type { KonvaEventObject } from "konva/lib/Node";

interface VectorShapeProps {
  segments: Array<{ from: BezierPoint; to: BezierPoint }>;
  allowClose?: boolean;
  isPathClosed?: boolean;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  opacity?: number;
  transform?: { zoom: number; offsetX: number; offsetY: number };
  fitScale?: number;
  onClick?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseEnter?: (e: any) => void;
  onMouseLeave?: (e: any) => void;
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: KonvaEventObject<MouseEvent>) => void;
}

// Convert Bezier segments to SVG path data for a single continuous path
function segmentsToPathData(
  segments: Array<{ from: BezierPoint; to: BezierPoint }>,
  allowClose: boolean,
  isPathClosed: boolean,
): string {
  if (segments.length === 0) return "";

  let pathData = "";

  // Start with the first point
  const firstSegment = segments[0];
  pathData += `M ${firstSegment.from.x} ${firstSegment.from.y}`;

  // Add each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const { from, to } = segment;

    if (from.isBezier && from.controlPoint2 && to.isBezier && to.controlPoint1) {
      // Full Bezier curve
      pathData += ` C ${from.controlPoint2.x} ${from.controlPoint2.y}, ${to.controlPoint1.x} ${to.controlPoint1.y}, ${to.x} ${to.y}`;
    } else if (from.isBezier && from.controlPoint2) {
      // Partial Bezier curve - only from point has control point
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const controlX = to.x - dx * 0.3;
      const controlY = to.y - dy * 0.3;
      pathData += ` C ${from.controlPoint2.x} ${from.controlPoint2.y}, ${controlX} ${controlY}, ${to.x} ${to.y}`;
    } else if (to.isBezier && to.controlPoint1) {
      // Partial Bezier curve - only to point has control point
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const controlX = from.x + dx * 0.3;
      const controlY = from.y + dy * 0.3;
      pathData += ` C ${controlX} ${controlY}, ${to.controlPoint1.x} ${to.controlPoint1.y}, ${to.x} ${to.y}`;
    } else {
      // Straight line
      pathData += ` L ${to.x} ${to.y}`;
    }
  }

  // Close the path if needed
  if (allowClose && isPathClosed && segments.length > 0) {
    pathData += " Z";
  }

  return pathData;
}

// Group segments into connected paths for skeleton mode
function groupSegmentsIntoPaths(
  segments: Array<{ from: BezierPoint; to: BezierPoint }>,
): Array<Array<{ from: BezierPoint; to: BezierPoint }>> {
  if (segments.length === 0) return [];

  const paths: Array<Array<{ from: BezierPoint; to: BezierPoint }>> = [];
  const usedSegments = new Set<number>();

  for (let i = 0; i < segments.length; i++) {
    if (usedSegments.has(i)) continue;

    const currentPath: Array<{ from: BezierPoint; to: BezierPoint }> = [];
    const pathPoints = new Set<string>();

    // Start with this segment
    currentPath.push(segments[i]);
    pathPoints.add(segments[i].from.id);
    pathPoints.add(segments[i].to.id);
    usedSegments.add(i);

    // Find all connected segments
    let foundMore = true;
    while (foundMore) {
      foundMore = false;
      for (let j = 0; j < segments.length; j++) {
        if (usedSegments.has(j)) continue;

        const segment = segments[j];
        // Check if this segment connects to our current path
        if (pathPoints.has(segment.from.id) || pathPoints.has(segment.to.id)) {
          currentPath.push(segment);
          pathPoints.add(segment.from.id);
          pathPoints.add(segment.to.id);
          usedSegments.add(j);
          foundMore = true;
        }
      }
    }

    // Sort segments within each path to ensure they form a continuous sequence
    const sortedPath = sortSegmentsForContinuousPath(currentPath);
    paths.push(sortedPath);
  }

  return paths;
}

// Sort segments to form a continuous path
function sortSegmentsForContinuousPath(
  segments: Array<{ from: BezierPoint; to: BezierPoint }>,
): Array<{ from: BezierPoint; to: BezierPoint }> {
  if (segments.length <= 1) return segments;

  const sorted: Array<{ from: BezierPoint; to: BezierPoint }> = [];
  const remaining = new Set(segments);

  // Start with the first segment
  let currentSegment = segments[0];
  sorted.push(currentSegment);
  remaining.delete(currentSegment);

  // Find the next segment that connects to the current one
  while (remaining.size > 0) {
    let foundNext = false;

    for (const segment of remaining) {
      // Check if this segment connects to the end of our current path
      if (segment.from.id === currentSegment.to.id) {
        sorted.push(segment);
        remaining.delete(segment);
        currentSegment = segment;
        foundNext = true;
        break;
      }

      // Check if this segment connects to the beginning of our current path (reverse it)
      // Reverse the segment to connect properly
      const reversedSegment = { from: segment.to, to: segment.from };
      sorted.unshift(reversedSegment);
      remaining.delete(segment);
      currentSegment = reversedSegment;
      foundNext = true;
      break;
    }

    // If we can't find a direct connection, look for any connection
    if (!foundNext) {
      for (const segment of remaining) {
        if (
          segment.from.id === currentSegment.to.id ||
          segment.to.id === currentSegment.to.id ||
          segment.from.id === currentSegment.from.id ||
          segment.to.id === currentSegment.from.id
        ) {
          // If it connects to the end, add it normally
          if (segment.from.id === currentSegment.to.id) {
            sorted.push(segment);
          }
          // If it connects to the end but reversed, reverse it
          else if (segment.to.id === currentSegment.to.id) {
            const reversedSegment = { from: segment.to, to: segment.from };
            sorted.push(reversedSegment);
          }
          // If it connects to the beginning, add it at the start
          else if (segment.to.id === currentSegment.from.id) {
            sorted.unshift(segment);
          }
          // If it connects to the beginning but reversed, reverse it and add at start
          else if (segment.from.id === currentSegment.from.id) {
            const reversedSegment = { from: segment.to, to: segment.from };
            sorted.unshift(reversedSegment);
          }

          remaining.delete(segment);
          currentSegment = sorted[sorted.length - 1]; // Update current segment to the last one
          foundNext = true;
          break;
        }
      }
    }

    // If we still can't find a connection, just add the remaining segments as separate paths
    if (!foundNext) {
      break;
    }
  }

  // Add any remaining segments as separate paths (these will be handled by the main grouping function)
  return sorted;
}

export const VectorShape: React.FC<VectorShapeProps> = ({
  segments,
  allowClose = false,
  isPathClosed = false,
  stroke = "#3b82f6",
  fill = "rgba(239, 68, 68, 0.3)",
  strokeWidth = 2,
  opacity = 1,
  transform = { zoom: 1, offsetX: 0, offsetY: 0 },
  fitScale = 1,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  if (segments.length === 0) return null;

  const effectiveZoom = transform.zoom * fitScale;

  // For skeleton mode, render each segment as a separate line to avoid path ordering issues
  // For non-skeleton mode, use the grouped path approach
  const isSkeletonMode = segments.some((segment) => {
    // Check if we have branching (multiple segments with the same from point)
    const fromPoints = segments.map((s) => s.from.id);
    const uniqueFromPoints = new Set(fromPoints);
    return fromPoints.length !== uniqueFromPoints.size;
  });

  if (isSkeletonMode) {
    // Render each segment as a separate line
    return (
      <>
        {segments.map((segment, index) => {
          const { from, to } = segment;

          // Create a simple line path for each segment
          let pathData = `M ${from.x} ${from.y}`;

          if (from.isBezier && from.controlPoint2 && to.isBezier && to.controlPoint1) {
            // Full Bezier curve
            pathData += ` C ${from.controlPoint2.x} ${from.controlPoint2.y}, ${to.controlPoint1.x} ${to.controlPoint1.y}, ${to.x} ${to.y}`;
          } else if (from.isBezier && from.controlPoint2) {
            // Partial Bezier curve - only from point has control point
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const controlX = to.x - dx * 0.3;
            const controlY = to.y - dy * 0.3;
            pathData += ` C ${from.controlPoint2.x} ${from.controlPoint2.y}, ${controlX} ${controlY}, ${to.x} ${to.y}`;
          } else if (to.isBezier && to.controlPoint1) {
            // Partial Bezier curve - only to point has control point
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const controlX = from.x + dx * 0.3;
            const controlY = from.y + dy * 0.3;
            pathData += ` C ${controlX} ${controlY}, ${to.controlPoint1.x} ${to.controlPoint1.y}, ${to.x} ${to.y}`;
          } else {
            // Straight line
            pathData += ` L ${to.x} ${to.y}`;
          }

          return (
            <Path
              key={`segment-${index}`}
              data={pathData}
              stroke={stroke}
              strokeWidth={2}
              strokeScaleEnabled={false}
              fill={undefined} // No fill for individual segments
              hitStrokeWidth={20}
              onClick={onClick}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            />
          );
        })}
      </>
    );
  }
  // Use the grouped path approach for non-skeleton mode
  const pathGroups = groupSegmentsIntoPaths(segments);

  return (
    <>
      {pathGroups.map((pathSegments, index) => {
        const pathData = segmentsToPathData(pathSegments, allowClose, isPathClosed);

        // Apply opacity only to fill color using chroma.js
        const fillWithOpacity = allowClose && isPathClosed && fill ? chroma(fill).alpha(opacity).css() : undefined;

        return (
          <Path
            key={`path-${index}`}
            data={pathData}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeScaleEnabled={false}
            fill={fillWithOpacity}
            hitStrokeWidth={20}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          />
        );
      })}
    </>
  );
};
