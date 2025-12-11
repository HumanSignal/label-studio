/**
 * StateHistoryTimeline - Reusable timeline component for displaying state history
 */

import { Userpic, cn, Typography } from "@humansignal/ui";
import type { StateHistoryItem } from "../../hooks/useStateHistory";
import { formatStateName, formatTimestamp, formatUserName } from "./utils";
import { getStateVisuals } from "./state-visuals";

export interface StateHistoryTimelineProps {
  history: StateHistoryItem[];
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

export interface TimelineItemProps {
  item: StateHistoryItem;
  index: number;
  isLast: boolean;
}

/**
 * Timeline item component for a single state history entry
 */
export function TimelineItem({ item, index, isLast }: TimelineItemProps) {
  const isCurrent = index === 0;
  const stateLabel = formatStateName(item.state);
  const visuals = getStateVisuals(stateLabel);
  const StateIcon = visuals.icon;

  // Current state (index 0) gets bold/base colors, past states get subtle colors
  const bgColor = isCurrent ? visuals.baseBg : visuals.subtleBg;
  const iconColor = isCurrent ? visuals.baseIconColor : visuals.subtleIconColor;

  // Text color: current state is dark, all past states are subtle
  const labelClass = isCurrent ? "text-neutral-content" : "text-neutral-content-subtle";

  const userName = formatUserName(item.triggered_by);
  const isSystem = userName === "System";
  const reason = item.reason;

  return (
    <div className="flex gap-2 items-start relative">
      {/* Timeline connector line - positioned behind icon, extends to next icon */}
      {!isLast && (
        <div className="absolute w-px bg-neutral-border" style={{ left: "16px", top: "38px", bottom: "4px" }} />
      )}
      {/* Icon column */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        {/* State icon with circular background - 32px circle with 24px icon */}
        <div className="rounded-full size-8 p-1 flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <StateIcon className="w-6 h-6 shrink-0" style={{ color: iconColor }} />
        </div>
      </div>

      {/* Content */}
      <div className={cn("flex flex-col gap-0.5 flex-1 min-h-10 justify-center min-w-0", !isLast && "pb-6")}>
        {/* State name and optional reason */}
        <div className="flex flex-col gap-1">
          <Typography variant="label" size="small" className={`${labelClass} truncate`}>
            {stateLabel}
          </Typography>
          {reason && (
            <Typography variant="body" size="smaller" className="text-neutral-content-subtler mt-0.5">
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
                <Typography variant="body" size="smaller">
                  {userName}
                </Typography>
              </div>
              {/* Dot separator */}
              <div className="size-[3px] rounded-full bg-neutral-content-subtler shrink-0" />
            </>
          )}
          {isSystem && (
            <>
              <Typography variant="body" size="smaller">
                System
              </Typography>
              {/* Dot separator */}
              <div className="size-[3px] rounded-full bg-neutral-content-subtler shrink-0" />
            </>
          )}
          {/* Timestamp */}
          <Typography variant="body" size="smaller">
            {formatTimestamp(item.created_at)}
          </Typography>
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline component that renders a list of state history items
 */
export function StateHistoryTimeline({ history }: StateHistoryTimelineProps) {
  return (
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
  );
}
