import { CaretDoubleDownIcon, CaretRightIcon } from "@humansignal/icons";
import {
  Children,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
} from "react";
import { cnm } from "../../utils/utils";
import { Button, buttonVariant } from "../button/button";
import { Skeleton } from "../skeleton/skeleton";
import { Typography } from "../typography/typography";
import styles from "./timeline.module.css";

/** Phosphor icons inside the 32px marker circle, regular weight (the library's convention above 18px). */
const MARKER_ICON_SIZE = 20;

export type TimelineTone = "neutral" | "primary" | "positive" | "warning" | "negative";

/** "strong" is the emphasised treatment, "subtle" the muted one (e.g. for older entries). */
export type TimelineEmphasis = "strong" | "subtle";

export interface TimelineMarkerColor {
  /** CSS colour value (e.g. a `var(--color-...)` reference) for the marker's circular background. */
  background: string;
  /** CSS colour value for the marker's icon. */
  icon: string;
}

const TONE_CLASS: Record<TimelineTone, string> = {
  neutral: styles.toneNeutral,
  primary: styles.tonePrimary,
  positive: styles.tonePositive,
  warning: styles.toneWarning,
  negative: styles.toneNegative,
};

/** Injected by `Timeline` on every direct child so the connector knows where to stop. */
interface TimelineEntryProps {
  isLast?: boolean;
  /** Injected from `Timeline`'s `connector`. */
  connector?: boolean;
}

export interface TimelineProps extends Omit<ComponentPropsWithoutRef<"ol">, "children"> {
  /** `Timeline.Item` and `Timeline.LoadMore` entries, in order. `Timeline` injects `isLast` on each. */
  children: ReactNode;
  /**
   * Draws the connector line between markers. Turn it off for a list that is not chronological, such as a
   * set of named entries: the markers and the spacing between entries stay the same. @default true
   */
  connector?: boolean;
}

/**
 * `Timeline`: the ordered list and the connector line between entries. Presentational only — no domain
 * logic; `Timeline.Item`, `Timeline.Row` and `Timeline.LoadMore` compose inside it.
 */
function TimelineRoot({
  children,
  className,
  connector = true,
  "data-testid": dataTestId = "timeline",
  ...rest
}: TimelineProps) {
  const entries = Children.toArray(children).filter(isValidElement) as ReactElement<TimelineEntryProps>[];
  const lastIndex = entries.length - 1;

  return (
    <ol className={cnm(styles.root, className)} data-testid={dataTestId} {...rest}>
      {entries.map((entry, index) => cloneElement(entry, { isLast: index === lastIndex, connector }))}
    </ol>
  );
}

export interface TimelineItemProps extends TimelineEntryProps {
  /** Marker content for a static entry: an icon element or an `Avatar`. Ignored when `expandable` — the marker is then the chevron toggle. */
  icon?: ReactNode;
  /** Semantic colour for the marker when `markerColor` is not supplied; kept when selected. @default "neutral" */
  tone?: TimelineTone;
  /** Caller-supplied marker colours, overriding `tone` — for consumers that keep their own colour mapping. */
  markerColor?: TimelineMarkerColor;
  /** Strong (bold, full contrast) or subtle (muted) treatment of the marker and the title. @default "strong" */
  emphasis?: TimelineEmphasis;
  /** Truncate a long title with an ellipsis on one line; when `false` it wraps within the column. @default true */
  truncateTitle?: boolean;
  title: ReactNode;
  /** Badge rendered next to the title, e.g. a short status label. */
  titleBadge?: ReactNode;
  /** Secondary line under the title, e.g. a short reason or summary. */
  description?: ReactNode;
  /** Meta row: avatar + name or plain text, a dot separator, a timestamp — composed by the caller. */
  meta?: ReactNode;
  /** Trailing actions (e.g. a kebab menu). Hidden until hover or keyboard focus-within; always shown on touch. */
  actions?: ReactNode;
  /** Forces the actions slot to stay visible, e.g. while its own overflow menu is open. */
  actionsForceVisible?: boolean;
  /**
   * Selects the entry: its card is painted, the title takes the heavier label, and `aria-current` is set. A
   * neutral marker also turns primary; a marker with an explicit `tone` (positive, warning, negative) keeps it.
   */
  selected?: boolean;
  /** Activates the item's header (the title/description/meta block). Omit for non-selectable entries. */
  onSelect?: () => void;
  /** Makes the circular marker the expand toggle (chevron right/down) with `aria-expanded`/`aria-controls`. Omit for static entries. */
  expandable?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Accessible name of the marker toggle, e.g. "Details for March 4". Kept constant across expanded/collapsed so it never contradicts `aria-expanded`. @default "Toggle" */
  expandLabel?: string;
  /** Rendered under the header when `expanded`, typically `Timeline.Row` entries. The connector runs through it. */
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  /** Base id for the expanded region; auto-generated when omitted. */
  id?: string;
}

/**
 * One timeline entry: a marker, a title with an optional badge, an optional description, a meta row, an
 * optional trailing actions slot and optional expandable children.
 *
 * Expandable selection pattern: selecting an expandable item's header should expand it *and* select its
 * first child, while selecting a child directly should leave the parent expanded. `Timeline.Item` only owns
 * `expanded`/`onExpandedChange` and the header's own `onSelect` — compose the pattern at the call site:
 *
 * ```tsx
 * <Timeline.Item
 *   expandable
 *   expanded={expanded}
 *   onExpandedChange={setExpanded}
 *   onSelect={() => {
 *     setExpanded(true);
 *     onSelectChild(children[0].id); // select the topmost child
 *   }}
 * >
 *   {children.map((child) => (
 *     <Timeline.Row key={child.id} selected={child.id === selectedId} onSelect={() => onSelectChild(child.id)}>
 *       {child.label}
 *     </Timeline.Row>
 *   ))}
 * </Timeline.Item>
 * ```
 */
function TimelineItem({
  icon,
  tone = "neutral",
  markerColor,
  emphasis = "strong",
  truncateTitle = true,
  title,
  titleBadge,
  description,
  meta,
  actions,
  actionsForceVisible = false,
  selected = false,
  onSelect,
  expandable = false,
  expanded = false,
  onExpandedChange,
  expandLabel,
  children,
  isLast = false,
  connector = true,
  className,
  "data-testid": dataTestId,
  id,
}: TimelineItemProps) {
  const generatedId = useId();
  const contentId = id ?? generatedId;
  const isStrong = emphasis === "strong";
  /** A selected neutral entry is tinted primary without the caller computing a tone; an explicit tone is kept. */
  const markerTone: TimelineTone = selected && tone === "neutral" ? "primary" : tone;
  // Selectable entries: regular body text, medium-weight label when selected. Static entries
  // (e.g. a history of events) always use the label.
  const titleVariant = onSelect ? (selected ? "label" : "body") : "label";

  const markerStyle = markerColor ? { backgroundColor: markerColor.background, color: markerColor.icon } : undefined;
  /** A title-only entry is centred against the 32px marker; entries with a second row stay top-aligned. */
  const hasSecondRow = Boolean(description) || Boolean(meta);

  const headerContent = (
    <span className={cnm(styles.headerBody, !hasSecondRow && styles.headerBodySingle)}>
      <span className={cnm(styles.titleRow, !truncateTitle && styles.titleRowWrap)}>
        <Typography
          as="span"
          variant={titleVariant}
          size="small"
          className={cnm(
            styles.title,
            !truncateTitle && styles.titleWrap,
            isStrong ? styles.titleStrong : styles.titleSubtle,
          )}
        >
          {title}
        </Typography>
        {titleBadge}
      </span>
      {description ? (
        <Typography variant="body" size="smaller" className={styles.description}>
          {description}
        </Typography>
      ) : null}
      {meta ? (
        <Typography as="span" variant="body" size="smaller" className={styles.meta}>
          {meta}
        </Typography>
      ) : null}
    </span>
  );

  const header = onSelect ? (
    <Button
      type="button"
      look="ghost"
      variant="neutral"
      align="left"
      aria-current={selected ? "true" : undefined}
      className={styles.headerButton}
      onClick={onSelect}
      data-testid={dataTestId}
    >
      {headerContent}
    </Button>
  ) : (
    <div className={styles.header} data-testid={dataTestId}>
      {headerContent}
    </div>
  );

  return (
    <li
      className={cnm(styles.item, !isLast && styles.itemSpaced, className)}
      data-testid={dataTestId ? `${dataTestId}-row` : undefined}
    >
      {/* The entry box is the card: it owns the padding around the marker and the header, and paints the hover and
          selected background and border itself, so nothing reaches past it. The marker slot shares a grid row
          with the header, so the marker is centred on the header block and so in the box. The connector segments
          are measured against the box (never the whole item, which grows with expanded content), and they end
          at the marker's edges and the box's outer edges. */}
      <div
        className={cnm(styles.entry, onSelect && styles.entryInteractive, onSelect && selected && styles.entrySelected)}
      >
        {connector ? <span className={cnm(styles.connector, styles.connectorAbove)} aria-hidden="true" /> : null}
        {connector && !isLast ? (
          <span className={cnm(styles.connector, styles.connectorBelow)} aria-hidden="true" />
        ) : null}
        <span className={styles.markerSlot}>
          {expandable ? (
            <button
              type="button"
              className={cnm(
                styles.marker,
                styles.markerButton,
                !markerColor && TONE_CLASS[markerTone],
                !isStrong && !markerColor && styles.markerSubtle,
              )}
              style={markerStyle}
              aria-label={expandLabel ?? "Toggle"}
              aria-expanded={expanded}
              aria-controls={expanded ? contentId : undefined}
              onClick={() => onExpandedChange?.(!expanded)}
              data-testid={dataTestId ? `${dataTestId}-expand` : undefined}
            >
              <CaretRightIcon
                size={MARKER_ICON_SIZE}
                className={cnm(styles.caret, expanded && styles.caretOpen)}
                data-state={expanded ? "open" : "closed"}
              />
            </button>
          ) : (
            <span
              className={cnm(
                styles.marker,
                !markerColor && TONE_CLASS[markerTone],
                !isStrong && !markerColor && styles.markerSubtle,
              )}
              style={markerStyle}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
        </span>

        <div className={cnm(styles.row, !hasSecondRow && styles.rowSingle, actions && styles.rowHasActions)}>
          <div className={styles.headerWrap}>{header}</div>
          {actions ? (
            <span
              className={cnm(styles.actions, actionsForceVisible && styles.actionsForced)}
              data-testid={dataTestId ? `${dataTestId}-actions` : undefined}
            >
              {actions}
            </span>
          ) : null}
        </div>
      </div>
      {expandable && expanded ? (
        <div className={styles.body}>
          {/* Alongside expanded content, so the line runs on to the next entry. */}
          {connector && !isLast ? <span className={styles.connectorRail} aria-hidden="true" /> : null}
          <div id={contentId} className={styles.children}>
            {children}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export interface TimelineRowProps extends Omit<ComponentPropsWithoutRef<"button">, "onSelect" | "type"> {
  selected?: boolean;
  onSelect?: () => void;
  /** Actions pinned to the row's right edge (e.g. an overflow menu): slid in on hover or keyboard focus-within. */
  actions?: ReactNode;
  /** Keeps the actions visible, e.g. while the menu they open is showing. */
  actionsForceVisible?: boolean;
  children: ReactNode;
}

/**
 * A row inside an expanded `Timeline.Item`, e.g. one sub-entry of a group. With `onSelect` (or `onClick`) it is a
 * button with the hover treatment; without either it is plain content in the same card, which has nothing to
 * suggest it can be clicked.
 */
function TimelineRow({
  selected = false,
  onSelect,
  actions,
  actionsForceVisible = false,
  children,
  className,
  "data-testid": dataTestId,
  ...rest
}: TimelineRowProps) {
  const label = (
    <Typography as="span" variant={selected ? "label" : "body"} size="small" className={styles.rowLabel}>
      {children}
    </Typography>
  );
  const interactive = Boolean(onSelect || rest.onClick);

  return (
    <div className={cnm(styles.rowWrap, actions && styles.rowWrapHasActions)}>
      {interactive ? (
        <Button
          type="button"
          look="ghost"
          variant="neutral"
          size="small"
          align="left"
          aria-current={selected ? "true" : undefined}
          className={cnm(styles.rowButton, className)}
          onClick={onSelect}
          data-testid={dataTestId}
          {...rest}
        >
          {label}
        </Button>
      ) : (
        <div
          className={buttonVariant(
            { look: "ghost", variant: "neutral", size: "small", align: "left" },
            cnm(styles.rowButton, styles.rowStatic, className),
          )}
          aria-current={selected ? "true" : undefined}
          data-testid={dataTestId}
          {...(rest as ComponentPropsWithoutRef<"div">)}
        >
          {/* The content wrapper `Button` renders, so the row is laid out exactly like a button's. */}
          <span className="inline-flex flex-1 items-center whitespace-pre px-tight">{label}</span>
        </div>
      )}
      {actions ? (
        <span
          className={cnm(styles.actions, actionsForceVisible && styles.actionsForced)}
          data-testid={dataTestId ? `${dataTestId}-actions` : undefined}
        >
          {actions}
        </span>
      ) : null}
    </div>
  );
}

export interface TimelineLoadMoreProps extends TimelineEntryProps {
  /** Hides the entry entirely once there is nothing left to load (the "exhausted" state). */
  hasMore: boolean;
  isLoadingMore?: boolean;
  onLoadMore: () => void;
  /** Optional caption under the action, e.g. "Showing 12 of 40". */
  caption?: ReactNode;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

/** Terminal load-more entry for paginated data: a dashed double-caret marker, an action and an optional caption. */
function TimelineLoadMore({
  hasMore,
  isLoadingMore = false,
  onLoadMore,
  caption,
  label = "Load more",
  className,
  "data-testid": dataTestId = "timeline-load-more",
  connector = true,
}: TimelineLoadMoreProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <li className={cnm(styles.loadMoreItem, className)} data-testid={dataTestId}>
      {/* The same box as an item's: it owns the padding around the action and paints the hover background. */}
      <div className={styles.loadMoreBox}>
        {connector ? <span className={cnm(styles.connector, styles.connectorAbove)} aria-hidden="true" /> : null}
        {/* One control for the whole entry: marker, label and caption share a single focus ring and hover state. */}
        <button
          type="button"
          className={styles.loadMore}
          onClick={onLoadMore}
          disabled={isLoadingMore}
          aria-busy={isLoadingMore}
          data-testid={`${dataTestId}-action`}
        >
          <span className={cnm(styles.marker, styles.markerDashed)} aria-hidden="true">
            <CaretDoubleDownIcon size={MARKER_ICON_SIZE} className={isLoadingMore ? styles.loadMoreBusy : undefined} />
          </span>
          <span className={styles.loadMoreText}>
            <Typography as="span" variant="label" size="small" className={styles.loadMoreLabel}>
              {label}
            </Typography>
            {caption ? (
              <Typography as="span" variant="body" size="smaller" className={styles.loadMoreCaption}>
                {caption}
              </Typography>
            ) : null}
          </span>
        </button>
      </div>
    </li>
  );
}

export interface TimelineSkeletonProps extends TimelineEntryProps {
  /** A second, shorter line under the title, like an entry with a description or meta row. @default true */
  withMeta?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * A placeholder entry for a loading list: a circular marker, a title line and an optional shorter meta line,
 * laid out and spaced exactly like `Timeline.Item`, so the connector and the gaps do not jump when the real
 * entries arrive. Decorative: hide the list from assistive technology with `aria-busy` on the `Timeline`.
 */
function TimelineSkeleton({
  withMeta = true,
  isLast,
  connector,
  className,
  "data-testid": dataTestId = "timeline-skeleton",
}: TimelineSkeletonProps) {
  return (
    <TimelineItem
      isLast={isLast}
      connector={connector}
      className={className}
      icon={<Skeleton className={cnm(styles.skeletonMarker, "!rounded-full")} />}
      markerColor={{ background: "transparent", icon: "inherit" }}
      title={<Skeleton className={styles.skeletonTitle} />}
      meta={withMeta ? <Skeleton className={styles.skeletonMeta} /> : undefined}
      data-testid={dataTestId}
    />
  );
}

TimelineRoot.displayName = "Timeline";

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
  Row: TimelineRow,
  LoadMore: TimelineLoadMore,
  Skeleton: TimelineSkeleton,
});
