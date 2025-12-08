/**
 * StateHistoryPopoverContent - Popover content for displaying state history as a timeline
 */

import type React from "react";
import { Button, Typography, Userpic } from "@humansignal/ui";
import {
  IconSync,
  IconError,
  IconHistoryRewind,
  IconCross,
  IconBoundingBox,
  IconClock,
  IconCheckCircle,
} from "@humansignal/icons";
import { useStateHistory, type StateHistoryItem } from "../../hooks/useStateHistory";
import { formatStateName, formatTimestamp, formatUserName, getStateType, StateType } from "./utils";

export interface StateHistoryPopoverContentProps {
  entityType: "task" | "annotation" | "project";
  entityId: number;
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * Get the icon component for a given state type
 */
function getStateIcon(stateType: StateType): React.ComponentType<{ className?: string }> {
  switch (stateType) {
    case StateType.IN_PROGRESS:
      return IconBoundingBox;
    case StateType.ATTENTION:
      return IconClock;
    case StateType.TERMINAL:
      return IconCheckCircle;
    case StateType.INITIAL:
    default:
      return IconHistoryRewind;
  }
}

/**
 * Get the background color class for a state icon based on state type and whether it's current (first item)
 */
function getStateIconBgClass(stateType: StateType, isCurrent: boolean): string {
  if (isCurrent) {
    // Active/current state uses bold colors
    switch (stateType) {
      case StateType.IN_PROGRESS:
        return "bg-primary-surface-bold";
      case StateType.ATTENTION:
        return "bg-warning-surface-bold";
      case StateType.TERMINAL:
        return "bg-positive-surface-bold";
      case StateType.INITIAL:
      default:
        return "bg-neutral-surface-active";
    }
  }
  // Past states use subtle colors
  switch (stateType) {
    case StateType.IN_PROGRESS:
      return "bg-primary-emphasis";
    case StateType.ATTENTION:
      return "bg-warning-emphasis";
    case StateType.TERMINAL:
      return "bg-positive-emphasis";
    case StateType.INITIAL:
    default:
      return "bg-neutral-surface-active";
  }
}

/**
 * Get the text color class for a state label based on state type and whether it's current
 */
function getStateLabelClass(stateType: StateType, isCurrent: boolean): string {
  if (isCurrent) {
    return "text-neutral-content";
  }
  // Past states use subtler colors
  if (stateType === StateType.INITIAL) {
    return "text-neutral-content-subtler";
  }
  return "text-neutral-content-subtle";
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
  const stateType = getStateType(item.state);
  const StateIcon = getStateIcon(stateType);
  const bgClass = getStateIconBgClass(stateType, isCurrent);
  const labelClass = getStateLabelClass(stateType, isCurrent);
  const userName = formatUserName(item.triggered_by);
  const isSystem = userName === "System";
  const reason = item.reason || item.context_data?.reason || item.transition_name;

  return (
    <div className="flex gap-2 items-start px-2 relative">
      {/* Vertical timeline line */}
      {!isLast && <div className="absolute left-[23.5px] top-[36px] bottom-0 w-px bg-neutral-border" />}

      {/* State icon */}
      <div className="flex flex-col items-center pt-0.5 shrink-0">
        <div
          className={`${bgClass} border-4 border-primary-background rounded-2xl size-8 flex items-center justify-center overflow-hidden`}
        >
          <StateIcon className="w-4 h-4 text-neutral-icon" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 flex-1 min-h-[40px] justify-center min-w-0">
        {/* State name and optional reason */}
        <div className="flex flex-col gap-1">
          <Typography variant="label" size="small" className={`${labelClass} font-semibold truncate`}>
            {formatStateName(item.state)}
          </Typography>
          {reason && (
            <Typography variant="body" size="small" className="text-neutral-content-subtler">
              {reason}
            </Typography>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 text-neutral-content-subtler">
          {/* Author section */}
          {!isSystem && (
            <>
              <div className="flex items-center gap-1 shrink-0">
                <Userpic size={20} user={item.triggered_by} username={getUserInitials(item.triggered_by)} />
                <Typography variant="body" size="smaller" className="text-neutral-content-subtler">
                  {userName}
                </Typography>
              </div>
              {/* Dot separator */}
              <div className="size-[3px] rounded-full bg-neutral-content-subtler shrink-0" />
            </>
          )}
          {isSystem && (
            <>
              <Typography variant="body" size="smaller" className="text-neutral-content-subtler">
                System
              </Typography>
              {/* Dot separator */}
              <div className="size-[3px] rounded-full bg-neutral-content-subtler shrink-0" />
            </>
          )}
          {/* Timestamp */}
          <Typography variant="body" size="smaller" className="text-neutral-content-subtler">
            {formatTimestamp(item.created_at)}
          </Typography>
        </div>
      </div>
    </div>
  );
}

export function StateHistoryPopoverContent({ entityType, entityId, isOpen, onClose }: StateHistoryPopoverContentProps) {
  const { data, isLoading, isError, error, refetch } = useStateHistory({
    entityType,
    entityId,
    enabled: isOpen,
  });

  const history = (data?.results || []) as StateHistoryItem[];

  return (
    <div
      className="flex flex-col w-[320px] max-h-[400px] bg-primary-background rounded-lg shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconHistoryRewind className="w-4 h-4" />
            <Typography variant="body" size="small" className="font-medium text-neutral-foreground">
              State History
            </Typography>
          </div>
          {onClose && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              leading={<IconCross />}
              look="string"
              size="small"
              aria-label="Close"
            />
          )}
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
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              className="mt-tight"
              size="smaller"
              variant="primary"
              type="button"
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
          <div className="flex flex-col gap-6">
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
  );
}
