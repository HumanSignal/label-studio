/**
 * StateChip - Base interactive state display component
 *
 * A reusable chip component that displays a state with optional popover interaction.
 * This base component provides the visual display and interactive behavior,
 * while entity-specific implementations handle state logic and history.
 */

import { useState, type ReactNode } from "react";
import { Badge, Tooltip, Popover } from "@humansignal/ui";

export interface StateChipProps {
  /**
   * Visual label to display in the chip
   */
  label: string;

  /**
   * Description for the tooltip when not interactive
   */
  description?: string;

  /**
   * Tailwind CSS classes for styling the chip
   */
  className: string;

  /**
   * Whether the chip should be interactive (clickable with popover)
   */
  interactive?: boolean;

  /**
   * Content to display in the popover when interactive
   */
  popoverContent?: ReactNode;

  /**
   * Controlled open state for the popover
   */
  open?: boolean;

  /**
   * Callback when popover open state changes
   */
  onOpenChange?: (open: boolean) => void;
}

export function StateChip({
  label,
  description,
  className,
  interactive = false,
  popoverContent,
  open: controlledOpen,
  onOpenChange,
}: StateChipProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Non-interactive chip - just show the badge with tooltip
  if (!interactive || !popoverContent) {
    return (
      <Tooltip title={description || label}>
        <span>
          <Badge className={className}>{label}</Badge>
        </span>
      </Tooltip>
    );
  }

  // Interactive chip with popover
  const trigger = (
    <button
      className="cursor-pointer outline-none hover:opacity-80 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!isOpen);
      }}
      type="button"
      title="Click to view history"
    >
      <Badge className={className}>{label}</Badge>
    </button>
  );

  return (
    <Popover trigger={trigger} open={isOpen} onOpenChange={setOpen} align="start" sideOffset={8}>
      {popoverContent}
    </Popover>
  );
}
