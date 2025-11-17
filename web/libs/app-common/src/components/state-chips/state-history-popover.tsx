/**
 * StateHistoryPopover component
 * Displays the complete FSM state transition history for an entity
 */

import type React from "react";
import { Popover, Badge, Button } from "@humansignal/ui";
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
            <span className="text-sm font-medium text-neutral-foreground">State History</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <IconSync className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <IconError className="w-8 h-8 text-red-500" />
              <span className="text-sm text-neutral-foreground">Failed to load history</span>
              <span className="text-xs text-gray-500 text-center">
                {error instanceof Error ? error.message : "Unknown error"}
              </span>
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
              <IconHistoryRewind className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500">No history available</span>
            </div>
          )}

          {!isLoading && !isError && history.length > 0 && (
            <div className="space-y-3">
              {history.map((item: StateHistoryItem, index: number) => (
                <div key={index} className="pb-3 border-b border-neutral-border last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getStateColorClass(item.state)}>{formatStateName(item.state)}</Badge>
                    <span className="text-xs text-gray-500">{formatTimestamp(item.created_at)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>By: {formatUserName(item.triggered_by)}</div>
                    {item.transition_name && <div className="mt-1 text-gray-500">{item.transition_name}</div>}
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

