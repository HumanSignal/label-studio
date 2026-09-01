/**
 * CollectionUploader — presentational upload surface for Data Collection
 * submissions.
 *
 * Fully controlled: the caller owns the upload engine/state and passes row
 * views plus callbacks, so the component works the same inside a sandboxed
 * interface (engine over the broker RPC) and in any future host. No network
 * or credential logic lives here.
 */

import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from "react";
import { Button } from "../button/button";
import { cn } from "../../utils/utils";
import { evaluateSubmissionRules, SubmissionRuleBadges, type SubmissionRules } from "./submission-rules";

export type CollectionUploadRowStatus = "pending" | "uploading" | "uploaded" | "failed" | "cancelled";

export interface CollectionUploadRowView {
  clientRef: string;
  filename: string;
  size: number;
  status: CollectionUploadRowStatus;
  /** 0..1 */
  progress: number;
  error?: string | null;
}

export interface CollectionUploaderProps {
  rows: CollectionUploadRowView[];
  onPick: (files: File[]) => void;
  onRetry?: (clientRef: string) => void;
  onCancel?: (clientRef: string) => void;
  accept?: string;
  disabled?: boolean;
  hint?: string;
  className?: string;
  /** Highlight the dropzone from outside — e.g. while a file is dragged
   * anywhere over a host surface that will forward the drop here, so the user
   * can see there is somewhere for the file to land. */
  dragActive?: boolean;
  /** Declared validation rules (`x-ls-validation`): shown as neutral badges in
   * the dropzone so the contributor knows the bar BEFORE picking a file. */
  rules?: SubmissionRules | null;
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

const STATUS_LABEL: Record<CollectionUploadRowStatus, string> = {
  pending: "Preparing…",
  uploading: "Uploading…",
  uploaded: "Uploaded",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const CollectionUploader = ({
  rows,
  onPick,
  onRetry,
  onCancel,
  accept,
  disabled = false,
  hint,
  className,
  dragActive = false,
  rules = null,
}: CollectionUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const highlighted = (dragging || dragActive) && !disabled;

  const pick = useCallback(
    (files: FileList | null) => {
      if (!files?.length || disabled) return;
      onPick(Array.from(files));
    },
    [disabled, onPick],
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      pick(event.target.files);
      event.target.value = "";
    },
    [pick],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      pick(event.dataTransfer?.files ?? null);
    },
    [pick],
  );

  return (
    <div className={cn("flex flex-col gap-tight", className)} data-testid="collection-uploader">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        data-testid="collection-uploader-dropzone"
        className={cn(
          "flex flex-col items-center justify-center gap-tightest rounded-small border-2 border-dashed p-wide text-center transition-colors",
          highlighted ? "border-primary-border bg-primary-background" : "border-neutral-border bg-neutral-surface",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary-border",
        )}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="font-medium text-neutral-content">Drag &amp; drop or click to browse</span>
        {hint ? <span className="text-neutral-content-subtler text-sm">{hint}</span> : null}
        {rules ? (
          <SubmissionRuleBadges results={evaluateSubmissionRules(null, rules)} className="justify-center" />
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          data-testid="collection-uploader-input"
          onChange={onInputChange}
        />
      </div>

      {rows.map((row) => (
        <div
          key={row.clientRef}
          data-testid={`collection-uploader-row-${row.status}`}
          className="flex flex-col gap-tightest rounded-small border border-neutral-border bg-neutral-surface p-tight"
        >
          <div className="flex items-center gap-tight">
            <span className="min-w-0 flex-1 truncate text-neutral-content">
              <span className="font-medium">{row.filename}</span>{" "}
              <span className="text-neutral-content-subtler text-sm">{formatSize(row.size)}</span>
            </span>
            <span
              className={cn(
                "text-sm",
                row.status === "failed" && "text-negative-content",
                row.status === "uploaded" && "text-positive-content",
                (row.status === "uploading" || row.status === "pending") && "text-neutral-content-subtler",
              )}
            >
              {STATUS_LABEL[row.status]}
              {row.status === "uploading" ? ` ${Math.round(row.progress * 100)}%` : ""}
            </span>
            {row.status === "failed" && onRetry ? (
              <Button size="small" look="outlined" onClick={() => onRetry(row.clientRef)}>
                Retry
              </Button>
            ) : null}
            {(row.status === "uploading" || row.status === "pending" || row.status === "failed") && onCancel ? (
              <Button size="small" look="string" variant="negative" onClick={() => onCancel(row.clientRef)}>
                Remove
              </Button>
            ) : null}
          </div>
          {row.status === "uploading" ? (
            <div className="h-2 overflow-hidden rounded-small bg-neutral-emphasis">
              <div
                className="h-full bg-primary-surface transition-[width]"
                style={{ width: `${Math.round(row.progress * 100)}%` }}
              />
            </div>
          ) : null}
          {row.status === "failed" && row.error ? (
            <span className="text-negative-content text-sm">{row.error}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
};
