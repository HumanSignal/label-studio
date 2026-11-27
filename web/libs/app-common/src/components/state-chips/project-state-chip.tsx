/**
 * ProjectStateChip - Project-specific state chip with history popover
 */

import { useState } from "react";
import { StateChip } from "@humansignal/ui";
import { formatStateName, getStateDescription, getStateVariant } from "./utils";
import { StateHistoryPopoverContent } from "./state-history-popover-content";

export interface ProjectStateChipProps {
  /**
   * Current state of the project
   */
  state: string;

  /**
   * Project ID for fetching state history
   */
  projectId?: number;

  /**
   * Whether the chip should be interactive (show history popover)
   */
  interactive?: boolean;

  /**
   * Optional custom description to override the default tooltip.
   * Use this to provide context-specific tooltips.
   */
  description?: string;

  /**
   * Set when a Manager+ marked the project as Done by hand: the chip looks the same,
   * the tooltip says "Marked as Done by {by} on {at}".
   */
  manual?: ManualProjectState;
}

export type ManualProjectState = { by: string; at: string };

export const getManualProjectStateDescription = ({ by, at }: ManualProjectState) => `Marked as Done by ${by} on ${at}`;

export function ProjectStateChip({ state, projectId, interactive = true, description, manual }: ProjectStateChipProps) {
  const [open, setOpen] = useState(false);

  const label = formatStateName(state);
  const defaultDescription = getStateDescription(state, "project");
  const variant = getStateVariant(state);

  const popoverContent = projectId ? (
    <StateHistoryPopoverContent
      entityType="project"
      entityId={projectId}
      isOpen={open}
      onClose={() => setOpen(false)}
    />
  ) : undefined;

  return (
    <StateChip
      label={label}
      description={manual ? getManualProjectStateDescription(manual) : (description ?? defaultDescription)}
      variant={variant}
      interactive={interactive && !!projectId}
      popoverContent={popoverContent}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
