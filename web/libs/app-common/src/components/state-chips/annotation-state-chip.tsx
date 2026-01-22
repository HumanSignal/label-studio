/**
 * AnnotationStateChip - Annotation-specific state chip with history popover
 */

import { useState } from "react";
import { StateChip } from "@humansignal/ui";
import { getStateColorClass, formatStateName, getStateDescription } from "./utils";
import { StateHistoryPopoverContent } from "./state-history-popover-content";

export interface AnnotationStateChipProps {
  /**
   * Current state of the annotation
   */
  state: string;

  /**
   * Annotation ID for fetching state history
   */
  annotationId?: number;

  /**
   * Whether the chip should be interactive (show history popover)
   */
  interactive?: boolean;
}

export function AnnotationStateChip({ state, annotationId, interactive = true }: AnnotationStateChipProps) {
  const [open, setOpen] = useState(false);

  const label = formatStateName(state);
  const description = getStateDescription(state, "annotation");
  const colorClasses = getStateColorClass(state);

  const popoverContent = annotationId ? (
    <StateHistoryPopoverContent
      entityType="annotation"
      entityId={annotationId}
      isOpen={open}
      onClose={() => setOpen(false)}
    />
  ) : undefined;

  return (
    <StateChip
      label={label}
      description={description}
      className={colorClasses}
      interactive={interactive && !!annotationId}
      popoverContent={popoverContent}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
