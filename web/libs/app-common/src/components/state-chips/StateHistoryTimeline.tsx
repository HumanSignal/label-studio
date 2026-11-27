/**
 * StateHistoryTimeline - Reusable timeline component for displaying state history
 */

import { Avatar, Timeline } from "@humansignal/ui";
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

/** Separates the author (or "System") from the timestamp in the meta row. */
function MetaDot() {
  return <span className="size-[3px] shrink-0 rounded-full bg-neutral-content-subtler" aria-hidden="true" />;
}

export interface TimelineItemProps {
  item: StateHistoryItem;
  index: number;
  /** Injected by the parent `Timeline` when rendered through it; see `Timeline`'s own `isLast` prop. */
  isLast?: boolean;
}

/**
 * Timeline item component for a single state history entry. Renders through the shared `Timeline.Item` from
 * `@humansignal/ui`; the state-to-colour mapping (`getStateVisuals`) and the current/past split stay here.
 */
export function TimelineItem({ item, index, isLast = false }: TimelineItemProps) {
  const isCurrent = index === 0;
  const stateLabel = formatStateName(item.state);
  const visuals = getStateVisuals(stateLabel);
  const StateIcon = visuals.icon;

  // Current state (index 0) gets bold/base colors, past states get subtle colors.
  const bgColor = isCurrent ? visuals.baseBg : visuals.subtleBg;
  const iconColor = isCurrent ? visuals.baseIconColor : visuals.subtleIconColor;

  const userName = formatUserName(item.triggered_by);
  const isSystem = userName === "System";

  return (
    <Timeline.Item
      icon={<StateIcon className="h-6 w-6 shrink-0" style={{ color: iconColor }} />}
      markerColor={{ background: bgColor, icon: iconColor }}
      emphasis={isCurrent ? "strong" : "subtle"}
      title={stateLabel}
      description={item.reason}
      meta={
        <>
          {isSystem ? (
            <span className="shrink-0">System</span>
          ) : (
            <span className="flex min-w-0 items-center gap-tighter">
              <Avatar
                className="shrink-0"
                size="small"
                user={item.triggered_by}
                username={getUserInitials(item.triggered_by)}
              />
              <span className="min-w-0 truncate">{userName}</span>
            </span>
          )}
          <MetaDot />
          <span className="shrink-0 whitespace-nowrap">{formatTimestamp(item.created_at)}</span>
        </>
      }
      isLast={isLast}
    />
  );
}

/**
 * Timeline component that renders a list of state history items through the shared `Timeline`.
 */
export function StateHistoryTimeline({ history }: StateHistoryTimelineProps) {
  return (
    <Timeline>
      {history.map((item: StateHistoryItem, index: number) => (
        <TimelineItem key={`${item.state}-${item.created_at}-${index}`} item={item} index={index} />
      ))}
    </Timeline>
  );
}
