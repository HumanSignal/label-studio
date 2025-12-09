/**
 * State visual configuration - maps state labels to their icons and colors
 * Shared between StateHistoryPopover and StateHistoryPopoverContent
 */

import type React from "react";
import {
  IconStateInitial,
  IconStateAnnotating,
  IconStateNeedsReview,
  IconStateInReview,
  IconStateDone,
} from "@humansignal/icons";

export type StateVisualConfig = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  baseBg: string; // Background for current/active state
  subtleBg: string; // Background for past states
  baseIconColor: string; // Icon color on base background
  subtleIconColor: string; // Icon color on subtle background
};

export const STATE_VISUALS: Record<string, StateVisualConfig> = {
  // Terminal state (kale)
  Done: {
    icon: IconStateDone,
    baseBg: "#57b7ab",
    subtleBg: "#d4ebe8", // Light kale for past Done states
    baseIconColor: "#f4f9f9", // Light kale for icon on base bg
    subtleIconColor: "#57b7ab", // Base kale for icon on subtle bg
  },
  Completed: {
    icon: IconStateDone,
    baseBg: "#57b7ab",
    subtleBg: "#d4ebe8",
    baseIconColor: "#f4f9f9",
    subtleIconColor: "#57b7ab",
  },
  // In Review state (plum palette)
  "In Review": {
    icon: IconStateInReview,
    baseBg: "#e37bd3",
    subtleBg: "#f7d6f2",
    baseIconColor: "#fbf2fc", // Light plum for icon on base bg
    subtleIconColor: "#e37bd3", // Base plum for icon on subtle bg
  },
  // Needs Review state (cantaloupe palette)
  "Needs Review": {
    icon: IconStateNeedsReview,
    baseBg: "#ffa663",
    subtleBg: "#ffe4d0",
    baseIconColor: "#fff6ef", // Light cantaloupe for icon on base bg
    subtleIconColor: "#ffa663", // Base cantaloupe for icon on subtle bg
  },
  // Annotating state (grape palette)
  Annotating: {
    icon: IconStateAnnotating,
    baseBg: "#6d87f1",
    subtleBg: "#d4dbfb",
    baseIconColor: "#f0f3fe", // Light grape for icon on base bg
    subtleIconColor: "#6d87f1", // Base grape for icon on subtle bg
  },
  "In Progress": {
    icon: IconStateAnnotating,
    baseBg: "#6d87f1",
    subtleBg: "#d4dbfb",
    baseIconColor: "#f0f3fe",
    subtleIconColor: "#6d87f1",
  },
  // Initial state (neutral palette) - always uses subtle styling
  Initial: {
    icon: IconStateInitial,
    baseBg: "#f0efeb", // Initial never uses bold, always subtle
    subtleBg: "#f0efeb",
    baseIconColor: "#6b6860",
    subtleIconColor: "#6b6860", // Neutral gray for icon
  },
  Created: {
    icon: IconStateInitial,
    baseBg: "#f0efeb",
    subtleBg: "#f0efeb",
    baseIconColor: "#6b6860",
    subtleIconColor: "#6b6860",
  },
};

// Default fallback for unknown states
export const DEFAULT_STATE_VISUAL: StateVisualConfig = {
  icon: IconStateInitial,
  baseBg: "#f0efeb",
  subtleBg: "#f0efeb",
  baseIconColor: "#8c8c8c",
  subtleIconColor: "#8c8c8c",
};

/**
 * Get visual configuration for a state based on its formatted label
 */
export function getStateVisuals(stateLabel: string): StateVisualConfig {
  return STATE_VISUALS[stateLabel] || DEFAULT_STATE_VISUAL;
}
