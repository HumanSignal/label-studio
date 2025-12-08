/**
 * StateHistoryPopover component
 * Displays the complete FSM state transition history for an entity as a timeline
 */

import type React from "react";
import { Popover, Button, Typography, Userpic } from "@humansignal/ui";
import {
  IconSync,
  IconError,
  IconHistoryRewind,
  IconStateInitial,
  IconStateAnnotating,
  IconStateNeedsReview,
  IconStateInReview,
  IconStateDone,
} from "@humansignal/icons";
import { useStateHistory, type StateHistoryItem } from "../../hooks/useStateHistory";
import { formatStateName, formatTimestamp, formatUserName } from "./utils";

export interface StateHistoryPopoverProps {
  trigger: React.ReactNode;
  entityType: "task" | "annotation" | "project";
  entityId: number;
  currentState: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * State visual configuration - maps state labels to their icons and colors
 * Colors from Figma design system
 * Using raw hex values for inline styles (Tailwind dynamic classes don't work)
 */
type StateVisualConfig = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  baseBg: string; // Background for current/active state
  subtleBg: string; // Background for past states
  baseIconColor: string; // Icon color on base background
  subtleIconColor: string; // Icon color on subtle background
};

const STATE_VISUALS: Record<string, StateVisualConfig> = {
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
    baseBg: "#f0efeb",
    subtleBg: "#f0efeb",
    baseIconColor: "#8c8c8c",
    subtleIconColor: "#8c8c8c",
  },
  Created: {
    icon: IconStateInitial,
    baseBg: "#f0efeb",
    subtleBg: "#f0efeb",
    baseIconColor: "#8c8c8c",
    subtleIconColor: "#8c8c8c",
  },
};

// Default fallback for unknown states
const DEFAULT_VISUAL: StateVisualConfig = {
  icon: IconStateInitial,
  baseBg: "#f0efeb",
  subtleBg: "#f0efeb",
  baseIconColor: "#8c8c8c",
  subtleIconColor: "#8c8c8c",
};

/**
 * Get visual configuration for a state based on its formatted label
 */
function getStateVisuals(stateLabel: string): StateVisualConfig {
  return STATE_VISUALS[stateLabel] || DEFAULT_VISUAL;
}

/**
 * Get user initials from triggered_by object
 */
function getUserInitials(
  triggeredBy: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null,
): string {
  if (!triggeredBy) return "SY";

  const { first_name, last_name, email } = triggeredBy;

  if (first_name && last_name) {
    return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
  }
  if (first_name) return first_name.slice(0, 2).toUpperCase();
  if (last_name) return last_name.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();

  return "SY";
}

/**
 * Timeline item component for a single state history entry
 */
function TimelineItem({
  item,
  index,
  isLast,
}: {
  item: StateHistoryItem;
  index: number;
  isLast: boolean;
}) {
  const isCurrent = index === 0;
  const stateLabel = formatStateName(item.state);
  const visuals = getStateVisuals(stateLabel);
  const StateIcon = visuals.icon;
  const bgColor = isCurrent ? visuals.baseBg : visuals.subtleBg;
  const iconColor = isCurrent ? visuals.baseIconColor : visuals.subtleIconColor;

  // Initial state always uses subtler text color
  const isInitialState = stateLabel === "Initial" || stateLabel === "Created";
  const labelClass = isInitialState
    ? "text-neutral-content-subtler"
    : isCurrent
      ? "text-neutral-content"
      : "text-neutral-content-subtle";

  const userName = formatUserName(item.triggered_by);
  const isSystem = userName === "System";
  const reason = item.context_data?.reason;

  return (
    <div className="flex gap-2 items-start px-2">
      {/* Icon column with timeline line */}
      <div className="flex flex-col items-center shrink-0">
        {/* State icon with circular background - 32px circle with 4px padding */}
        <div
          className="rounded-full size-8 p-1 flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <StateIcon className="w-6 h-6 shrink-0" style={{ color: iconColor }} />
        </div>
        {/* Timeline connector line */}
        {!isLast && <div className="w-px flex-1 min-h-6 bg-neutral-border" />}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 flex-1 min-h-10 justify-center min-w-0 pb-2">
        {/* State name and optional reason */}
        <div className="flex flex-col gap-1">
          <span className={`${labelClass} text-sm font-semibold truncate leading-[18px] tracking-[0.15px]`}>
            {stateLabel}
          </span>
          {reason && (
            <span className="text-neutral-content-subtler text-sm leading-[18px] tracking-[0.25px]">{reason}</span>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 text-neutral-content-subtler">
          {/* Author section */}
          {!isSystem && (
            <>
              <div className="flex items-center gap-1 shrink-0">
                <Userpic size={20} user={item.triggered_by} username={getUserInitials(item.triggered_by)} />
                <span className="text-xs leading-4 tracking-[0.5px]">{userName}</span>
              </div>
              {/* Dot separator */}
              <div className="size-[3px] rounded-full bg-neutral-content-subtler shrink-0" />
            </>
          )}
          {isSystem && (
            <>
              <span className="text-xs leading-4 tracking-[0.5px]">System</span>
              {/* Dot separator */}
              <div className="size-[3px] rounded-full bg-neutral-content-subtler shrink-0" />
            </>
          )}
          {/* Timestamp */}
          <span className="text-xs leading-4 tracking-[0.5px]">{formatTimestamp(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export function StateHistoryPopover({
  trigger,
  entityType,
  entityId,
  currentState,
  open,
  onOpenChange,
}: StateHistoryPopoverProps) {
  const { data, isLoading, isError, error, refetch } = useStateHistory({
    entityType,
    entityId,
    enabled: open ?? true,
  });

  const history = (data?.results || []) as StateHistoryItem[];

  return (
    <Popover trigger={trigger} open={open} onOpenChange={onOpenChange} align="start" sideOffset={8}>
      <div
        className="flex flex-col w-[320px] max-h-[400px] bg-neutral-background rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-border">
          <div className="flex items-center gap-2">
            <IconHistoryRewind className="w-4 h-4" />
            <Typography variant="body" size="small" className="font-medium text-neutral-foreground">
              State History
            </Typography>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <IconSync className="w-8 h-8 text-primary-icon animate-spin" />
              <Typography variant="body" size="small" className="text-neutral-content-subtle">
                Loading...
              </Typography>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <IconError className="w-8 h-8 text-negative-icon" />
              <Typography variant="body" size="small" className="text-neutral-foreground">
                Failed to load history
              </Typography>
              <Typography variant="body" size="smallest" className="text-neutral-content-subtle text-center">
                {error instanceof Error ? error.message : "Unknown error"}
              </Typography>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  refetch();
                }}
                className="mt-tight"
                size="smaller"
                variant="primary"
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <IconHistoryRewind className="w-8 h-8 text-neutral-content-subtler" />
              <Typography variant="body" size="small" className="text-neutral-content-subtle">
                No history available
              </Typography>
            </div>
          )}

          {!isLoading && !isError && history.length > 0 && (
            <div className="flex flex-col">
              {history.map((item: StateHistoryItem, index: number) => (
                <TimelineItem
                  key={`${item.state}-${item.created_at}-${index}`}
                  item={item}
                  index={index}
                  isLast={index === history.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Popover>
  );
}
