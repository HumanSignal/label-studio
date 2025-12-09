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
    subtleBg: "#57b7ab", // Done stays bold even when past
    baseIconColor: "#ffffff",
    subtleIconColor: "#ffffff",
  },
  Completed: {
    icon: IconStateDone,
    baseBg: "#57b7ab",
    subtleBg: "#57b7ab",
    baseIconColor: "#ffffff",
    subtleIconColor: "#ffffff",
  },
  // In Review state (plum palette)
  "In Review": {
    icon: IconStateInReview,
    baseBg: "#e37bd3",
    subtleBg: "#f7d6f2",
    baseIconColor: "#ffffff",
    subtleIconColor: "#c24fb0",
  },
  // Needs Review state (cantaloupe palette)
  "Needs Review": {
    icon: IconStateNeedsReview,
    baseBg: "#ffa663",
    subtleBg: "#ffe4d0",
    baseIconColor: "#ffffff",
    subtleIconColor: "#d97c2e",
  },
  // Annotating state (grape palette)
  Annotating: {
    icon: IconStateAnnotating,
    baseBg: "#6d87f1",
    subtleBg: "#d4dbfb",
    baseIconColor: "#ffffff",
    subtleIconColor: "#4a65d6",
  },
  "In Progress": {
    icon: IconStateAnnotating,
    baseBg: "#6d87f1",
    subtleBg: "#d4dbfb",
    baseIconColor: "#ffffff",
    subtleIconColor: "#4a65d6",
  },
  // Initial state (neutral palette)
  Initial: {
    icon: IconStateInitial,
    baseBg: "#8c8c8c", // darker when current for white icon contrast
    subtleBg: "#f0efeb",
    baseIconColor: "#ffffff",
    subtleIconColor: "#8c8c8c",
  },
  Created: {
    icon: IconStateInitial,
    baseBg: "#8c8c8c",
    subtleBg: "#f0efeb",
    baseIconColor: "#ffffff",
    subtleIconColor: "#8c8c8c",
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
