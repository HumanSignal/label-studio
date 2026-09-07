/**
 * MediaCard — the single, stable media card for Data Collection submissions
 * (image and video). The dropzone (CollectionUploader) and this card are the
 * two platform-owned surfaces of the upload UI: interfaces wire state and
 * handlers, the card owns anatomy and behavior.
 *
 * Fixed anatomy, top to bottom: header (ext badge · filename + facts · status
 * chip) | divider | media + progress | divider | rule badges + metadata +
 * message (DS Message) | divider | actions footer, right-aligned.
 * States change chip/media/message/actions — never the order. One card per
 * task: attempts and replacements mutate it in place; there is never a list.
 */

import { type ReactNode, useCallback, useRef, useState } from "react";
import { IconPlay } from "../../assets/icons";
import { Button } from "../button/button";
import { Message } from "../message/message";
import { cn } from "../../utils/utils";
import { SubmissionRuleBadges, SubmissionStatusChip, type SubmissionRuleResult } from "./submission-rules";

export type MediaCardState = "uploading" | "failed" | "rejected" | "ready" | "stored" | "submitted" | "readonly";

export interface MediaCardFile {
  name: string;
  size?: number | null;
  contentType?: string | null;
}

export interface MediaCardMeta {
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface MediaCardProps {
  state: MediaCardState;
  /** Prefer the stored submission's facts when no local File exists; a missing
   * file renders a neutral "Submission" header instead of crashing. */
  file?: MediaCardFile | null;
  /** "video" | "image" — anything else renders a plain file placeholder. */
  kind: "video" | "image" | "file";
  /** Playable/viewable source (local blob or resolver URL). */
  previewUrl?: string | null;
  /** Optional poster frame for videos (iOS paints nothing until interaction). */
  posterUrl?: string | null;
  /** The media element failed to load — show the honest placeholder. */
  previewBroken?: boolean;
  /** 0..1, uploading state only. */
  progress?: number;
  /** Single message block (error/notice). At most one, always inside the card. */
  message?: ReactNode;
  ruleResults?: SubmissionRuleResult[];
  meta?: MediaCardMeta | null;
  /** "stored" suffix in the header facts (recovered from the server). */
  storedHint?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
  onRetryPreview?: () => void;
  /** Media metadata became known (duration/dimensions from the element). */
  onMediaMetadata?: (meta: MediaCardMeta) => void;
  onPreviewError?: () => void;
  className?: string;
}

const CHIP: Record<
  MediaCardState,
  { text: (progress?: number) => string; tone: "primary" | "negative" | "positive" | "neutral" }
> = {
  uploading: { text: (p) => `Uploading ${Math.round((p || 0) * 100)}%`, tone: "primary" },
  failed: { text: () => "Failed", tone: "negative" },
  rejected: { text: () => "Not accepted", tone: "negative" },
  ready: { text: () => "Ready to submit", tone: "positive" },
  stored: { text: () => "Stored", tone: "neutral" },
  submitted: { text: () => "Submitted", tone: "neutral" },
  readonly: { text: () => "Submitted", tone: "neutral" },
};

function extBadge(name: string, contentType?: string | null): string {
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  const fromType = contentType?.includes("/") ? contentType.split("/").pop() : "";
  return (fromName || fromType || "FILE").toUpperCase().slice(0, 4);
}

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export const MediaCard = ({
  state,
  file,
  kind,
  previewUrl,
  posterUrl,
  previewBroken = false,
  progress = 0,
  message,
  ruleResults,
  meta,
  storedHint = false,
  onCancel,
  onRetry,
  onReplace,
  onRemove,
  onRetryPreview,
  onMediaMetadata,
  onPreviewError,
  className,
}: MediaCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const chip = CHIP[state];
  const editable = state !== "readonly";
  const safeFile: MediaCardFile = file ?? { name: "Submission" };

  const startPlayback = useCallback(() => {
    videoRef.current?.play().catch(() => undefined);
  }, []);

  const facts = [safeFile.contentType || "unknown type", formatSize(safeFile.size), storedHint ? "stored" : ""]
    .filter(Boolean)
    .join(" · ");

  const metaParts: string[] = [];
  if (meta && Number.isFinite(meta.durationSec as number))
    metaParts.push(`${(meta.durationSec as number).toFixed(2)}s`);
  if (meta && (meta.width || 0) > 0 && (meta.height || 0) > 0) {
    metaParts.push(`${meta.width} × ${meta.height}`);
    metaParts.push((meta.height as number) >= (meta.width as number) ? "portrait" : "landscape");
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-small border border-neutral-border bg-neutral-surface",
        className,
      )}
      data-testid={`media-card-${state}`}
    >
      <div className="flex items-center gap-tight border-neutral-border-subtle border-b p-tight">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-small bg-neutral-emphasis font-bold text-[9px] text-neutral-content-subtle">
          {extBadge(safeFile.name, safeFile.contentType)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-neutral-content text-sm">{safeFile.name}</span>
          <span className="block text-neutral-content-subtler text-xs">{facts}</span>
        </span>
        <SubmissionStatusChip tone={chip.tone}>{chip.text(progress)}</SubmissionStatusChip>
      </div>

      <div className="relative m-tight overflow-hidden rounded-small" data-testid="media-card-media">
        {previewBroken || !previewUrl ? (
          <div className="flex h-36 items-center justify-center bg-neutral-emphasis-subtle px-wide text-center text-neutral-content-subtler text-xs">
            {previewBroken
              ? "Preview couldn't be loaded — the file is stored safely."
              : kind === "file"
                ? "No preview for this file type."
                : "Preparing preview…"}
          </div>
        ) : kind === "image" ? (
          // biome-ignore lint/a11y/useAltText: submission media, filename shown above
          <img
            src={previewUrl}
            alt={safeFile.name}
            loading="lazy"
            className="block max-h-80 w-full bg-neutral-emphasis object-contain"
            onLoad={(event) => {
              const img = event.currentTarget;
              onMediaMetadata?.({ width: img.naturalWidth, height: img.naturalHeight });
            }}
            onError={onPreviewError}
          />
        ) : (
          <>
            {/* biome-ignore lint/a11y/useMediaCaption: contributor-submitted media has no captions */}
            <video
              ref={videoRef}
              src={previewUrl}
              poster={posterUrl || undefined}
              playsInline
              controls={playing}
              preload="metadata"
              className="block max-h-80 w-full bg-[black]"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={(event) => {
                const media = event.currentTarget;
                onMediaMetadata?.({ durationSec: media.duration, width: media.videoWidth, height: media.videoHeight });
              }}
              onError={onPreviewError}
            />
            {!playing ? (
              <button
                type="button"
                aria-label="Play"
                data-testid="media-card-play"
                onClick={startPlayback}
                className="absolute inset-0 flex cursor-pointer items-center justify-center border-none bg-transparent"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-surface text-neutral-content shadow-medium">
                  <IconPlay width={24} height={24} />
                </span>
              </button>
            ) : null}
          </>
        )}
      </div>

      {state === "uploading" ? (
        <div
          className="mx-tight mb-tight h-1.5 overflow-hidden rounded-small bg-neutral-emphasis"
          data-testid="media-card-progress"
        >
          <div
            className="h-full bg-primary-surface transition-[width]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}

      {(ruleResults && ruleResults.length > 0) || metaParts.length > 0 || message ? (
        <div className="flex flex-col gap-tight border-neutral-border-subtle border-t p-tight">
          {ruleResults && ruleResults.length > 0 ? <SubmissionRuleBadges results={ruleResults} /> : null}
          {metaParts.length > 0 ? (
            <div
              className="flex flex-wrap gap-x-wide gap-y-tightest font-mono text-neutral-content-subtler text-xs"
              data-testid="media-card-meta"
            >
              {metaParts.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </div>
          ) : null}
          {message ? (
            <Message variant="negative" size="small" data-testid="media-card-message">
              {message}
            </Message>
          ) : null}
        </div>
      ) : null}

      {editable &&
      (state === "uploading" || onRetry || onReplace || onRemove || (previewBroken && onRetryPreview)) &&
      state !== "readonly" ? (
        <div className="flex justify-end gap-tight border-neutral-border-subtle border-t p-tight">
          {state === "uploading" && onCancel ? (
            <Button size="small" look="string" variant="negative" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          {state === "failed" && onRetry ? (
            <Button size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {previewBroken && onRetryPreview && state !== "uploading" ? (
            <Button size="small" look="outlined" onClick={onRetryPreview}>
              Retry preview
            </Button>
          ) : null}
          {state !== "uploading" && onReplace ? (
            <Button size="small" look="outlined" onClick={onReplace}>
              Replace…
            </Button>
          ) : null}
          {state !== "uploading" && state !== "submitted" && onRemove ? (
            <Button size="small" look="string" variant="negative" onClick={onRemove}>
              Remove
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
