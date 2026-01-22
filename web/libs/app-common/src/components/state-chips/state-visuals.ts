/**
 * State visual configuration - maps state labels to their icons and colors
 * Shared between StateHistoryPopover and StateHistoryPopoverContent
 *
 * Uses CSS variable references for dark mode support.
 * Colors are defined in tokens.scss and automatically adapt to color scheme.
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
  // Terminal state (kale palette)
  Done: {
    icon: IconStateDone,
    baseBg: "var(--color-accent-kale-base)",
    subtleBg: "var(--color-accent-kale-subtle)",
    baseIconColor: "var(--color-accent-kale-subtlest)",
    subtleIconColor: "var(--color-accent-kale-base)",
  },
  Completed: {
    icon: IconStateDone,
    baseBg: "var(--color-accent-kale-base)",
    subtleBg: "var(--color-accent-kale-subtle)",
    baseIconColor: "var(--color-accent-kale-subtlest)",
    subtleIconColor: "var(--color-accent-kale-base)",
  },
  // In Review state (plum palette)
  "In Review": {
    icon: IconStateInReview,
    baseBg: "var(--color-accent-plum-base)",
    subtleBg: "var(--color-accent-plum-subtle)",
    baseIconColor: "var(--color-accent-plum-subtlest)",
    subtleIconColor: "var(--color-accent-plum-base)",
  },
  // Needs Review state (cantaloupe palette)
  "Needs Review": {
    icon: IconStateNeedsReview,
    baseBg: "var(--color-accent-canteloupe-base)",
    subtleBg: "var(--color-accent-canteloupe-subtle)",
    baseIconColor: "var(--color-accent-canteloupe-subtlest)",
    subtleIconColor: "var(--color-accent-canteloupe-base)",
  },
  // Annotating state (grape palette)
  Annotating: {
    icon: IconStateAnnotating,
    baseBg: "var(--color-accent-grape-base)",
    subtleBg: "var(--color-accent-grape-subtle)",
    baseIconColor: "var(--color-accent-grape-subtlest)",
    subtleIconColor: "var(--color-accent-grape-base)",
  },
  "In Progress": {
    icon: IconStateAnnotating,
    baseBg: "var(--color-accent-grape-base)",
    subtleBg: "var(--color-accent-grape-subtle)",
    baseIconColor: "var(--color-accent-grape-subtlest)",
    subtleIconColor: "var(--color-accent-grape-base)",
  },
  // Initial state (sand/neutral palette)
  Initial: {
    icon: IconStateInitial,
    baseBg: "var(--color-accent-sand-subtle)",
    subtleBg: "var(--color-accent-sand-subtle)",
    baseIconColor: "var(--color-accent-sand-bold)",
    subtleIconColor: "var(--color-accent-sand-bold)",
  },
  Created: {
    icon: IconStateInitial,
    baseBg: "var(--color-accent-sand-subtle)",
    subtleBg: "var(--color-accent-sand-subtle)",
    baseIconColor: "var(--color-accent-sand-bold)",
    subtleIconColor: "var(--color-accent-sand-bold)",
  },
};

// Default fallback for unknown states
export const DEFAULT_STATE_VISUAL: StateVisualConfig = {
  icon: IconStateInitial,
  baseBg: "var(--color-accent-sand-subtle)",
  subtleBg: "var(--color-accent-sand-subtle)",
  baseIconColor: "var(--color-accent-sand-bold)",
  subtleIconColor: "var(--color-accent-sand-bold)",
};

/**
 * Get visual configuration for a state based on its formatted label
 */
export function getStateVisuals(stateLabel: string): StateVisualConfig {
  return STATE_VISUALS[stateLabel] || DEFAULT_STATE_VISUAL;
}
