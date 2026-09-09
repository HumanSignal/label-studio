/**
 * CollectionHeader — the deterministic header of a multi-file submission
 * surface: bundle facts on the left (count chip, aggregate upload progress),
 * grid/list view toggle pushed right. Rendered by CollectionUploader;
 * interfaces never compose or restyle it directly.
 */

import { IconGrid, IconList } from "../../assets/icons";
import { Button } from "../button/button";
import { Tooltip } from "../Tooltip/Tooltip";
import { cn } from "../../utils/utils";
import { SubmissionStatusChip } from "./submission-rules";

export type CollectionView = "grid" | "list";

export interface CollectionHeaderProps {
  storedCount: number;
  minFiles: number;
  maxFiles: number;
  /** In-flight uploads, shown as "uploading N…" next to the progress bar. */
  uploadingCount?: number;
  /** Aggregate 0..1 across in-flight uploads; hidden when null. */
  bundleProgress?: number | null;
  /** The bundle is part of a submitted annotation — the chip says so. */
  submitted?: boolean;
  title?: string;
  view: CollectionView;
  onViewChange: (view: CollectionView) => void;
  className?: string;
}

export const CollectionHeader = ({
  storedCount,
  minFiles,
  maxFiles,
  uploadingCount = 0,
  bundleProgress = null,
  submitted = false,
  title = "Submission files",
  view,
  onViewChange,
  className,
}: CollectionHeaderProps) => {
  const countLabel =
    minFiles === maxFiles ? `${storedCount} / ${maxFiles}` : `${storedCount} / ${minFiles}–${maxFiles}`;
  const satisfied = storedCount >= minFiles;
  return (
    <div
      className={cn(
        "flex items-center gap-tight rounded-small border border-neutral-border bg-neutral-surface p-tight",
        className,
      )}
      data-testid="collection-header"
    >
      <span className="font-medium text-neutral-content text-sm">{title}</span>
      <SubmissionStatusChip tone={satisfied ? "positive" : "neutral"}>
        {countLabel}
        {submitted ? " · submitted" : satisfied ? " ✓" : ""}
      </SubmissionStatusChip>
      {bundleProgress != null ? (
        <div
          className="h-1 min-w-10 flex-1 overflow-hidden rounded-small bg-neutral-emphasis"
          data-testid="collection-header-progress"
        >
          <div
            className="h-full bg-primary-surface transition-[width]"
            style={{ width: `${Math.round(bundleProgress * 100)}%` }}
          />
        </div>
      ) : null}
      {uploadingCount > 0 ? (
        <span className="text-neutral-content-subtler text-xs">uploading {uploadingCount}…</span>
      ) : null}
      <span className="ml-auto flex" data-testid="collection-header-view-toggle">
        <Tooltip title="Grid view">
          <Button
            size="smaller"
            look={view === "grid" ? "filled" : "string"}
            variant={view === "grid" ? "primary" : "neutral"}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => onViewChange("grid")}
            icon={<IconGrid />}
          />
        </Tooltip>
        <Tooltip title="List view">
          <Button
            size="smaller"
            look={view === "list" ? "filled" : "string"}
            variant={view === "list" ? "primary" : "neutral"}
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
            icon={<IconList />}
          />
        </Tooltip>
      </span>
    </div>
  );
};
