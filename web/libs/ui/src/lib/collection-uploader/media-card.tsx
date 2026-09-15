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

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, PlayIcon, SwapIcon, TrashIcon } from "../../assets/icons";
import { Tooltip } from "../Tooltip/Tooltip";
import { Button } from "../button/button";
import { Message } from "../message/message";
import { cn } from "../../utils/utils";
import { SubmissionRuleBadges, SubmissionStatusChip, type SubmissionRuleResult } from "./submission-rules";

export type MediaCardState = "uploading" | "failed" | "rejected" | "uploaded" | "submitted" | "readonly";

export interface MediaCardPdfHandle {
  pageCount: number;
  renderPage(pageNumber: number, canvas: HTMLCanvasElement, maxWidth: number): Promise<void>;
}

/** Lazily loaded, host-provided PDF renderer; the cache that created it owns
 * the document's lifetime, the card only reads pages. */
export interface MediaCardPdfSource {
  load(): Promise<MediaCardPdfHandle>;
}

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
  /** "video" | "image" | "pdf" — anything else renders a plain file placeholder. */
  kind: "video" | "image" | "pdf" | "file";
  /** PDF members: page renderer; without it a PDF falls back to the placeholder. */
  pdf?: MediaCardPdfSource;
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
  /** "row" renders the same data as a dense horizontal row (list view). */
  layout?: "card" | "row";
  className?: string;
}

const CHIP: Record<
  MediaCardState,
  { text: (progress?: number) => string; tone: "primary" | "negative" | "positive" | "neutral" }
> = {
  uploading: { text: (p) => `Uploading ${Math.round((p || 0) * 100)}%`, tone: "primary" },
  failed: { text: () => "Failed", tone: "negative" },
  rejected: { text: () => "Not accepted", tone: "negative" },
  uploaded: { text: () => "Uploaded", tone: "positive" },
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
  pdf,
  previewUrl,
  posterUrl,
  previewBroken: previewBrokenProp = false,
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
  layout = "card",
  className,
}: MediaCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfHandle, setPdfHandle] = useState<MediaCardPdfHandle | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [playing, setPlaying] = useState(false);
  // Degrade gracefully on an unknown state (e.g. a legacy template snapshot
  // passing a since-removed value) instead of crashing the interface.
  const chip = CHIP[state] ?? CHIP.uploaded;
  const editable = state !== "readonly";
  const safeFile: MediaCardFile = file ?? { name: "Submission" };

  // Broken-preview detection must not rely on the <img>/<video> `error` event
  // alone: the token-proxy resolver answers some failure modes (expired
  // signature, a service-worker-cached stale redirect) with a response that
  // never fires `onError` in every browser, leaving a broken glyph on screen.
  // Treat three signals as "broken" — the error event, a load that settles
  // with zero intrinsic size, and a resolve that never settles within a
  // timeout — all funnelled through the caller's onPreviewError so the parent
  // flips `previewBroken` and this card swaps to the honest placeholder.
  // Broken state is owned HERE, not round-tripped through the parent: the
  // resolver URL can change between renders (fresh signing token), so a
  // parent flag keyed by that URL never matches the URL it is read against
  // and the placeholder never shows. The component knows its own load
  // outcome, so it tracks it directly — resetting whenever the previewUrl
  // changes (a retry cache-busts the URL, which re-arms detection).
  const onPreviewErrorRef = useRef(onPreviewError);
  onPreviewErrorRef.current = onPreviewError;
  const [autoBroken, setAutoBroken] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);
  const markBroken = useCallback(() => {
    clearPreviewTimer();
    setAutoBroken(true);
    onPreviewErrorRef.current?.();
  }, [clearPreviewTimer]);
  // Detection must not rely on the media `error` event alone: the token-proxy
  // resolver answers some failures (expired signature, a service-worker-cached
  // stale redirect) with a response that never fires `onError` in every
  // browser. A load that settles with zero intrinsic size, and a resolve that
  // never settles within a timeout, are the other two signals.
  useEffect(() => {
    clearPreviewTimer();
    setAutoBroken(false);
    if (!previewUrl || previewBrokenProp || kind === "file") return;
    previewTimerRef.current = setTimeout(markBroken, 8000);
    return clearPreviewTimer;
  }, [previewUrl, previewBrokenProp, kind, clearPreviewTimer, markBroken]);
  const previewBroken = previewBrokenProp || autoBroken;

  useEffect(() => {
    setPdfHandle(null);
    setPdfPage(1);
    if (kind !== "pdf" || !pdf || !previewUrl || previewBrokenProp) return;
    let alive = true;
    pdf
      .load()
      .then((handle) => {
        if (alive) setPdfHandle(handle);
      })
      .catch(() => {
        if (alive) markBroken();
      });
    return () => {
      alive = false;
    };
  }, [kind, pdf, previewUrl, previewBrokenProp, markBroken]);

  useEffect(() => {
    const canvas = pdfCanvasRef.current;
    if (!pdfHandle || !canvas) return;
    let alive = true;
    const maxWidth = canvas.parentElement?.clientWidth || 480;
    pdfHandle
      .renderPage(pdfPage, canvas, maxWidth)
      .then(() => {
        if (alive) clearPreviewTimer();
      })
      .catch(() => {
        if (alive) markBroken();
      });
    return () => {
      alive = false;
    };
  }, [pdfHandle, pdfPage, clearPreviewTimer, markBroken]);

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

  const rowActions = editable && state !== "readonly" && (
    <span className="ml-auto flex flex-none items-center gap-tight">
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
      {state !== "uploading" && onReplace ? (
        <Tooltip title="Replace this file">
          <Button
            size="small"
            look="outlined"
            aria-label="Replace this file"
            leading={<SwapIcon />}
            onClick={onReplace}
          />
        </Tooltip>
      ) : null}
      {state !== "uploading" && onRemove ? (
        <Tooltip title="Remove this file">
          <Button
            size="small"
            look="string"
            variant="negative"
            aria-label="Remove this file"
            leading={<TrashIcon />}
            onClick={onRemove}
          />
        </Tooltip>
      ) : null}
    </span>
  );

  if (layout === "row") {
    const firstFail = (ruleResults || []).find((r) => r.status === "fail");
    return (
      <div
        className={cn(
          "flex items-center gap-tight rounded-small border border-neutral-border bg-neutral-surface p-tight",
          className,
        )}
        data-testid={`media-card-${state}`}
        data-layout="row"
      >
        <span className="flex h-8 w-12 flex-none items-center justify-center overflow-hidden rounded-small bg-neutral-emphasis">
          {previewUrl && !previewBroken && kind === "image" ? (
            // biome-ignore lint/a11y/useAltText: submission media, filename beside it
            <img
              src={previewUrl}
              alt={safeFile.name}
              className="h-full w-full object-cover"
              onLoad={(event) => {
                if (!event.currentTarget.naturalWidth) markBroken();
                else clearPreviewTimer();
              }}
              onError={markBroken}
            />
          ) : (
            <span className="font-bold text-[8px] text-neutral-content-subtle">
              {extBadge(safeFile.name, safeFile.contentType)}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-neutral-content text-sm">{safeFile.name}</span>
          <span className="block truncate text-neutral-content-subtler text-xs">
            {facts}
            {metaParts.length ? ` · ${metaParts.join(" · ")}` : ""}
            {firstFail ? " · " : ""}
            {firstFail ? <span className="text-negative-content">{firstFail.label} ✕</span> : null}
          </span>
        </span>
        {state === "uploading" ? (
          <span className="w-16 flex-none">
            <span className="block h-1 overflow-hidden rounded-small bg-neutral-emphasis">
              <span
                className="block h-full bg-primary-surface transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
          </span>
        ) : null}
        <SubmissionStatusChip tone={chip.tone}>{chip.text(progress)}</SubmissionStatusChip>
        {rowActions}
      </div>
    );
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
          <span className="block truncate text-neutral-content-subtler text-xs">{facts}</span>
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
              if (!img.naturalWidth) {
                markBroken();
                return;
              }
              clearPreviewTimer();
              onMediaMetadata?.({ width: img.naturalWidth, height: img.naturalHeight });
            }}
            onError={markBroken}
          />
        ) : kind === "pdf" && pdf ? (
          <div
            className="relative bg-neutral-emphasis-subtle"
            data-testid="media-card-pdf"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the group is the arrow-key paging target
            tabIndex={0}
            role="group"
            aria-label={pdfHandle ? `PDF preview, page ${pdfPage} of ${pdfHandle.pageCount}` : "PDF preview loading"}
            onKeyDown={(event) => {
              if (!pdfHandle) return;
              if (event.key === "ArrowLeft") setPdfPage((page) => Math.max(1, page - 1));
              if (event.key === "ArrowRight") setPdfPage((page) => Math.min(pdfHandle.pageCount, page + 1));
            }}
          >
            <canvas
              ref={pdfCanvasRef}
              className="mx-auto block max-h-80 max-w-full"
              data-testid="media-card-pdf-canvas"
            />
            {!pdfHandle ? (
              <div className="flex h-36 items-center justify-center text-neutral-content-subtler text-xs">
                Preparing preview…
              </div>
            ) : null}
            {pdfHandle && pdfHandle.pageCount > 1 ? (
              <div
                className="-translate-x-1/2 absolute bottom-tight left-1/2 flex items-center gap-tightest rounded-small border border-neutral-border bg-neutral-surface px-tightest shadow-medium"
                data-testid="media-card-pdf-pager"
              >
                <Button
                  size="small"
                  look="string"
                  aria-label="Previous page"
                  leading={<CaretLeftIcon />}
                  disabled={pdfPage <= 1}
                  onClick={() => setPdfPage((page) => Math.max(1, page - 1))}
                />
                <span className="text-neutral-content-subtle text-xs tabular-nums" data-testid="media-card-pdf-page">
                  {pdfPage} / {pdfHandle.pageCount}
                </span>
                <Button
                  size="small"
                  look="string"
                  aria-label="Next page"
                  leading={<CaretRightIcon />}
                  disabled={pdfPage >= pdfHandle.pageCount}
                  onClick={() => setPdfPage((page) => Math.min(pdfHandle.pageCount, page + 1))}
                />
              </div>
            ) : null}
          </div>
        ) : kind === "video" ? (
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
                clearPreviewTimer();
                onMediaMetadata?.({ durationSec: media.duration, width: media.videoWidth, height: media.videoHeight });
              }}
              onError={markBroken}
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
                  <PlayIcon size={24} weight="fill" />
                </span>
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex h-36 items-center justify-center bg-neutral-emphasis-subtle px-wide text-center text-neutral-content-subtler text-xs">
            No preview for this file type.
          </div>
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
          {ruleResults && ruleResults.length > 0 ? (
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SubmissionRuleBadges results={ruleResults} className="w-max flex-nowrap" />
            </div>
          ) : null}
          {metaParts.length > 0 ? (
            <div
              className="flex gap-x-wide overflow-x-auto font-mono text-neutral-content-subtler text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              data-testid="media-card-meta"
            >
              {metaParts.map((part) => (
                <span key={part} className="flex-none whitespace-nowrap">
                  {part}
                </span>
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
        <div className="flex overflow-x-auto border-neutral-border-subtle border-t p-tight [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="ml-auto flex flex-none items-center gap-tight">
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
              <Button size="small" look="outlined" leading={<SwapIcon />} onClick={onReplace}>
                Replace…
              </Button>
            ) : null}
            {state !== "uploading" && onRemove ? (
              <Button size="small" look="string" variant="negative" leading={<TrashIcon />} onClick={onRemove}>
                Remove
              </Button>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
};
