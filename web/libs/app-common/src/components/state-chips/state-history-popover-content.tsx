/**
 * StateHistoryPopoverContent - Popover content for displaying state history as a timeline
 */

import { Button, Typography } from "@humansignal/ui";
import { IconSync, IconError, IconHistoryRewind, IconCross } from "@humansignal/icons";
import { useStateHistory, type StateHistoryItem } from "../../hooks/useStateHistory";
import { StateHistoryTimeline } from "./StateHistoryTimeline";

export interface StateHistoryPopoverContentProps {
  entityType: "task" | "annotation" | "project";
  entityId: number;
  isOpen: boolean;
  onClose?: () => void;
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
      className="flex flex-col w-[360px] max-h-[400px] bg-neutral-background rounded-lg shadow-lg"
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

        {!isLoading && !isError && history.length > 0 && <StateHistoryTimeline history={history} />}
      </div>
    </div>
  );
}
