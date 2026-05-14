/**
 * Shared, presentational AnnotationsCarousel.
 *
 * Pure props in / pure callbacks out. No MST, no Jotai. Visuals follow the classic
 * editor (BEM `.prefix.css`, `lsf-annotations-carousel*` selectors after PostCSS).
 *
 * Both branches (virtualized via react-window above 50 items, non-virtualized via CSS
 * transform) are preserved from the classic editor. The wrapper decides whether to
 * enable virtualization at all (classic gates on FF_FIT_720_LAZY_LOAD_ANNOTATIONS;
 * shell wrapper passes `virtualizationEnabled={true}` unconditionally).
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
import { IconChevronLeft, IconChevronRight } from "@humansignal/icons";
import { cnb as cn } from "../utils/bem";
import { AnnotationButton } from "./AnnotationButton";
import type { AnnotationActionHandlers, AnnotationCapabilities, SharedAnnotation } from "./types";
import "./AnnotationsCarousel.prefix.css";

/**
 * Optional per-row render override. Receives the SharedAnnotation entity and must
 * return a React node — typically a per-row wrapper (e.g. classic editor's MST
 * `AnnotationButton`) so per-row state (lazy hydration, user resolution) keeps
 * working. When omitted, the carousel renders the shared `AnnotationButton`.
 */
export type AnnotationRenderItem = (entity: SharedAnnotation) => ReactNode;

const ITEM_WIDTH = 200;
const ITEM_GAP = 4;
const VIRTUALIZATION_THRESHOLD = 50;

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
}

interface ItemData {
  entities: SharedAnnotation[];
  capabilities: AnnotationCapabilities;
  handlers: AnnotationActionHandlers;
  renderItem: AnnotationRenderItem;
}

function VirtualizedAnnotationRow({ index, style, data }: ListChildComponentProps<ItemData>) {
  const entity = data.entities[index];
  return <div style={{ ...(style as React.CSSProperties), paddingRight: ITEM_GAP }}>{data.renderItem(entity)}</div>;
}

export function AnnotationsCarousel({
  entities,
  selectedId,
  capabilities,
  handlers,
  virtualizationEnabled = false,
  suppressScrollToSelected = false,
  renderItem,
}: SharedAnnotationsCarouselProps) {
  const renderRow = useMemo<AnnotationRenderItem>(
    () =>
      renderItem ??
      ((entity: SharedAnnotation) => (
        <AnnotationButton key={entity.id} annotation={entity} capabilities={capabilities} handlers={handlers} />
      )),
    [renderItem, capabilities, handlers],
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
  }, [selectedId, filteredEntities, shouldVirtualize, suppressScrollToSelected]);

  // Suppress-scroll branch: keep strip pinned to the left
  useEffect(() => {
    if (!suppressScrollToSelected) return;
    setCurrentPosition(0);
    setScrollOffset(0);
    if (shouldVirtualize && listRef.current) listRef.current.scrollTo(0);
  }, [suppressScrollToSelected, shouldVirtualize]);

  const itemData = useMemo<ItemData>(
    () => ({ entities: filteredEntities, capabilities, handlers, renderItem: renderRow }),
    [filteredEntities, capabilities, handlers, renderRow],
  );

  if (!(capabilities.enableAnnotations || capabilities.enablePredictions || capabilities.enableCreateAnnotation)) {
    return null;
  }

  if (shouldVirtualize) {
    return (
      <div
        className={cn("annotations-carousel")
          .mod({ scrolled: scrollOffset > 0, virtualized: true })
          .toClassName()}
      >
        <div className={cn("annotations-carousel").elem("container").toClassName()}>
          <AutoSizer>
            {({ width, height }) => {
              if (width !== containerWidth) {
                setContainerWidth(width - 77);
              }
              return (
                // @ts-expect-error - react-window types incompatible with React 18
                <List
                  ref={listRef}
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
