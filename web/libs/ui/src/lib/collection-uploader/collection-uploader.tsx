/**
 * CollectionUploader — presentational upload surface for Data Collection
 * submissions.
 *
 * Fully controlled: the caller owns the upload engine/state and passes row
 * views plus callbacks, so the component works the same inside a sandboxed
 * interface (engine over the broker RPC) and in any future host. No network
 * or credential logic lives here.
 */

import {
  Children,
  cloneElement,
  isValidElement,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { IconUploadOutline } from "../../assets/icons";
import { Button } from "../button/button";
import { cn } from "../../utils/utils";
import { EmptyState } from "../empty-state/empty-state";
import { Message } from "../message/message";
import { CollectionHeader, type CollectionView } from "./collection-header";
import {
  evaluateSubmissionRules,
  SubmissionRuleBadges,
  SubmissionStatusChip,
  type SubmissionRules,
} from "./submission-rules";

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
  /** Bundle bounds (`min_files`/`max_files`). maxFiles > 1 switches the surface
   * into bundle mode: card grid + add-tile + count chip; the full dropzone
   * renders only while the bundle is empty. Defaults keep single-file behavior. */
  minFiles?: number;
  maxFiles?: number;
  /** Current bundle members (stored + in-flight) — drives remaining slots. */
  fileCount?: number;
  /** Fully stored members — what the count chip weighs against minFiles. */
  storedCount?: number;
  /** Aggregate 0..1 across in-flight uploads, for the header. */
  bundleProgress?: number | null;
  /** In-flight uploads, shown in the header. */
  uploadingCount?: number;
  /** The whole bundle is part of a submitted annotation. */
  submitted?: boolean;
  /** The MediaCards, one per bundle member; the uploader lays them out as a
   * 2-column grid or dense rows per the header's view toggle. */
  children?: ReactNode;
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
  minFiles = 1,
  maxFiles = 1,
  fileCount = 0,
  storedCount = 0,
  bundleProgress = null,
  uploadingCount = 0,
  submitted = false,
  children,
}: CollectionUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [overPickNotice, setOverPickNotice] = useState<string | null>(null);
  const [view, setView] = useState<CollectionView>(() => {
    try {
      return localStorage.getItem("collection-uploader-view") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const changeView = useCallback((next: CollectionView) => {
    setView(next);
    try {
      localStorage.setItem("collection-uploader-view", next);
    } catch {
      // view preference is best-effort
    }
  }, []);
  const highlighted = (dragging || dragActive) && !disabled;

  const bundleMode = maxFiles > 1;
  const slotsLeft = bundleMode ? Math.max(0, maxFiles - fileCount) : Number.POSITIVE_INFINITY;

  const pick = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || disabled) return;
      const files = Array.from(fileList);
      if (!bundleMode) {
        onPick(files);
        return;
      }
      // Deterministic over-pick rule: fill the remaining slots in pick order,
      // skip the rest, and say so once — never silently drop files.
      if (slotsLeft <= 0) {
        setOverPickNotice("The bundle is full — remove a file before adding another.");
        return;
      }
      if (files.length > slotsLeft) {
        const skipped = files.length - slotsLeft;
        setOverPickNotice(
          `You picked ${files.length} files but only ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} ` +
            `${slotsLeft === 1 ? "is" : "are"} left — ${slotsLeft} taken, ${skipped} skipped.`,
        );
        onPick(files.slice(0, slotsLeft));
        return;
      }
      setOverPickNotice(null);
      onPick(files);
    },
    [bundleMode, disabled, onPick, slotsLeft],
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

  const neededForMin = Math.max(0, minFiles - fileCount);
  // Rejected picks render as cards without occupying slots, so the grid must
  // follow the CHILDREN, not just the slot count — a fully-rejected first pick
  // still replaces the dropzone with its rejected card.
  const hasCards = Children.count(children) > 0;
  const showDropzone = !bundleMode || (fileCount === 0 && !hasCards);

  return (
    <div className={cn("flex flex-col gap-tight", className)} data-testid="collection-uploader">
      {bundleMode ? (
        <CollectionHeader
          storedCount={storedCount}
          minFiles={minFiles}
          maxFiles={maxFiles}
          uploadingCount={uploadingCount}
          bundleProgress={bundleProgress}
          submitted={submitted}
          view={view}
          onViewChange={changeView}
        />
      ) : null}

      {overPickNotice ? (
        <Message variant="warning" size="small" data-testid="collection-uploader-overpick">
          {overPickNotice}
        </Message>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        multiple={bundleMode || undefined}
        className="hidden"
        data-testid="collection-uploader-input"
        onChange={onInputChange}
      />

      {showDropzone ? (
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
          <EmptyState
            size="small"
            variant={highlighted ? "primary" : "neutral"}
            icon={<IconUploadOutline />}
            title="Drag & drop or click to browse"
            description={hint}
            additionalContent={
              rules ? (
                <SubmissionRuleBadges results={evaluateSubmissionRules(null, rules)} className="justify-center" />
              ) : null
            }
          />
        </div>
      ) : null}

      {bundleMode && (fileCount > 0 || hasCards) ? (
        <div
          className={
            view === "grid"
              ? // One card per row on phone-sized viewports (767px is the
                // platform mobile breakpoint), two side by side from md up.
                "grid grid-cols-1 gap-tight md:grid-cols-2"
              : "flex flex-col gap-tight"
          }
          data-testid={view === "grid" ? "collection-uploader-grid" : "collection-uploader-list"}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {Children.map(children, (child) =>
            isValidElement(child)
              ? cloneElement(child as React.ReactElement<{ layout?: string }>, {
                  layout: view === "list" ? "row" : "card",
                })
              : child,
          )}
        </div>
      ) : null}

      {bundleMode && (fileCount > 0 || hasCards) && slotsLeft > 0 && !disabled ? (
        <button
          type="button"
          data-testid="collection-uploader-strip"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop as unknown as React.DragEventHandler<HTMLButtonElement>}
          className={cn(
            "cursor-pointer rounded-small border-2 border-dashed p-tight text-center text-neutral-content-subtler text-sm transition-colors",
            highlighted
              ? "border-primary-border bg-primary-background"
              : "border-neutral-border bg-neutral-surface hover:border-primary-border",
          )}
        >
          {neededForMin > 0 ? (
            <span className="font-medium text-primary-content">
              ＋ Add at least {neededForMin} more — drag & drop or click
            </span>
          ) : (
            <span>＋ Up to {slotsLeft} more — optional</span>
          )}
        </button>
      ) : null}

      {(bundleMode ? [] : rows).map((row) => (
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
