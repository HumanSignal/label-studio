/**
 * ProjectStateChip - Project-specific state chip with history popover
 */

import { useState } from "react";
import { StateChip } from "@humansignal/ui";
import { getStateColorClass, formatStateName, getStateDescription } from "./utils";
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
}

export function ProjectStateChip({ state, projectId, interactive = true, description }: ProjectStateChipProps) {
  const [open, setOpen] = useState(false);

  const label = formatStateName(state);
  const defaultDescription = getStateDescription(state, "project");
  const colorClasses = getStateColorClass(state);

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
      description={description ?? defaultDescription}
      className={colorClasses}
      interactive={interactive && !!projectId}
      popoverContent={popoverContent}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
