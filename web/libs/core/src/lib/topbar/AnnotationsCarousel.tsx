/**
 * Shared, presentational AnnotationsCarousel.
 *
 * Pure props in / pure callbacks out. No MST, no Jotai. Visuals follow the classic
 * editor (BEM `.prefix.css`, `lsf-annotations-carousel*` selectors after PostCSS).
 *
 * Vertical layout: both branches pin the add-new row in `__container` and put
 * annotation rows in an inner scroll region (`__virtualizedList` + react-window
 * above 50 items, or `__listScroll` with native overflow below that). Horizontal
 * layout keeps the classic transform carousel and the virtualized react-window
 * strip. The wrapper decides whether to enable virtualization at all (classic
 * gates on FF_FIT_720_LAZY_LOAD_ANNOTATIONS; shell passes `virtualizationEnabled={true}`).
 *
 * Sort order: rendered in the order the wrapper supplies. Wrappers MUST place
 * predictions before annotations; sort within type matches the API's order. This is
 * the policy locked by FIT-1774 (B2): no internal date-sort.
 *
 * Behaviors preserved from classic:
 * - snap-to-start on entity-count decrease (delete) (B4)
 * - suppress scroll-to-selected when on the Task Summary tab (B5, controlled by the
 *   `suppressScrollToSelected` prop the wrapper computes)
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FixedSizeList as List, type ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { Button } from "@humansignal/ui";
import { IconChevronLeft, IconChevronRight, PlusIcon } from "@humansignal/icons";
import { cnb as cn } from "../utils/bem";
import { AnnotationButton } from "./AnnotationButton";
import type {
  AnnotationActionHandlers,
  AnnotationCapabilities,
  AnnotationsListLayout,
  SharedAnnotation,
} from "./types";
import "./AnnotationsCarousel.prefix.css";

/**
 * Optional per-row render override. Receives the SharedAnnotation entity and must
 * return a React node — typically a per-row wrapper (e.g. classic editor's MST
 * `AnnotationButton`) so per-row state (lazy hydration, user resolution) keeps
 * working. When omitted, the carousel renders the shared `AnnotationButton`.
 */
export type AnnotationRenderItem = (entity: SharedAnnotation) => ReactNode;

const ITEM_WIDTH = 200;
const ITEM_HEIGHT = 42;
const ITEM_GAP = 4;
const VIRTUALIZATION_THRESHOLD = 50;

const verticalItemSizeStyle = {
  "--annotation-item-height": `${ITEM_HEIGHT}px`,
  "--annotation-item-gap": `${ITEM_GAP}px`,
} as React.CSSProperties;

export interface SharedAnnotationsCarouselProps {
  entities: SharedAnnotation[];
  selectedId: string | null;
  capabilities: AnnotationCapabilities;
  handlers: AnnotationActionHandlers;
  /**
   * When true, render the virtualized branch above the threshold. Wrappers should
   * compute this from FF + entity count (classic) or pass `true` unconditionally
   * (shell). Default false to keep existing classic behavior when omitted.
   */
  virtualizationEnabled?: boolean;
  /**
   * When true, do not auto-scroll to the selected annotation. Used by the classic
   * Task Summary tab to keep the strip pinned at the start.
   */
  suppressScrollToSelected?: boolean;
  /**
   * Optional per-row override. Defaults to the shared `AnnotationButton`. Classic
   * editor wrapper supplies its own MST observer wrapper here so per-row data
   * hydration and user resolution still run.
   */
  renderItem?: AnnotationRenderItem;
  /** Layout orientation. Default 'horizontal' preserves existing carousel behavior. */
  layout?: AnnotationsListLayout;
  /** When true (vertical layout only), render an add-new row as the first list item. */
  showAddNew?: boolean;
  onAddNew?: () => void;
  /** Rendered inside the scroll container after the entity rows (vertical layout only). */
  emptyState?: ReactNode;
}

interface ItemData {
  entities: SharedAnnotation[];
  capabilities: AnnotationCapabilities;
  handlers: AnnotationActionHandlers;
  renderItem: AnnotationRenderItem;
  layout: AnnotationsListLayout;
}

function VirtualizedAnnotationRow({ index, style, data }: ListChildComponentProps<ItemData>) {
  const entity = data.entities[index];
  const isVertical = data.layout === "vertical";
  const padding = isVertical ? { paddingBottom: ITEM_GAP } : { paddingRight: ITEM_GAP };
  return <div style={{ ...(style as React.CSSProperties), ...padding }}>{data.renderItem(entity)}</div>;
}

function AddAnnotationRow({ onAddNew }: { onAddNew: () => void }) {
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      onAddNew();
    },
    [onAddNew],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onAddNew();
      }
    },
    [onAddNew],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Create a new annotation"
      title="Create a new annotation"
      data-testid="annotations-sidebar-add-new"
      className={cn("annotations-carousel").elem("addNewRow").toClassName()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={cn("annotations-carousel").elem("addNewRowIcon").toClassName()}>
        <PlusIcon size={16} aria-hidden="true" />
      </div>
      <span className={cn("annotations-carousel").elem("addNewRowLabel").toClassName()}>New Annotation</span>
    </div>
  );
}

export function AnnotationsCarousel({
  entities,
  selectedId,
  capabilities,
  handlers,
  virtualizationEnabled = false,
  suppressScrollToSelected = false,
  renderItem,
  layout = "horizontal",
  showAddNew,
  onAddNew,
  emptyState,
}: SharedAnnotationsCarouselProps) {
  const isVertical = layout === "vertical";
  const renderRow = useMemo<AnnotationRenderItem>(
    () =>
      renderItem ??
      ((entity: SharedAnnotation) => (
        <AnnotationButton
          key={entity.id}
          annotation={entity}
          capabilities={capabilities}
          handlers={handlers}
          layout={layout}
        />
      )),
    [renderItem, capabilities, handlers, layout],
  );

  const listRef = useRef<List>(null);
  const carouselRef = useRef<HTMLElement>();
  const containerRef = useRef<HTMLElement>();
  const prevEntityCountRef = useRef<number | null>(null);

  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isLeftDisabledOriginal, setIsLeftDisabledOriginal] = useState(false);
  const [isRightDisabledOriginal, setIsRightDisabledOriginal] = useState(false);

  // Filter by enabled-types capabilities (preserves the classic order — no internal sort)
  const filteredEntities = useMemo(
    () =>
      entities.filter((e) =>
        e.type === "prediction" ? capabilities.enablePredictions : capabilities.enableAnnotations,
      ),
    [entities, capabilities.enableAnnotations, capabilities.enablePredictions],
  );

  const totalWidth = filteredEntities.length * (ITEM_WIDTH + ITEM_GAP);
  const shouldVirtualize = virtualizationEnabled && filteredEntities.length > VIRTUALIZATION_THRESHOLD;

  const isLeftDisabled = scrollOffset <= 0;
  const isRightDisabled = scrollOffset >= totalWidth - containerWidth;
  const showControls = totalWidth > containerWidth;

  const handleScroll = useCallback(({ scrollOffset: newOffset }: { scrollOffset: number }) => {
    setScrollOffset(newOffset);
  }, []);

  const scrollLeft = useCallback(() => {
    if (listRef.current) {
      const newOffset = Math.max(0, scrollOffset - containerWidth);
      listRef.current.scrollTo(newOffset);
    }
  }, [scrollOffset, containerWidth]);

  const scrollRight = useCallback(() => {
    if (listRef.current) {
      const maxOffset = totalWidth - containerWidth;
      const newOffset = Math.min(maxOffset, scrollOffset + containerWidth);
      listRef.current.scrollTo(newOffset);
    }
  }, [scrollOffset, containerWidth, totalWidth]);

  const updatePosition = useCallback(
    (_e: React.MouseEvent, goLeft = true) => {
      if (containerRef.current && carouselRef.current) {
        const step = containerRef.current.clientWidth;
        const carouselWidth = carouselRef.current.clientWidth;
        const newPos = Math.max(
          0,
          Math.min(goLeft ? currentPosition - step : currentPosition + step, carouselWidth - step),
        );
        setCurrentPosition(newPos);
      }
    },
    [currentPosition],
  );

  // Disable button states for non-virtualized branch
  useEffect(() => {
    if (!shouldVirtualize) {
      setIsLeftDisabledOriginal(currentPosition <= 0);
      setIsRightDisabledOriginal(
        currentPosition >= (carouselRef.current?.clientWidth ?? 0) - (containerRef.current?.clientWidth ?? 0),
      );
    }
  }, [filteredEntities.length, currentPosition, shouldVirtualize]);

  // Snap-to-start on delete + center on selection (matches classic behavior)
  useEffect(() => {
    const prev = prevEntityCountRef.current;
    const countDecreased = prev !== null && filteredEntities.length < prev;
    prevEntityCountRef.current = filteredEntities.length;

    if (suppressScrollToSelected) return;

    if (countDecreased) {
      setCurrentPosition(0);
      setScrollOffset(0);
      if (shouldVirtualize && listRef.current) listRef.current.scrollTo(0);
      return;
    }

    if (shouldVirtualize && listRef.current && selectedId) {
      const selectedIndex = filteredEntities.findIndex((e) => e.id === selectedId);
      if (selectedIndex >= 0) listRef.current.scrollToItem(selectedIndex, "center");
      return;
    }

    if (!carouselRef.current || !containerRef.current || !selectedId) return;

    const selectedAnnotation = filteredEntities.find((e) => e.id === selectedId);
    if (!selectedAnnotation) return;
    const dataId = selectedAnnotation.pk ?? selectedAnnotation.id;
    const selectedEl = carouselRef.current.querySelector(`[data-annotation-id="${dataId}"]`);
    if (!selectedEl) return;

    const containerW = containerRef.current.clientWidth;
    const elLeft = (selectedEl as HTMLElement).offsetLeft;
    const elWidth = (selectedEl as HTMLElement).offsetWidth;
    const carouselWidth = carouselRef.current.clientWidth;
    const targetPosition = elLeft - (containerW - elWidth) / 2;
    const maxPosition = Math.max(0, carouselWidth - containerW);
    const newPosition = Math.max(0, Math.min(targetPosition, maxPosition));
    setCurrentPosition(newPosition);
  }, [selectedId, filteredEntities, shouldVirtualize, suppressScrollToSelected, containerWidth]);

  // Suppress-scroll branch: keep strip pinned to the left
  useEffect(() => {
    if (!suppressScrollToSelected) return;
    setCurrentPosition(0);
    setScrollOffset(0);
    if (shouldVirtualize && listRef.current) listRef.current.scrollTo(0);
  }, [suppressScrollToSelected, shouldVirtualize, containerWidth]);

  const itemData = useMemo<ItemData>(
    () => ({ entities: filteredEntities, capabilities, handlers, renderItem: renderRow, layout }),
    [filteredEntities, capabilities, handlers, renderRow, layout],
  );

  if (!(capabilities.enableAnnotations || capabilities.enablePredictions || capabilities.enableCreateAnnotation)) {
    return null;
  }

  const addNewRow = showAddNew && onAddNew ? <AddAnnotationRow key="add-new" onAddNew={onAddNew} /> : null;
  const scrollClassName = cn("annotations-carousel").elem("scroll").toClassName();
  const containerClassName = cn("annotations-carousel").elem("container").toClassName();
  const listScrollClassName = cn("annotations-carousel").elem("listScroll").mix(scrollClassName).toClassName();

  // --- Vertical layout branch ---
  if (isVertical) {
    if (shouldVirtualize) {
      return (
        <div
          className={cn("annotations-carousel").mod({ vertical: true, virtualized: true }).toClassName()}
          style={verticalItemSizeStyle}
        >
          <div className={containerClassName}>
            {addNewRow}
            <div className={cn("annotations-carousel").elem("virtualizedList").toClassName()}>
              <AutoSizer>
                {({ width, height }) => (
                  // @ts-expect-error - react-window types incompatible with React 18
                  <List
                    ref={listRef}
                    className={scrollClassName}
                    layout="vertical"
                    height={height}
                    width={width}
                    itemCount={filteredEntities.length}
                    itemSize={ITEM_HEIGHT + ITEM_GAP}
                    itemData={itemData}
                    overscanCount={5}
                  >
                    {VirtualizedAnnotationRow}
                  </List>
                )}
              </AutoSizer>
            </div>
          </div>
          {emptyState}
        </div>
      );
    }

    return (
      <div className={cn("annotations-carousel").mod({ vertical: true }).toClassName()} style={verticalItemSizeStyle}>
        <div className={containerClassName}>
          {addNewRow}
          <div className={listScrollClassName}>
            {filteredEntities.map((entity) => renderRow(entity))}
            {emptyState}
          </div>
        </div>
      </div>
    );
  }

  // --- Horizontal layout branches (existing) ---
  if (shouldVirtualize) {
    return (
      <div
        className={cn("annotations-carousel")
          .mod({ scrolled: scrollOffset > 0, virtualized: true })
          .toClassName()}
      >
        <div className={containerClassName}>
          <AutoSizer>
            {({ width, height }) => {
              if (width !== containerWidth) {
                setContainerWidth(width - 77);
              }
              return (
                // @ts-expect-error - react-window types incompatible with React 18
                <List
                  ref={listRef}
                  className={scrollClassName}
                  layout="horizontal"
                  height={height}
                  width={width - 77}
                  itemCount={filteredEntities.length}
                  itemSize={ITEM_WIDTH + ITEM_GAP}
                  itemData={itemData}
                  onScroll={handleScroll}
                  overscanCount={5}
                  style={{ paddingLeft: ITEM_GAP }}
                >
                  {VirtualizedAnnotationRow}
                </List>
              );
            }}
          </AutoSizer>
        </div>
        {showControls && (
          <div className={cn("annotations-carousel").elem("carousel-controls").toClassName()}>
            <Button
              disabled={isLeftDisabled}
              aria-label="Carousel left"
              size="small"
              variant="neutral"
              onClick={scrollLeft}
            >
              <IconChevronLeft />
            </Button>
            <Button
              disabled={isRightDisabled}
              aria-label="Carousel right"
              size="small"
              variant="neutral"
              onClick={scrollRight}
            >
              <IconChevronRight />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("annotations-carousel")
        .mod({ scrolled: currentPosition > 0 })
        .toClassName()}
      style={{ "--carousel-left": `${currentPosition}px` } as any}
    >
      <div ref={containerRef as any} className={cn("annotations-carousel").elem("container").toClassName()}>
        <div ref={carouselRef as any} className={cn("annotations-carousel").elem("carosel").toClassName()}>
          {filteredEntities.map((entity) => renderRow(entity))}
        </div>
      </div>
      {(!isLeftDisabledOriginal || !isRightDisabledOriginal) && (
        <div className={cn("annotations-carousel").elem("carousel-controls").toClassName()}>
          <Button
            disabled={isLeftDisabledOriginal}
            aria-label="Carousel left"
            size="small"
            variant="neutral"
            onClick={(e) => !isLeftDisabledOriginal && updatePosition(e, true)}
          >
            <IconChevronLeft />
          </Button>
          <Button
            disabled={isRightDisabledOriginal}
            aria-label="Carousel right"
            size="small"
            variant="neutral"
            onClick={(e) => !isRightDisabledOriginal && updatePosition(e, false)}
          >
            <IconChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
