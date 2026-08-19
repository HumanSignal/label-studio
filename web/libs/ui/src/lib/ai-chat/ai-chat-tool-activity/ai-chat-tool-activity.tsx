/**
 * AI chat kit tool / activity list.
 *
 * Compact tool-call and activity pattern inspired by Beautiful UI Tool Chips / Task Rows
 * (https://beautiful-ui-five.vercel.app) — adapted for HumanSignal semantic tokens.
 * Presentation-only: no tool execution or session logic.
 *
 * In-progress highwater rows use AiChatLoadingIcon (dots) — same affordance as
 * “Writing code…” — so agent work never feels stuck (Replit/Lovable-shaped UX).
 */
import { CaretDownIcon, CheckCircleIcon, XCircleIcon } from "@humansignal/icons";
import { type HTMLAttributes, type ReactNode, useState } from "react";
import { cn } from "../../../utils/utils";
import { Badge } from "../../badge/badge";
import { Typography } from "../../typography/typography";
import { AiChatLoadingIcon } from "../ai-chat-loading";
import styles from "./ai-chat-tool-activity.module.css";

export type AiChatToolActivityStatus = "pending" | "running" | "completed" | "failed";

export interface AiChatToolActivityItem {
  id: string;
  label: string;
  detail?: string;
  status?: AiChatToolActivityStatus;
  icon?: ReactNode;
  children?: ReactNode;
}

export interface AiChatToolActivityProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Collapsible summary, e.g. `"4 tool calls, 2 messages"`. */
  summary?: string;
  items?: AiChatToolActivityItem[];
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Custom body replacing the default item list. */
  children?: ReactNode;
}

function StatusIcon({ status }: { status?: AiChatToolActivityStatus }) {
  if (status === "completed") {
    return <CheckCircleIcon size={14} weight="bold" className={styles.statusCompleted} aria-hidden />;
  }
  if (status === "failed") {
    return <XCircleIcon size={14} weight="bold" className={styles.statusFailed} aria-hidden />;
  }
  if (status === "running" || status === "pending") {
    return <AiChatLoadingIcon variant="dots" className={styles.statusBusy} />;
  }
  return <span className={styles.statusPending} aria-hidden />;
}

/** In-progress highwater rows always show dots — custom icons only for settled states. */
function ItemLeadingIcon({ item }: { item: AiChatToolActivityItem }) {
  if (item.status === "running" || item.status === "pending") {
    return <StatusIcon status={item.status} />;
  }
  return <>{item.icon ?? <StatusIcon status={item.status} />}</>;
}

function isBusyStatus(status?: AiChatToolActivityStatus) {
  return status === "running" || status === "pending";
}

function statusBadge(status?: AiChatToolActivityStatus) {
  if (status === "completed")
    return (
      <Badge variant="positive" size="small" look="outline">
        Completed
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="negative" size="small" look="outline">
        Failed
      </Badge>
    );
  if (status === "running")
    return (
      <Badge variant="primary" size="small" look="outline">
        Running
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge variant="neutral" size="small" look="outline">
        Pending
      </Badge>
    );
  return null;
}

export function AiChatToolActivity({
  summary = "Tool activity",
  items = [],
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  children,
  className,
  ...rest
}: AiChatToolActivityProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  const isBusy = items.some((item) => isBusyStatus(item.status));

  const setExpanded = (next: boolean) => {
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  };

  return (
    <div className={cn(styles.root, className)} data-busy={isBusy || undefined} {...rest}>
      <button
        type="button"
        className={styles.summary}
        aria-expanded={isExpanded}
        aria-busy={isBusy || undefined}
        onClick={() => setExpanded(!isExpanded)}
      >
        <CaretDownIcon
          size={12}
          weight="bold"
          className={cn(styles.chevron, !isExpanded && styles.chevronClosed)}
          aria-hidden
        />
        {isBusy ? <AiChatLoadingIcon variant="dots" className={styles.statusBusy} /> : null}
        <Typography variant="label" size="small" as="span" className={styles.summaryLabel}>
          {summary}
        </Typography>
      </button>

      {isExpanded ? (
        <div className={styles.panel}>
          {children ?? (
            <ul className={styles.list}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className={styles.item}
                  data-status={item.status ?? "pending"}
                  data-testid={`ai-chat-tool-item-${item.id}`}
                >
                  <span className={styles.itemIcon}>
                    <ItemLeadingIcon item={item} />
                  </span>
                  <div className={styles.itemBody}>
                    <Typography variant="label" size="small" as="span" className={styles.itemLabel}>
                      {item.label}
                    </Typography>
                    {item.detail ? (
                      <Typography variant="label" size="smaller" as="span" className={styles.itemDetail}>
                        {item.detail}
                      </Typography>
                    ) : null}
                    {item.children}
                  </div>
                  <span className={styles.itemBadge}>{statusBadge(item.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
