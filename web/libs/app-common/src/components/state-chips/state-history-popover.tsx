/**
 * StateHistoryPopover component
 * Displays the complete FSM state transition history for an entity
 */

import type React from "react";
import { Popover, Badge, Button, Typography } from "@humansignal/ui";
import { IconSync, IconError, IconHistoryRewind } from "@humansignal/icons";
import { useStateHistory, type StateHistoryItem } from "../../hooks/useStateHistory";
import { getStateColorClass, formatStateName, formatTimestamp, formatUserName } from "./utils";

export interface StateHistoryPopoverProps {
  trigger: React.ReactNode;
  entityType: "task" | "annotation" | "project";
  entityId: number;
  currentState: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
        className="flex flex-col w-[320px] max-h-[400px] bg-primary-background rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-border">
          <div className="flex items-center gap-2">
            <IconHistoryRewind className="w-4 h-4 " />
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
            <div className="space-y-3">
              {history.map((item: StateHistoryItem, index: number) => (
                <div key={index} className="pb-3 border-b border-neutral-border last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getStateColorClass(item.state)}>{formatStateName(item.state)}</Badge>
                    <Typography variant="body" size="smallest" className="text-neutral-content-subtle">
                      {formatTimestamp(item.created_at)}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="body" size="smallest" className="text-muted-foreground">
                      By: {formatUserName(item.triggered_by)}
                    </Typography>
                    {item.transition_name && (
                      <Typography variant="body" size="smallest" className="mt-1 text-neutral-content-subtle">
                        {item.transition_name}
                      </Typography>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Popover>
  );
}
