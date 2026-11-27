/**
 * Shared prompt/region types for the interactive-ML primitives. Kept here
 * to avoid pulling the MST mixin into non-MST consumers (pure helpers).
 */

export interface PromptPoint {
  x: number;
  y: number;
  positive: boolean;
}

export interface PromptBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
