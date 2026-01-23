import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inject, observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import truncate from "truncate-middle";
import clsx from "clsx";
import { format, isValid } from "date-fns";
import { useCopyText } from "@humansignal/core";
import { isDefined, userDisplayName } from "@humansignal/core/lib/utils/helpers";
import { cn } from "../../utils/bem";
import {
  IconAnnotationGroundTruth,
  IconAnnotationSkipped2,
  IconDraftCreated2,
  IconDuplicate,
  IconLink,
  IconTrashRect,
  IconCommentResolved,
  IconCommentUnresolved,
  IconSparks,
  IconStar,
  IconStarOutline,
  IconAnalytics,
  IconViewAll,
  IconClipboardCheck,
  IconCheckAlt,
  IconCrossAlt,
  IconEllipsisVertical,
} from "@humansignal/icons";
import { Tooltip, Userpic, ToastType, useToast, Badge, DropdownTrigger } from "@humansignal/ui";
import { TimeAgo } from "../../common/TimeAgo/TimeAgo";
import { useDropdown } from "@humansignal/ui";
import { isFF } from "../../utils/feature-flags";

// eslint-disable-next-line
// @ts-ignore
import { confirm } from "../../common/Modal/Modal";
import { type ContextMenuAction, ContextMenu, type MenuActionOnClick } from "../ContextMenu";
import "./AnnotationButton.scss";

// Constants for name truncation
const NAME_TRUNCATE_START = 8;
const NAME_TRUNCATE_END = 6;
const NAME_TRUNCATE_THRESHOLD = 15;

// Utility function to detect if text is a person's name
const isPersonName = (text: string): boolean => {
  if (!text || text.includes("@")) return false; // Exclude emails
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return false; // Need at least first + last name
  // Check if all parts are valid name parts (letters, hyphens, no numbers)
  return parts.every((part) => /^[a-zA-Z-]+$/.test(part) && part.length >= 2);
};

// Utility function to truncate person names
const truncatePersonName = (name: string): string => {
  // Only truncate if length exceeds threshold
  if (name.length <= NAME_TRUNCATE_THRESHOLD) return name;

  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return name;
  if (parts.length === 1) return name; // Single word, don't truncate

  const firstName = parts[0]; // Keep full
  const middleParts = parts.slice(1, -1).map((p) => `${p[0]}.`); // Middle names to initials
  const lastName = parts[parts.length - 1];
  const lastNameInitial = `${lastName[0]}.`;

  return [firstName, ...middleParts, lastNameInitial].join(" ");
};

interface AnnotationButtonInterface {
  entity?: any;
  capabilities?: any;
  annotationStore?: any;
  store: any;
  onAnnotationChange?: () => void;
}

const renderCommentIcon = (ent: any) => {
  if (ent.unresolved_comment_count > 0) {
    return IconCommentUnresolved;
  }
  if (ent.comment_count > 0) {
    return IconCommentResolved;
  }

  return null;
};

const renderCommentTooltip = (ent: any) => {
  if (ent.unresolved_comment_count > 0) {
    return "Unresolved Comments";
  }
  if (ent.comment_count > 0) {
    return "All Comments Resolved";
  }

  return "";
};

// Utility function to get review badge based on acceptedState
// Supports the same review statuses as the Annotators component: "accepted", "rejected", "fixed"
// Also supports "fixed_and_accepted" for backward compatibility (maps to "fixed")
const getReviewBadge = (acceptedState: string | null | undefined) => {
  if (!acceptedState) {
    return null;
  }

  let Icon = null;
  let badgeMod = "";

  switch (acceptedState) {
    case "accepted":
      Icon = IconCheckAlt;
      badgeMod = "accepted";
      break;
    case "rejected":
      Icon = IconCrossAlt;
      badgeMod = "rejected";
      break;
    case "fixed":
    case "fixed_and_accepted": // Backward compatibility
      Icon = IconCheckAlt;
      badgeMod = "fixed";
      break;
    default:
      return null;
  }

  // Use the same class structure as Annotators component
  const userPickBadge = cn("userpic-badge");
  const className = clsx(userPickBadge.toString(), userPickBadge.mod({ [badgeMod]: true }).toString());

  return (
    <div className={className}>
      <Icon />
    </div>
  );
};

const injector = inject(({ store }) => {
  return {
    store,
  };
});

const hoverIntentDelay = 300;

// Helper function to create badge style objects with consistent CSS variable pattern
// Note: CSS variables are overridden in SCSS to always use light mode values for tooltip badges
const createBadgeStyle = (label: string, colorName: string) => ({
  label,
  backgroundColor: `var(--color-accent-${colorName}-subtle)`,
  color: `var(--color-accent-${colorName}-bold)`,
});

// Helper function to get just the CSS variable style properties
const getBadgeColors = (colorName: string) => ({
  backgroundColor: `var(--color-accent-${colorName}-subtle)`,
  color: `var(--color-accent-${colorName}-bold)`,
});

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
  containerRef,
  isTooltipOpen,
  onMouseEnter,
  onMouseLeave,
  position,
}: {
  displayUsername: string;
  isDraft: boolean;
  isDraftSaved: boolean;
  isPrediction: boolean;
  isSkipped: boolean;
  isSubmitted: boolean;
  isGroundTruth?: boolean;
  acceptedState: string | null | undefined;
  predictionScore?: number | null;
  lastUpdated?: string | null;
  annotationId?: string | number | null;
  containerRef?: React.MutableRefObject<HTMLElement | undefined>;
  isTooltipOpen?: boolean;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  position?: { top: number; left: number };
}) {
  // Determine status badge (only for annotations, not predictions)
  // Draft/Submitted are separate from Skipped/Ground Truth
  const statusBadge = useMemo(() => {
    if (isPrediction) {
      return null; // Status doesn't apply to predictions
    }

    // Priority order: Draft > Accepted/Rejected/Fixed > Submitted
    // Skipped and Ground Truth are handled separately
    // Check for both ephemeral drafts (isDraft) and saved drafts (isDraftSaved)
    // Exception: If Draft AND Skipped, show both Draft and Skipped
    if (isDraft || isDraftSaved) {
      return createBadgeStyle("Draft", "grape");
    }
    if (acceptedState) {
      switch (acceptedState) {
        case "accepted":
          return createBadgeStyle("Accepted", "kale");
        case "rejected":
          return createBadgeStyle("Rejected", "persimmon");
        case "fixed":
        case "fixed_and_accepted":
          return createBadgeStyle("Fixed", "canteloupe");
        default:
          break;
      }
    }
    // Exception: If Submitted AND Skipped, only show Skipped (don't show Submitted)
    if (isSubmitted && !isSkipped) {
      return createBadgeStyle("Submitted", "kale");
    }

    return null;
  }, [isPrediction, isDraft, isDraftSaved, acceptedState, isSubmitted, isSkipped]);

  // Format date using date-fns, matching Data Manager format: "MMM dd yyyy, HH:mm:ss" (e.g., "Jan 15 2024, 14:30:45")
  const formatDate = useCallback((dateString: string | null | undefined): string | null => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      if (!isValid(date)) return null;

      // Use the same format as Data Manager's DateTimeCell
      return format(date, "MMM dd yyyy, HH:mm:ss");
    } catch {
      return null;
    }
  }, []);

  const tooltipData = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];

    // Add Annotation ID first if available
    if (annotationId) {
      rows.push({ label: "Annotation ID", value: String(annotationId) });
    }

    // Add Type for all annotations/predictions
    if (isPrediction) {
      rows.push({ label: "Type", value: "Prediction" });
      if (isDefined(predictionScore)) {
        rows.push({ label: "Prediction Score", value: `${(predictionScore * 100).toFixed(2)}%` });
      }
    } else {
      rows.push({ label: "Type", value: "Annotation" });
    }

    // Add Last Updated after Type
    if (lastUpdated) {
      const formattedDate = formatDate(lastUpdated);
      if (formattedDate) {
        rows.push({ label: "Last Updated", value: formattedDate });
      }
    }

    return rows;
  }, [annotationId, isPrediction, predictionScore, lastUpdated, formatDate]);

  const isRenderable =
    tooltipData.length > 0 || !!displayUsername || !!statusBadge || !!isSkipped || !!isGroundTruth || !!annotationId;

  if (!isRenderable) {
    return null;
  }

  if (!isTooltipOpen || !position) {
    return null;
  }

  const tooltipContent = (
    <div
      className={cn("annotation-button").elem("tooltipContainer").mod({ open: isTooltipOpen }).toClassName()}
      ref={containerRef as any}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {(statusBadge || isSkipped || isGroundTruth) && (
        <div className={cn("annotation-button").elem("tooltipBadges").toClassName()}>
          {/* Draft/Submitted badges shown first */}
          {statusBadge && (
            <Badge
              className={cn("annotation-button").elem("tooltipStatusBadge").toClassName()}
              style={{
                backgroundColor: statusBadge.backgroundColor,
                color: statusBadge.color,
                border: "none",
              }}
            >
              {statusBadge.label}
            </Badge>
          )}
          {/* Skipped badge shown after Draft/Submitted */}
          {isSkipped && (
            <Badge
              className={cn("annotation-button").elem("tooltipStatusBadge").toClassName()}
              style={{
                ...getBadgeColors("persimmon"),
                border: "none",
              }}
            >
              Skipped
            </Badge>
          )}
          {/* Ground Truth badge shown last */}
          {isGroundTruth && (
            <Badge
              className={cn("annotation-button").elem("tooltipStatusBadge").toClassName()}
              style={{
                ...getBadgeColors("canteloupe"),
                border: "none",
              }}
            >
              Ground Truth
            </Badge>
          )}
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
              <div className={cn("annotation-button").elem("infoRowValue").toClassName()}>{row.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(tooltipContent, document.body) : null;
}

// AnnotationButtonContextMenu component - must be defined outside AnnotationButton
// to maintain stable component reference and prevent hooks order issues
const AnnotationButtonContextMenu = injector(
  observer(
    ({
      entity,
      capabilities,
      store,
      isGroundTruth,
      iconSize,
      onAnnotationChange,
      annotationStore,
    }: AnnotationButtonInterface & {
      isGroundTruth?: boolean;
      iconSize: number;
      onAnnotationChange?: () => void;
      annotationStore: any;
    }) => {
      // Check if entity is alive - must be done before any hooks
      const entityIsAlive = isAlive(entity);

      const annotationLink = useMemo(() => {
        if (!entityIsAlive || !entity.pk) {
          return "";
        }
        const url = new URL(window.location.href);
        if (entity.pk) {
          url.searchParams.set("annotation", entity.pk);
        }
        // In case of targeting directly an annotation, we don't want to show the region in the URL
        // otherwise it will be shown as a region link
        url.searchParams.delete("region");
        return url.toString();
      }, [entityIsAlive, entity.pk]);
      const [copyLink] = useCopyText({ defaultText: annotationLink });
      const toast = useToast();
      const dropdown = useDropdown();
      const clickHandler = () => {
        onAnnotationChange?.();
        dropdown?.close();
      };
      const setGroundTruth = useCallback<MenuActionOnClick>(() => {
        entity.setGroundTruth(!isGroundTruth);
        clickHandler();
      }, [entity, isGroundTruth]);
      const duplicateAnnotation = useCallback<MenuActionOnClick>(() => {
        const c = annotationStore.addAnnotationFromPrediction(entity);

        window.setTimeout(() => {
          annotationStore.selectAnnotation(c.id, { exitViewAll: true });
          clickHandler();
        });
      }, [entity, annotationStore]);
      const linkAnnotation = useCallback<MenuActionOnClick>(() => {
        copyLink();
        dropdown?.close();
        toast?.show({
          message: "Annotation link copied to clipboard",
          type: ToastType.info,
        });
      }, [copyLink, toast, dropdown]);
      const [copyAnnotationId] = useCopyText({ defaultText: entity.pk?.toString() ?? entity.id?.toString() ?? "" });
      const copyAnnotationIdHandler = useCallback<MenuActionOnClick>(() => {
        copyAnnotationId();
        dropdown?.close();
        toast?.show({
          message: "Annotation ID copied to clipboard",
          type: ToastType.info,
        });
      }, [copyAnnotationId, toast, dropdown]);
      const openPerformanceDashboard = useCallback<MenuActionOnClick>(() => {
        // Only available in LSE
        const isLSE = (window as any).APP_SETTINGS?.version?.edition === "Enterprise";
        if (!isLSE) return;

        const url = new URL(window.location.origin);
        const useNewAnalytics = isFF("fflag_feat_all_fit_778_analytics_short");

        // Route to different dashboards based on feature flag
        if (useNewAnalytics) {
          url.pathname = "/analytics/member-performance";
        } else {
          url.pathname = "/performance";
        }

        // Add user, project, and annotation context
        if (entity.user?.id) {
          url.searchParams.set("user", entity.user.id);
        }

        const projectMatch = window.location.pathname.match(/\/projects\/(\d+)/);
        if (projectMatch) {
          url.searchParams.set("project", projectMatch[1]);
        }

        window.open(url.toString(), "_blank");
        dropdown?.close();
      }, [entity, dropdown]);
      const showOtherAnnotations = useCallback<MenuActionOnClick>(() => {
        annotationStore.toggleViewingAllAnnotations();
        clickHandler();
      }, [annotationStore, onAnnotationChange]);
      const deleteAnnotation = useCallback(() => {
        clickHandler();
        confirm({
          title: "Delete annotation?",
          body: (
            <>
              This will <strong>delete all existing regions</strong>. Are you sure you want to delete them?
              <br />
              This action cannot be undone.
            </>
          ),
          buttonLook: "negative",
          okText: "Delete",
          onOk: () => {
            entity.list.deleteAnnotation(entity);
          },
        });
      }, [entity, onAnnotationChange]);
      const isPrediction = entity.type === "prediction";
      const isDraft = !isDefined(entity.pk);
      const showGroundTruth = capabilities.groundTruthEnabled && !isPrediction && !isDraft;
      const showDuplicateAnnotation = capabilities.enableCreateAnnotation && !isDraft;
      const isLSE = (window as any).APP_SETTINGS?.version?.edition === "Enterprise";

      // Check if project ID is available (from store or URL)
      const hasProjectId = !!window.location.pathname.match(/\/projects\/(\d+)/);

      const actions = useMemo<ContextMenuAction[]>(
        () => [
          {
            label: "Copy Annotation ID",
            onClick: copyAnnotationIdHandler,
            icon: <IconClipboardCheck width={20} height={20} />,
            enabled: !isDraft,
          },
          {
            label: `${isGroundTruth ? "Unset " : "Set "} as Ground Truth`,
            onClick: setGroundTruth,
            icon: isGroundTruth ? (
              <IconStar color="#FFC53D" width={iconSize} height={iconSize} />
            ) : (
              <IconStarOutline width={iconSize} height={iconSize} />
            ),
            enabled: showGroundTruth,
          },
          {
            label: "Duplicate Annotation",
            onClick: duplicateAnnotation,
            icon: <IconDuplicate width={20} height={20} />,
            enabled: showDuplicateAnnotation,
          },
          {
            label: "Copy Annotation Link",
            onClick: linkAnnotation,
            icon: <IconLink />,
            enabled: !isDraft && store.hasInterface("annotations:copy-link"),
          },
          {
            label: "Open Performance Dashboard",
            onClick: openPerformanceDashboard,
            icon: <IconAnalytics width={20} height={20} />,
            enabled: isLSE && hasProjectId && !isDraft && !isPrediction,
          },
          {
            label: "Show Other Annotations",
            onClick: showOtherAnnotations,
            icon: <IconViewAll width={20} height={20} />,
            enabled: true,
          },
          {
            label: "Delete Annotation",
            onClick: deleteAnnotation,
            icon: <IconTrashRect />,
            separator: true,
            danger: true,
            enabled: capabilities.enableAnnotationDelete && !isPrediction,
          },
        ],
        [
          entity,
          isGroundTruth,
          isPrediction,
          isDraft,
          isLSE,
          hasProjectId,
          capabilities.enableAnnotationDelete,
          capabilities.enableCreateAnnotation,
          capabilities.groundTruthEnabled,
          copyAnnotationIdHandler,
          openPerformanceDashboard,
          showOtherAnnotations,
          deleteAnnotation,
          setGroundTruth,
          duplicateAnnotation,
          linkAnnotation,
          iconSize,
          store,
        ],
      );

      // Return null if entity is not alive, but only after all hooks have been called
      if (!entityIsAlive) {
        return null;
      }

      return <ContextMenu actions={actions} />;
    },
  ),
);

export const AnnotationButton = observer(
  ({ entity, capabilities, annotationStore, onAnnotationChange }: AnnotationButtonInterface) => {
    // Check if entity is alive - must be done before any hooks to avoid accessing dead entity
    // But we'll return null AFTER all hooks are called to maintain hook order
    const entityIsAlive = isAlive(entity);

    const iconSize = 32;
    // Guard entity property access - use safe defaults if entity is not alive
    const isPrediction = entityIsAlive ? entity.type === "prediction" : false;
    const username = entityIsAlive
      ? userDisplayName(
          entity.user ?? {
            firstName: entity.createdBy || "Admin",
          },
        )
      : "Unknown";
    const [isGroundTruth, setIsGroundTruth] = useState<boolean>();
    const isDraft = entityIsAlive && !isPrediction && !isDefined(entity.pk);
    const isDraftSaved = entityIsAlive && !isPrediction && entity.draftId > 0;
    const isSkipped = entityIsAlive && !isPrediction && entity.skipped === true;
    // isSubmitted should be independent of skipped/ground truth status
    const isSubmitted = entityIsAlive && !isPrediction && !isDraft && !isDraftSaved;
    const infoIsHidden = annotationStore.store?.hasInterface("annotations:hide-info");
    let hiddenUser = null;

    // Tooltip state and refs
    const buttonRef = useRef<HTMLElement>();
    const mainSectionRef = useRef<HTMLElement>();
    const tooltipContainerRef = useRef<HTMLElement>();
    const timeoutRef = useRef<number>();
    const leaveTimeoutRef = useRef<number>();
    const [isTooltipOpen, setTooltipOpen] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | undefined>(undefined);
    const [isContextMenuOpen, setContextMenuOpen] = useState(false);

    if (infoIsHidden && entityIsAlive) {
      // this data can be missing in tests, but we don't have `infoIsHidden` there, so hiding logic like this
      const currentUser = annotationStore.store.user;
      const isCurrentUser = entity.user?.id === currentUser.id || entity.createdBy === currentUser.email;
      hiddenUser = { email: isCurrentUser ? "Me" : "User" };
    }

    const displayUsername = hiddenUser ? hiddenUser.email : username;

    // Apply smart truncation based on content type
    const isName = isPersonName(displayUsername);
    const displayNameTruncated = isName
      ? displayUsername.length > NAME_TRUNCATE_THRESHOLD
        ? truncatePersonName(displayUsername)
        : displayUsername
      : displayUsername.length > NAME_TRUNCATE_THRESHOLD
        ? truncate(displayUsername, NAME_TRUNCATE_START, NAME_TRUNCATE_END, "...")
        : displayUsername;

    const CommentIcon = renderCommentIcon(entity);
    // need to find a more reliable way to grab this value
    // const historyActionType = annotationStore.history.toJSON()?.[0]?.actionType;

    useEffect(() => {
      if (entityIsAlive) {
        setIsGroundTruth(entity.ground_truth);
      }
    }, [entityIsAlive, entity, entity.ground_truth]);

    // Click outside handler for tooltip
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!buttonRef.current?.contains(target) && !tooltipContainerRef.current?.contains(target)) {
          setTooltipOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    // Track mouse position and check if tooltip should remain open
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        (window as any).lastMouseX = e.clientX;
        (window as any).lastMouseY = e.clientY;

        // If tooltip is open, check if mouse is still over button or tooltip
        if (isTooltipOpen) {
          const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
          // Only call contains() if elementAtPoint is actually a Node
          const isOverTooltip = elementAtPoint && tooltipContainerRef.current?.contains(elementAtPoint as Node);
          const isOverButton = elementAtPoint && buttonRef.current?.contains(elementAtPoint as Node);
          const isOverTrigger = (elementAtPoint as HTMLElement)?.closest?.(".annotation-button__trigger");

          // Close tooltip if mouse is not over button or tooltip (or is over trigger)
          if (!isOverTooltip && (!isOverButton || isOverTrigger)) {
            setTooltipOpen(false);
          }
        }
      };
      document.addEventListener("mousemove", handleMouseMove);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
      };
    }, [isTooltipOpen]);

    // Cleanup timeouts on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
        }
      };
    }, []);

    const recalculateTooltipPosition = useCallback(() => {
      if (buttonRef.current) {
        const anchorPosition = buttonRef.current.getBoundingClientRect();

        // Estimate tooltip dimensions (we'll update after render)
        const estimatedTooltipWidth = 250;
        const estimatedTooltipHeight = 100;

        // Check if tooltip would go off the bottom of the screen
        const spaceBelow = window.innerHeight - anchorPosition.bottom;
        const spaceAbove = anchorPosition.top;

        let top: number;
        let left: number;

        // Position below by default, above if not enough space
        if (spaceBelow < estimatedTooltipHeight + 20 && spaceAbove > spaceBelow) {
          // Position above
          top = anchorPosition.top - estimatedTooltipHeight - 12;
        } else {
          // Position below
          top = anchorPosition.bottom + 12;
        }

        // Center horizontally, but adjust if too close to edges
        left = anchorPosition.left + anchorPosition.width / 2 - estimatedTooltipWidth / 2;

        // Adjust if too close to right edge
        if (left + estimatedTooltipWidth > window.innerWidth - 20) {
          left = window.innerWidth - estimatedTooltipWidth - 20;
        }

        // Adjust if too close to left edge
        if (left < 20) {
          left = 20;
        }

        setTooltipPosition({ top, left });

        // Update arrow position after tooltip renders
        requestAnimationFrame(() => {
          if (tooltipContainerRef.current) {
            const containerPosition = tooltipContainerRef.current.getBoundingClientRect();
            const arrowOffset = anchorPosition.left + anchorPosition.width / 2 - containerPosition.left;
            tooltipContainerRef.current.style.setProperty("--tooltip-arrow-position", `${arrowOffset}px`);
          }
        });
      }
    }, []);

    const handleTooltipEnter = useCallback(
      (e: React.MouseEvent) => {
        // Don't show tooltip if context menu is open
        if (isContextMenuOpen) {
          return;
        }

        // Clear any pending leave timeout
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
          leaveTimeoutRef.current = undefined;
        }

        const isTrigger = (e.target as HTMLElement)?.closest?.(".annotation-button__trigger");

        // Don't show tooltip if hovering over trigger
        if (isTrigger) {
          return;
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
          recalculateTooltipPosition();
          setTooltipOpen(true);
        }, hoverIntentDelay);
      },
      [recalculateTooltipPosition, isContextMenuOpen],
    );

    const handleTooltipLeave = useCallback((e: React.MouseEvent | React.FocusEvent) => {
      // Clear any pending enter timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }

      // Clear any existing leave timeout
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }

      const relatedTarget = ((e as React.MouseEvent).relatedTarget ||
        (e as React.FocusEvent).relatedTarget) as HTMLElement | null;

      // Check if we're moving to the tooltip container
      // Only call contains() if relatedTarget is actually a Node
      const isMovingToTooltip = relatedTarget && tooltipContainerRef.current?.contains(relatedTarget as Node);

      // If not moving to tooltip, check if moving back to button (but not trigger)
      // Only call contains() if relatedTarget is actually a Node
      const isMovingToButton = relatedTarget && buttonRef.current?.contains(relatedTarget as Node);
      const isMovingToTrigger = relatedTarget?.closest?.(".annotation-button__trigger");

      // If moving to tooltip or button (but not trigger), keep tooltip open
      if (isMovingToTooltip || (isMovingToButton && !isMovingToTrigger)) {
        return;
      }

      // Use a small delay to allow mouse to move to tooltip, but close if mouse is truly gone
      leaveTimeoutRef.current = window.setTimeout(() => {
        // Check current mouse position
        const currentMouseX = (window as any).lastMouseX;
        const currentMouseY = (window as any).lastMouseY;

        if (currentMouseX !== undefined && currentMouseY !== undefined) {
          const elementAtPoint = document.elementFromPoint(currentMouseX, currentMouseY);
          // Only call contains() if elementAtPoint is actually a Node
          const isOverTooltip = elementAtPoint && tooltipContainerRef.current?.contains(elementAtPoint as Node);
          const isOverButton = elementAtPoint && buttonRef.current?.contains(elementAtPoint as Node);
          const isOverTrigger = (elementAtPoint as HTMLElement)?.closest?.(".annotation-button__trigger");

          // Close tooltip unless mouse is over tooltip or button (but not trigger)
          if (!isOverTooltip && (!isOverButton || isOverTrigger)) {
            setTooltipOpen(false);
          }
        } else {
          // No mouse position available, close tooltip
          setTooltipOpen(false);
        }

        leaveTimeoutRef.current = undefined;
      }, 100); // Small delay to allow mouse movement to tooltip
    }, []);

    const handleTooltipContainerLeave = useCallback(() => {
      // When mouse leaves tooltip container, close immediately
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = undefined;
      }
      setTooltipOpen(false);
    }, []);

    const handleTooltipFocus = useCallback(() => {
      if (isContextMenuOpen) {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        recalculateTooltipPosition();
        setTooltipOpen(true);
      }, hoverIntentDelay);
    }, [recalculateTooltipPosition, isContextMenuOpen]);

    const handleTriggerEnter = useCallback(() => {
      // Close tooltip immediately when hovering over trigger
      setTooltipOpen(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = undefined;
      }
    }, []);

    const clickHandler = useCallback(() => {
      if (!entityIsAlive) return;
      const { selected, id, type } = entity;

      if (!selected) {
        if (type === "prediction") {
          annotationStore.selectPrediction(id, { exitViewAll: true });
        } else {
          annotationStore.selectAnnotation(id, { exitViewAll: true });
        }
      }
    }, [entityIsAlive, entity, annotationStore]);

    // Get review status from task source (LSE-only feature)
    // The backend builds the annotators array by iterating through annotations in order,
    // so we match by finding the annotation's position in the backend's annotation list
    const getReviewStatus = useCallback(() => {
      // Only available in LSE for non-predictions
      const isLSE = (window as any).APP_SETTINGS?.version?.edition === "Enterprise";
      if (!isLSE || !entityIsAlive || isPrediction) {
        return null;
      }

      // Parse task source to get annotators array and backend annotations list
      const task = annotationStore?.store?.task;
      const sourceStr = task?.dataObj?.source;
      if (!sourceStr) return null;

      try {
        const taskSource = typeof sourceStr === "string" ? JSON.parse(sourceStr) : sourceStr;
        const annotators = taskSource?.annotators;
        const backendAnnotations = taskSource?.annotations;

        if (!Array.isArray(annotators) || !Array.isArray(backendAnnotations)) {
          return null;
        }

        // Find the current annotation's index in the backend's annotations array
        // The backend builds annotators array by iterating through this same list
        const annotationIndex = backendAnnotations.findIndex((ann: any) => {
          if (entity.pk && ann.id) {
            return String(ann.id) === String(entity.pk);
          }
          return false;
        });

        if (annotationIndex === -1 || annotationIndex >= annotators.length) {
          return null;
        }

        // Use the same index to get the corresponding annotator's review status
        return annotators[annotationIndex]?.review ?? null;
      } catch {
        return null;
      }
    }, [entityIsAlive, isPrediction, annotationStore, entity.pk]);

    // Return null if entity is not alive, but only after all hooks have been called
    if (!entityIsAlive) {
      return null;
    }

    // After this point, entityIsAlive is guaranteed to be true, so we can safely access entity properties
    const acceptedState = getReviewStatus();
    const reviewBadge = getReviewBadge(acceptedState);

    return (
      <div
        className={cn("annotation-button")
          .mod({
            selected: entity.selected,
            groundTruth: isGroundTruth,
            draft: isDraft && !isDraftSaved, // Ephemeral draft only
            draftSaved: isDraftSaved, // Saved draft
            submitted: isSubmitted,
            skipped: isSkipped,
            triggerOpened: isContextMenuOpen,
          })
          .toClassName()}
        data-annotation-id={entity.pk ?? entity.id}
        ref={buttonRef as any}
        onMouseEnter={handleTooltipEnter}
        onMouseLeave={handleTooltipLeave}
        onFocus={handleTooltipFocus}
        onBlur={handleTooltipLeave}
      >
        <div
          className={cn("annotation-button").elem("mainSection").toClassName()}
          onClick={clickHandler}
          ref={mainSectionRef as any}
        >
          <div className={cn("annotation-button").elem("picSection").toClassName()}>
            <Userpic
              className={cn("annotation-button").elem("userpic").mod({ prediction: isPrediction }).toClassName()}
              // @ts-expect-error - block attribute for Selenium test compatibility
              block="lsf-annotation-button"
              username={isPrediction ? entity.createdBy : null}
              user={hiddenUser ?? entity.user ?? { email: entity.createdBy }}
              size={24}
              badge={
                reviewBadge
                  ? {
                      bottomRight: reviewBadge,
                    }
                  : undefined
              }
            >
              {isPrediction && <IconSparks style={{ width: 18, height: 18 }} />}
            </Userpic>
            {/* TODO: Remove block. Selenium is using this anchor that was mistakenly propagated into this element. */}
            {/* to do: return these icons when we have a better way to grab the history action type */}
            {/* {historyActionType === 'accepted' && <Elem name='status' mod={{ approved: true }}><IconCheckBold /></Elem>}
          {historyActionType && (
            <Elem name='status' mod={{ skipped: true }}>
              <IconCrossBold />
            </Elem>
          )}
          {entity.history.canUndo && (
            <Elem name='status' mod={{ updated: true }}>
              <IconCheckBold />
            </Elem>
          )} */}
          </div>
          <div className={cn("annotation-button").elem("main").toClassName()}>
            <div className={cn("annotation-button").elem("user").toClassName()}>
              <span className={cn("annotation-button").elem("name").toClassName()}>{displayNameTruncated}</span>
            </div>
            {!infoIsHidden && (
              <div className={cn("annotation-button").elem("info").toClassName()}>
                <TimeAgo className={cn("annotation-button").elem("date").toClassName()} date={entity.createdDate} />
                {isPrediction && isDefined(entity.score) && (
                  <span title={`Prediction score = ${entity.score}`}>
                    {" · "} {(entity.score * 100).toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>
          {!isPrediction && (
            <div className={cn("annotation-button").elem("icons").toClassName()}>
              {(entity.draftId > 0 || isDraft) && (
                <Tooltip title="Draft">
                  <div className={cn("annotation-button").elem("icon").mod({ draft: true }).toClassName()}>
                    <IconDraftCreated2 color="#617ADA" />
                  </div>
                </Tooltip>
              )}
              {entity.skipped && (
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
              {CommentIcon && (
                <Tooltip title={renderCommentTooltip(entity)}>
                  <div className={cn("annotation-button").elem("icon").mod({ comments: true }).toClassName()}>
                    <CommentIcon />
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
            acceptedState={acceptedState}
            predictionScore={isPrediction ? entity.score : null}
            lastUpdated={entity.createdDate}
            annotationId={entity.pk ?? entity.id}
            containerRef={tooltipContainerRef}
            isTooltipOpen={isTooltipOpen}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipContainerLeave}
            position={tooltipPosition}
          />
        </div>
        {entityIsAlive && (
          <DropdownTrigger
            content={
              <AnnotationButtonContextMenu
                entity={entity}
                capabilities={capabilities}
                annotationStore={annotationStore}
                store={annotationStore.store}
                isGroundTruth={isGroundTruth}
                iconSize={iconSize}
                onAnnotationChange={onAnnotationChange}
              />
            }
            onToggle={(isOpen) => {
              setContextMenuOpen(isOpen);
              // Close tooltip when context menu opens
              if (isOpen) {
                setTooltipOpen(false);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = undefined;
                }
              }
            }}
          >
            <div
              className={cn("annotation-button").elem("trigger").toClassName()}
              onMouseEnter={handleTriggerEnter}
              onClick={(e) => e.stopPropagation()}
            >
              <IconEllipsisVertical width={20} height={20} />
            </div>
          </DropdownTrigger>
        )}
      </div>
    );
  },
);
