/**
 * Shared, presentational AnnotationButton.
 *
 * Pure props in / pure callbacks out. No MST, no Jotai. Visuals follow the classic
 * editor (BEM `.prefix.css`, `lsf-annotation-button*` selectors after PostCSS) so
 * Cypress tests, frontend-test helpers, and customer whitelabel CSS keep working.
 *
 * Data hydration (lazy stub fetch, user resolution, MST `enrichUsers`) is the
 * wrapper's responsibility — by the time the wrapper renders <AnnotationButton/>
 * the SharedAnnotation it passes is fully populated.
 *
 * Delete confirmation lives in the classic wrapper (uses editor/common/Modal/Modal#confirm)
 * — the shared component just calls `handlers.onDelete` and lets the wrapper decide
 * whether to confirm before invoking the real action.
 */

import i18next from "i18next";
import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import { createPortal } from "react-dom";
import { format, isValid } from "date-fns";
import zhCN from "date-fns/locale/zh-CN";
import enUS from "date-fns/locale/en-US";
import {
  ChartBarIcon,
  IconAnnotationGroundTruth,
  IconAnnotationSkipped2,
  IconCheckAlt,
  CopyIcon,
  IconCommentResolved,
  IconCommentUnresolved,
  IconCrossAlt,
  IconDraftCreated2,
  IconEllipsisVertical,
  LinkSimpleHorizontalIcon,
  IconSparks,
  StarIcon,
  TrashIcon,
  IntersectSquareIcon,
} from "@humansignal/icons";
import { Badge, DropdownTrigger, Tooltip, ToastContext, ToastType, Userpic, useDropdown } from "@humansignal/ui";
import { cnb as cn } from "../utils/bem";
import { useCopyText } from "../hooks/useCopyText";
import { isDefined, userDisplayName } from "../utils/helpers";
import type {
  AnnotationActionHandlers,
  AnnotationCapabilities,
  AnnotationsListLayout,
  SharedAnnotation,
  SharedUser,
} from "./types";
import "./AnnotationButton.prefix.css";
import contextMenuStyles from "./ContextMenu.module.css";
import {
  computeVerticalRightTooltipPosition,
  VERTICAL_TOOLTIP_ESTIMATED_SIZE,
  type TooltipPosition,
} from "./vertical-tooltip-position";

const NAME_TRUNCATE_START = 8;
const NAME_TRUNCATE_END = 6;
const NAME_TRUNCATE_THRESHOLD = 15;
const HOVER_INTENT_DELAY = 300;

function isPersonName(text: string): boolean {
  if (!text || text.includes("@")) return false;
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return false;
  return parts.every((part) => /^[a-zA-Z-]+$/.test(part) && part.length >= 2);
}

function truncatePersonName(name: string): string {
  if (name.length <= NAME_TRUNCATE_THRESHOLD) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const firstName = parts[0];
  const middleParts = parts.slice(1, -1).map((p) => `${p[0]}.`);
  const lastName = parts[parts.length - 1];
  return [firstName, ...middleParts, `${lastName[0]}.`].join(" ");
}

function truncateMiddle(text: string, start: number, end: number, ellipsis: string): string {
  if (text.length <= start + end) return text;
  return text.slice(0, start) + ellipsis + text.slice(text.length - end);
}

const TOOLTIP_ID_TRUNCATE_START = 8;
const TOOLTIP_ID_TRUNCATE_END = 6;
const TOOLTIP_ID_TRUNCATE_THRESHOLD = 18;

/**
 * Compact tooltip label for shell tab ids (ULID/UUID) while keeping copy/link on the full value.
 * Prefer persisted pk, then server draft pk, then middle-truncated client ids.
 */
export function formatTooltipAnnotationId(
  shellOrPk: string | number | null | undefined,
  options?: { draftId?: number | null; pk?: string | number | null },
): string | null {
  const pk = options?.pk;
  if (pk != null && String(pk) !== "") return String(pk);

  const draftId = options?.draftId;
  if (draftId != null && Number(draftId) > 0) return String(draftId);

  if (shellOrPk == null || shellOrPk === "") return null;
  const raw = String(shellOrPk);
  const draftShell = /^draft-(\d+)$/.exec(raw);
  if (draftShell) return draftShell[1];

  if (/^\d+$/.test(raw)) return raw;
  if (raw.length > TOOLTIP_ID_TRUNCATE_THRESHOLD) {
    return truncateMiddle(raw, TOOLTIP_ID_TRUNCATE_START, TOOLTIP_ID_TRUNCATE_END, "…");
  }
  return raw;
}

/**
 * Compact relative-date helper carried over from the new editor — keeps the shared
 * tooltip independent of the editor-only `TimeAgo` component.
 */
function formatAnnotationDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60_000) return i18next.t("editor:coreJustNow");
    if (diffMs < 3_600_000) return i18next.t("editor:coreMinutesAgo", { count: Math.floor(diffMs / 60_000) });
    if (diffMs < 86_400_000) return i18next.t("editor:coreHoursAgo", { count: Math.floor(diffMs / 3_600_000) });
    if (diffMs < 604_800_000) return i18next.t("editor:coreDaysAgo", { count: Math.floor(diffMs / 86_400_000) });
    return format(d, "MMM d", { locale: i18next.language?.startsWith("zh") ? zhCN : enUS });
  } catch {
    return dateStr;
  }
}

function getCommentIconAndTooltip(annotation: SharedAnnotation) {
  if ((annotation.unresolvedCommentCount ?? 0) > 0) {
    return { Icon: IconCommentUnresolved, tooltip: i18next.t("editor:tooltipUnresolvedComments") };
  }
  if ((annotation.commentCount ?? 0) > 0) {
    return { Icon: IconCommentResolved, tooltip: i18next.t("editor:tooltipAllCommentsResolved") };
  }
  return null;
}

function getReviewBadge(acceptedState: SharedAnnotation["acceptedState"]) {
  if (!acceptedState) return null;
  let Icon: React.ComponentType<{ width?: number; height?: number }> | null = null;
  let badgeMod = "";
  let label = "";
  switch (acceptedState) {
    case "accepted":
      Icon = IconCheckAlt;
      badgeMod = "accepted";
      label = "Accepted";
      break;
    case "rejected":
      Icon = IconCrossAlt;
      badgeMod = "rejected";
      label = "Rejected";
      break;
    case "fixed":
    case "fixed_and_accepted":
      Icon = IconCheckAlt;
      badgeMod = "fixed";
      label = "Fixed";
      break;
    default:
      return null;
  }
  if (!Icon) return null;
  const userPickBadge = cn("userpic-badge");
  const className = `${userPickBadge.toString()} ${userPickBadge.mod({ [badgeMod]: true }).toString()}`;
  return (
    <div className={className} aria-label={`${label} review`} data-testid="annotation-review-badge">
      <Icon />
    </div>
  );
}

interface TooltipProps {
  displayUsername: string;
  isDraft: boolean;
  isDraftSaved: boolean;
  isPrediction: boolean;
  isSkipped: boolean;
  isSubmitted: boolean;
  isGroundTruth: boolean;
  acceptedState: SharedAnnotation["acceptedState"];
  predictionScore: number | null;
  lastUpdated: string | null;
  annotationId: string | null;
  /** Full shell id / pk for copy and tooltip `title`; display may be shortened. */
  annotationIdFull?: string | null;
  containerRef: React.MutableRefObject<HTMLElement | undefined>;
  isOpen: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  position: TooltipPosition | null;
}

function AnnotationButtonTooltip({
  displayUsername,
  isDraft,
  isDraftSaved,
  isPrediction,
  isSkipped,
  isSubmitted,
  isGroundTruth,
  acceptedState,
  predictionScore,
  lastUpdated,
  annotationId,
  annotationIdFull,
  containerRef,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  position,
}: TooltipProps) {
  const statusBadge = useMemo(() => {
    if (isPrediction) return null;
    if (isDraft || isDraftSaved) return { label: i18next.t("editor:statusDraft"), variant: "primary" as const };
    if (acceptedState) {
      switch (acceptedState) {
        case "accepted":
          return { label: i18next.t("editor:statusAccepted"), variant: "positive" as const };
        case "rejected":
          return { label: i18next.t("editor:statusRejected"), variant: "negative" as const };
        case "fixed":
        case "fixed_and_accepted":
          return { label: i18next.t("editor:statusFixed"), variant: "warning" as const };
        default:
          break;
      }
    }
    if (isSubmitted && !isSkipped) return { label: i18next.t("editor:statusSubmitted"), variant: "positive" as const };
    return null;
  }, [isPrediction, isDraft, isDraftSaved, acceptedState, isSubmitted, isSkipped]);

  const formatDate = useCallback((dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return null;
      return format(date, "MMM dd yyyy, HH:mm:ss");
    } catch {
      return null;
    }
  }, []);

  const tooltipData = useMemo(() => {
    const rows: { label: string; value: string; title?: string }[] = [];
    if (annotationId) {
      const fullId = annotationIdFull ?? annotationId;
      rows.push({
        label: isPrediction ? "Prediction ID" : "Annotation ID",
        value: String(annotationId),
        title: fullId !== annotationId ? String(fullId) : undefined,
      });
    }
    if (isPrediction) {
      rows.push({ label: i18next.t("editor:infoType"), value: i18next.t("editor:valuePrediction") });
      if (isDefined(predictionScore)) {
        rows.push({ label: i18next.t("editor:infoPredictionScore"), value: `${(predictionScore * 100).toFixed(2)}%` });
      }
    } else {
      rows.push({ label: i18next.t("editor:infoType"), value: i18next.t("editor:valueAnnotation") });
    }
    if (lastUpdated) {
      const formattedDate = formatDate(lastUpdated);
      if (formattedDate) rows.push({ label: i18next.t("editor:infoLastUpdated"), value: formattedDate });
    }
    return rows;
  }, [annotationId, annotationIdFull, isPrediction, predictionScore, lastUpdated, formatDate]);

  const tooltipBadges = useMemo(() => {
    const badges: Array<{ label: string; variant: "primary" | "positive" | "negative" | "warning" }> = [];
    if (statusBadge) badges.push(statusBadge);
    if (isSkipped) badges.push({ label: i18next.t("editor:statusSkipped"), variant: "negative" });
    if (isGroundTruth) badges.push({ label: i18next.t("editor:statusGroundTruth"), variant: "warning" });
    return badges;
  }, [statusBadge, isSkipped, isGroundTruth]);

  if (!isOpen || !position) return null;
  if (!displayUsername && tooltipData.length === 0 && tooltipBadges.length === 0) return null;

  const tooltipContent = (
    <div
      className={cn("annotation-button")
        .elem("tooltipContainer")
        .mod({ open: isOpen, placementRight: position.placement === "right" })
        .toClassName()}
      ref={containerRef as any}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        ...(position.arrowOffset != null
          ? ({ "--tooltip-arrow-offset": `${position.arrowOffset}px` } as React.CSSProperties)
          : {}),
      }}
    >
      {tooltipBadges.length > 0 && (
        <div className={cn("annotation-button").elem("tooltipBadges").toClassName()}>
          {tooltipBadges.map(({ label, variant }) => (
            <Badge key={label} variant={variant} shape="rounded">
              {label}
            </Badge>
          ))}
        </div>
      )}
      {displayUsername && (
        <div className={cn("annotation-button").elem("tooltipContainerTitle").toClassName()}>{displayUsername}</div>
      )}
      {tooltipData.length > 0 && (
        <div className={cn("annotation-button").elem("tooltipContainerInfo").toClassName()}>
          {tooltipData.map((row, index) => (
            <div
              key={`${row.label}-${row.value}-${index}`}
              className={cn("annotation-button").elem("infoRow").toClassName()}
            >
              <div className={cn("annotation-button").elem("infoRowLabel").toClassName()}>{row.label}</div>
              <div className={cn("annotation-button").elem("infoRowValue").toClassName()} title={row.title}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(tooltipContent, document.body) : null;
}

interface AnnotationContextMenuProps {
  annotation: SharedAnnotation;
  capabilities: AnnotationCapabilities;
  handlers: AnnotationActionHandlers;
}

interface MenuActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  enabled: boolean;
  separator?: boolean;
  danger?: boolean;
  dataTestId: string;
}

/**
 * Internal context-menu component. Uses the same `[class*="option--"]` selector contract
 * as the editor-only ContextMenu via a small `.module.css` so Cypress E2E keeps working.
 */
function AnnotationContextMenu({ annotation, capabilities, handlers }: AnnotationContextMenuProps) {
  const dropdown = useDropdown();
  // Read the toast context directly so a missing `<ToastProvider>` in tests
  // (or in environments where Bun inlines `process.env.NODE_ENV` to "production")
  // does not throw — `useToast()` would, while `useContext(ToastContext)` returns
  // `undefined` and we already guard every call with `?.show(...)`.
  const toast = useContext(ToastContext);
  const isPrediction = annotation.type === "prediction";
  const isDraft = !isDefined(annotation.pk);

  const annotationLink = useMemo(() => {
    if (!annotation.pk) return "";
    // Use parent URL when running inside a sandboxed iframe (window.location.href is about:srcdoc)
    const baseUrl = (window as any).__parentUrl || window.location.href;
    const url = new URL(baseUrl);
    url.searchParams.set("annotation", String(annotation.pk));
    url.searchParams.delete("region");
    return url.toString();
  }, [annotation.pk]);

  const [copyLink] = useCopyText({ defaultText: annotationLink });
  const [copyAnnotationId] = useCopyText({
    defaultText: annotation.pk?.toString() ?? annotation.id?.toString() ?? "",
  });

  const close = useCallback(() => {
    dropdown?.close();
    handlers.onAnnotationChange?.();
  }, [dropdown, handlers]);

  // Default to `true` for backward compatibility: classic editor passes the
  // capability through `hasInterface(...)` and never opts out, so omitting
  // the flag must not regress its behavior. The new editor wrapper sets
  // `false` explicitly when the org disabled `clipboard-write`.
  const canCopyAnnotationId = capabilities.enableCopyAnnotationId !== false;

  const items = useMemo<MenuActionItem[]>(
    () => [
      {
        label: isPrediction ? "Copy Prediction ID" : "Copy Annotation ID",
        icon: <CopyIcon size={20} />,
        onClick: () => {
          copyAnnotationId();
          dropdown?.close();
          toast?.show({
            message: isPrediction ? "Prediction ID copied to clipboard" : "Annotation ID copied to clipboard",
            type: ToastType.info,
          });
        },
        enabled: !isDraft && canCopyAnnotationId,
        dataTestId: "annotation-button-menu-copy-id",
      },
      {
        label: `${annotation.groundTruth ? "Unset" : "Set"} as Ground Truth`,
        icon: annotation.groundTruth ? <StarIcon weight="fill" color="#FFC53D" size={20} /> : <StarIcon size="20" />,
        onClick: () => {
          handlers.onSetGroundTruth(annotation, !annotation.groundTruth);
          close();
        },
        enabled: capabilities.groundTruthEnabled && !isPrediction && !isDraft,
        dataTestId: "annotation-button-menu-set-ground-truth",
      },
      {
        label: isPrediction ? "Duplicate as Annotation" : "Duplicate Annotation",
        icon: <CopyIcon size="20" />,
        onClick: () => {
          handlers.onDuplicate(annotation);
          close();
        },
        enabled: capabilities.enableCreateAnnotation && !isDraft,
        dataTestId: "annotation-button-menu-duplicate",
      },
      {
        label: isPrediction ? "Copy Prediction Link" : "Copy Annotation Link",
        icon: <LinkSimpleHorizontalIcon size="20" />,
        onClick: () => {
          copyLink();
          dropdown?.close();
          toast?.show({
            message: isPrediction ? "Prediction link copied to clipboard" : "Annotation link copied to clipboard",
            type: ToastType.info,
          });
        },
        enabled: !isDraft && capabilities.enableCopyLink,
        dataTestId: "annotation-button-menu-copy-link",
      },
      {
        label: i18next.t("editor:menuOpenPerformanceDashboard"),
        icon: <ChartBarIcon size={20} />,
        onClick: () => {
          handlers.onOpenPerformanceDashboard?.(annotation);
          dropdown?.close();
        },
        enabled: Boolean(capabilities.enablePerformanceDashboard) && !isDraft && !isPrediction,
        dataTestId: "annotation-button-menu-performance-dashboard",
      },
      {
        label: i18next.t("editor:menuCompareAllAnnotations"),
        icon: <IntersectSquareIcon size="20" />,
        onClick: () => {
          handlers.onShowOtherAnnotations();
          close();
        },
        enabled: capabilities.enableCompareAllAnnotations !== false,
        dataTestId: "annotation-button-menu-compare-all",
      },
      {
        label: isPrediction ? i18next.t("editor:menuDeletePrediction") : i18next.t("editor:menuDeleteAnnotation"),
        icon: <TrashIcon size="20" />,
        onClick: () => {
          handlers.onDelete(annotation);
          close();
        },
        enabled: isPrediction ? Boolean(capabilities.enablePredictionDelete) : capabilities.enableAnnotationDelete,
        separator: true,
        danger: true,
        dataTestId: "annotation-button-menu-delete",
      },
    ],
    [
      annotation,
      capabilities,
      handlers,
      isPrediction,
      isDraft,
      canCopyAnnotationId,
      copyAnnotationId,
      copyLink,
      dropdown,
      toast,
      close,
    ],
  );

  return (
    <div className={contextMenuStyles.menu}>
      {items.map((item, index) => {
        if (!item.enabled) return null;
        const className = [contextMenuStyles.option, item.danger ? contextMenuStyles.danger : ""]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={item.dataTestId ?? index}>
            {item.separator && <div className={contextMenuStyles.seperator} />}
            <div className={className} onClick={item.onClick} data-testid={item.dataTestId}>
              {item.icon && <span className={contextMenuStyles.icon}>{item.icon}</span>}
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface AnnotationButtonProps {
  annotation: SharedAnnotation;
  capabilities: AnnotationCapabilities;
  handlers: AnnotationActionHandlers;
  layout?: AnnotationsListLayout;
}

/**
 * Resolve the on-tab display name from the SharedAnnotation. Falls back through
 * `user.firstName/lastName/email/username` → `createdBy` → `Annotation <pk-or-id>`
 * (matches the new editor's "never a blank tab line" behavior).
 */
function resolveDisplayName(annotation: SharedAnnotation): string {
  const user = annotation.user as SharedUser | null;
  if (user) {
    const fromUser = userDisplayName(user as Record<string, string>);
    if (fromUser?.trim()) return fromUser.trim();
  }
  if (annotation.createdBy?.trim()) return annotation.createdBy.trim();
  const fallbackId = annotation.pk != null && String(annotation.pk) !== "" ? annotation.pk : annotation.id;
  return `Annotation ${fallbackId}`;
}

/**
 * Merge an external `forwardRef` target with our internal `useRef`. Wrappers (the
 * classic LSO MST wrapper in particular) need the outer container element for
 * IntersectionObserver-based hooks like `useResolveUser`, but they MUST NOT add
 * their own DOM wrapper — Selenium page objects depend on the
 * `lsf-annotations-carousel__carosel > .lsf-annotation-button` direct-child
 * relationship (see `QuickViewTabManagement.XPATH_TO_LIST_OF_ANNOTATION_TABS_IN_NEW_UI`).
 */
function setForwardedRef<T>(externalRef: ForwardedRef<T>, value: T | null): void {
  if (typeof externalRef === "function") {
    externalRef(value);
  } else if (externalRef) {
    (externalRef as { current: T | null }).current = value;
  }
}

function AnnotationButtonImpl(
  { annotation, capabilities, handlers, layout }: AnnotationButtonProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const isPrediction = annotation.type === "prediction";
  const isDraft = !isPrediction && !isDefined(annotation.pk);
  const isDraftSaved = !isPrediction && (annotation.draftId ?? 0) > 0;
  const isSkipped = !isPrediction && Boolean(annotation.skipped);
  const isSubmitted = !isPrediction && !isDraft && !isDraftSaved;
  const isGroundTruth = Boolean(annotation.groundTruth);

  // The wrapper has already resolved any privacy-aware display name into
  // `annotation.user`/`annotation.createdBy` (e.g. "Me"/"User" when annotations:hide-info
  // is on). The `showUserInfo` capability only gates the info row (date + score), not
  // the name itself.
  const username = resolveDisplayName(annotation);
  const displayUsername = username;

  const isName = isPersonName(displayUsername);
  const displayNameTruncated = isName
    ? displayUsername.length > NAME_TRUNCATE_THRESHOLD
      ? truncatePersonName(displayUsername)
      : displayUsername
    : displayUsername.length > NAME_TRUNCATE_THRESHOLD
      ? truncateMiddle(displayUsername, NAME_TRUNCATE_START, NAME_TRUNCATE_END, "...")
      : displayUsername;

  const commentInfo = getCommentIconAndTooltip(annotation);
  const reviewBadge = getReviewBadge(annotation.acceptedState);

  // Tooltip state
  const buttonRef = useRef<HTMLElement>();
  const tooltipRef = useRef<HTMLElement>();
  const enterTimeoutRef = useRef<number | undefined>();
  const leaveTimeoutRef = useRef<number | undefined>();
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [isContextMenuOpen, setContextMenuOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current !== undefined) clearTimeout(enterTimeoutRef.current);
      if (leaveTimeoutRef.current !== undefined) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const recalcTooltipPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 12;
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth ?? VERTICAL_TOOLTIP_ESTIMATED_SIZE.width;
    const tooltipHeight = tooltipEl?.offsetHeight ?? VERTICAL_TOOLTIP_ESTIMATED_SIZE.height;

    if (layout === "vertical") {
      const { top, left, arrowOffset } = computeVerticalRightTooltipPosition(
        rect,
        { width: tooltipWidth, height: tooltipHeight },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setTooltipPosition({ top, left, placement: "right", arrowOffset });
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showAbove = spaceBelow < tooltipHeight + gap && spaceAbove > spaceBelow;
    const top = showAbove ? rect.top - tooltipHeight - gap : rect.bottom + gap;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding));
    setTooltipPosition({ top, left, placement: showAbove ? "above" : "below" });
  }, [layout]);

  useLayoutEffect(() => {
    if (!isTooltipOpen) return;
    recalcTooltipPosition();
  }, [isTooltipOpen, recalcTooltipPosition]);

  const handleTooltipEnter = useCallback(
    (e: React.MouseEvent) => {
      if (isContextMenuOpen) return;
      const isTrigger = (e.target as HTMLElement)?.closest?.(".annotation-button__trigger");
      if (isTrigger) return;
      if (leaveTimeoutRef.current !== undefined) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = undefined;
      }
      if (enterTimeoutRef.current !== undefined) clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = window.setTimeout(() => {
        recalcTooltipPosition();
        setTooltipOpen(true);
      }, HOVER_INTENT_DELAY);
    },
    [recalcTooltipPosition, isContextMenuOpen],
  );

  const handleTooltipLeave = useCallback(() => {
    if (enterTimeoutRef.current !== undefined) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = undefined;
    }
    if (leaveTimeoutRef.current !== undefined) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = window.setTimeout(() => setTooltipOpen(false), 100);
  }, []);

  const handleTooltipContainerLeave = useCallback(() => {
    if (leaveTimeoutRef.current !== undefined) clearTimeout(leaveTimeoutRef.current);
    setTooltipOpen(false);
  }, []);

  const handleClick = useCallback(() => {
    if (annotation.selected) return;
    handlers.onSelect(annotation);
  }, [annotation, handlers]);

  const handleTriggerEnter = useCallback(() => {
    setTooltipOpen(false);
    if (enterTimeoutRef.current !== undefined) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = undefined;
    }
  }, []);

  const userpicUser = capabilities.showUserInfo ? annotation.user : { email: "User" };

  return (
    <div
      className={cn("annotation-button")
        .mod({
          selected: annotation.selected,
          groundTruth: isGroundTruth,
          draft: isDraft && !isDraftSaved,
          draftSaved: isDraftSaved,
          submitted: isSubmitted,
          skipped: isSkipped,
          triggerOpened: isContextMenuOpen,
          vertical: layout === "vertical",
        })
        .toClassName()}
      data-annotation-id={annotation.pk ?? annotation.id}
      ref={(node: HTMLDivElement | null) => {
        buttonRef.current = node ?? undefined;
        setForwardedRef(forwardedRef, node);
      }}
      onMouseEnter={handleTooltipEnter}
      onMouseLeave={handleTooltipLeave}
    >
      <div className={cn("annotation-button").elem("mainSection").toClassName()} onClick={handleClick}>
        <div className={cn("annotation-button").elem("picSection").toClassName()}>
          <Userpic
            className={cn("annotation-button").elem("userpic").mod({ prediction: isPrediction }).toClassName()}
            // @ts-expect-error - block attribute kept for Selenium compatibility (legacy classic editor contract)
            block="lsf-annotation-button"
            username={isPrediction ? annotation.createdBy : null}
            user={userpicUser as any}
            size={24}
            badge={reviewBadge ? { bottomRight: reviewBadge } : undefined}
          >
            {isPrediction && <IconSparks style={{ width: 18, height: 18 }} />}
          </Userpic>
        </div>
        <div className={cn("annotation-button").elem("main").toClassName()}>
          <div className={cn("annotation-button").elem("user").toClassName()}>
            <span className={cn("annotation-button").elem("name").toClassName()}>{displayNameTruncated}</span>
          </div>
          {capabilities.showUserInfo && (
            <div className={cn("annotation-button").elem("info").toClassName()}>
              <span className={cn("annotation-button").elem("date").toClassName()} title={annotation.createdDate}>
                {formatAnnotationDate(annotation.createdDate)}
              </span>
              {isPrediction && isDefined(annotation.score) && (
                <span title={`Prediction score = ${annotation.score}`}>
                  {" · "}
                  {(annotation.score * 100).toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
        {!isPrediction && (
          <div className={cn("annotation-button").elem("icons").toClassName()}>
            {(isDraftSaved || isDraft) && (
              <Tooltip title="Draft">
                <div className={cn("annotation-button").elem("icon").mod({ draft: true }).toClassName()}>
                  <IconDraftCreated2 color="#617ADA" />
                </div>
              </Tooltip>
            )}
            {isSkipped && (
              <Tooltip title="Skipped">
                <div className={cn("annotation-button").elem("icon").mod({ skipped: true }).toClassName()}>
                  <IconAnnotationSkipped2 color="#DD0000" />
                </div>
              </Tooltip>
            )}
            {isGroundTruth && (
              <Tooltip title="Ground-truth">
                <div className={cn("annotation-button").elem("icon").mod({ groundTruth: true }).toClassName()}>
                  <IconAnnotationGroundTruth />
                </div>
              </Tooltip>
            )}
            {commentInfo && (
              <Tooltip title={commentInfo.tooltip}>
                <div className={cn("annotation-button").elem("icon").mod({ comments: true }).toClassName()}>
                  <commentInfo.Icon />
                </div>
              </Tooltip>
            )}
          </div>
        )}
        <AnnotationButtonTooltip
          displayUsername={displayUsername}
          isDraft={isDraft}
          isDraftSaved={isDraftSaved}
          isPrediction={isPrediction}
          isSkipped={isSkipped}
          isSubmitted={isSubmitted}
          isGroundTruth={isGroundTruth}
          acceptedState={annotation.acceptedState}
          predictionScore={isPrediction ? annotation.score : null}
          lastUpdated={annotation.createdDate}
          annotationId={formatTooltipAnnotationId(annotation.pk ?? annotation.id, {
            draftId: annotation.draftId,
            pk: annotation.pk,
          })}
          annotationIdFull={annotation.pk ?? annotation.id}
          containerRef={tooltipRef}
          isOpen={isTooltipOpen}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipContainerLeave}
          position={tooltipPosition}
        />
      </div>
      <DropdownTrigger
        content={<AnnotationContextMenu annotation={annotation} capabilities={capabilities} handlers={handlers} />}
        onToggle={(isOpen) => {
          setContextMenuOpen(isOpen);
          if (isOpen) {
            setTooltipOpen(false);
            if (enterTimeoutRef.current !== undefined) {
              clearTimeout(enterTimeoutRef.current);
              enterTimeoutRef.current = undefined;
            }
          }
        }}
      >
        <div
          className={cn("annotation-button").elem("trigger").toClassName()}
          data-testid="annotation-button-menu-trigger"
          onMouseEnter={handleTriggerEnter}
          onClick={(e) => e.stopPropagation()}
        >
          <IconEllipsisVertical width={20} height={20} />
        </div>
      </DropdownTrigger>
    </div>
  );
}

export const AnnotationButton = forwardRef<HTMLDivElement, AnnotationButtonProps>(AnnotationButtonImpl);
AnnotationButton.displayName = "AnnotationButton";
