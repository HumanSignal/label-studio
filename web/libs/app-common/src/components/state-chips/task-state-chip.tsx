/**
 * TaskStateChip - Task-specific state chip with history popover
 */

import { useState } from "react";
import { StateChip } from "@humansignal/ui";
import { getStateColorClass, formatStateName, getStateDescription } from "./utils";
import { StateHistoryPopoverContent } from "./state-history-popover-content";

export interface TaskStateChipProps {
  /**
   * Current state of the task
   */
  state: string;

  /**
   * Task ID for fetching state history
   */
  taskId?: number;

  /**
   * Whether the chip should be interactive (show history popover)
   */
  interactive?: boolean;
}

export function TaskStateChip({ state, taskId, interactive = true }: TaskStateChipProps) {
  const [open, setOpen] = useState(false);

  const label = formatStateName(state);
  const description = getStateDescription(state, "task");
  const colorClasses = getStateColorClass(state);

  const popoverContent = taskId ? (
    <StateHistoryPopoverContent entityType="task" entityId={taskId} isOpen={open} onClose={() => setOpen(false)} />
  ) : undefined;

  return (
    <StateChip
      label={label}
      description={description}
      className={colorClasses}
      interactive={interactive && !!taskId}
      popoverContent={popoverContent}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
