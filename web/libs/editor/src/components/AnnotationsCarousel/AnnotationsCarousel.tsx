import { Button, IconChevronLeft, IconChevronRight } from "@humansignal/ui";
import { observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList as List, type ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { cn } from "../../utils/bem";
import { clamp, sortAnnotations } from "../../utils/utilities";
import { isActive, FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { AnnotationButton } from "./AnnotationButton";
import "./AnnotationsCarousel.scss";

const ITEM_WIDTH = 200; // Approximate width of each annotation button (min-width: 186px + gap)
const ITEM_GAP = 4; // Gap between items (--spacing-tighter)
const VIRTUALIZATION_THRESHOLD = 50; // Only virtualize if more than this many items

interface AnnotationsCarouselInterface {
  store: any;
  annotationStore: any;
  commentStore?: any;
}

interface ItemData {
  entities: any[];
  capabilities: any;
  annotationStore: any;
  store: any;
}

const VirtualizedAnnotationButton = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const entity = data.entities[index];
  return (
    <div style={{ ...(style as React.CSSProperties), paddingRight: ITEM_GAP }}>
      <AnnotationButton
        key={entity?.id}
        entity={entity}
        capabilities={data.capabilities}
        annotationStore={data.annotationStore}
        store={data.store}
      />
    </div>
  );
};

export const AnnotationsCarousel = observer(({ store, annotationStore }: AnnotationsCarouselInterface) => {
  const [entities, setEntities] = useState<any[]>([]);
  const enableAnnotations = store.hasInterface("annotations:tabs");
  const enablePredictions = store.hasInterface("predictions:tabs");
  const enableCreateAnnotation = store.hasInterface("annotations:add-new");
  const groundTruthEnabled = store.hasInterface("ground-truth");
  const enableAnnotationDelete = store.hasInterface("annotations:delete");
  const listRef = useRef<List>(null);
  const carouselRef = useRef<HTMLElement>();
  const containerRef = useRef<HTMLElement>();

  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Original: Track position for non-virtualized CSS transform scrolling
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isLeftDisabledOriginal, setIsLeftDisabledOriginal] = useState(false);
  const [isRightDisabledOriginal, setIsRightDisabledOriginal] = useState(false);

  const capabilities = useMemo(
    () => ({
      enablePredictions,
      enableCreateAnnotation,
      groundTruthEnabled,
      enableAnnotations,
      enableAnnotationDelete,
    }),
    [enablePredictions, enableCreateAnnotation, groundTruthEnabled, enableAnnotations, enableAnnotationDelete],
  );

  const sortedEntities = useMemo(() => sortAnnotations(entities), [entities]);

  const totalWidth = sortedEntities.length * (ITEM_WIDTH + ITEM_GAP);
  const shouldVirtualize =
    isActive(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) && sortedEntities.length > VIRTUALIZATION_THRESHOLD;

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

  // Original: Update position for non-virtualized CSS transform scrolling
  const updatePosition = useCallback(
    (_e: React.MouseEvent, goLeft = true) => {
      if (containerRef.current && carouselRef.current) {
        const step = containerRef.current.clientWidth;
        const carouselWidth = carouselRef.current.clientWidth;
        const newPos = clamp(goLeft ? currentPosition - step : currentPosition + step, 0, carouselWidth - step);

        setCurrentPosition(newPos);
      }
    },
    [containerRef, carouselRef, currentPosition],
  );

  // Original: Update button disabled states for non-virtualized scrolling
  useEffect(() => {
    if (!shouldVirtualize) {
      setIsLeftDisabledOriginal(currentPosition <= 0);
      setIsRightDisabledOriginal(
        currentPosition >= (carouselRef.current?.clientWidth ?? 0) - (containerRef.current?.clientWidth ?? 0),
      );
    }
  }, [sortedEntities.length, containerRef.current, carouselRef.current, currentPosition, shouldVirtualize]);

  useEffect(() => {
    if (shouldVirtualize && listRef.current && annotationStore.selected) {
      const selectedIndex = sortedEntities.findIndex((e: any) => e?.id === annotationStore.selected?.id);
      if (selectedIndex >= 0) {
        listRef.current.scrollToItem(selectedIndex, "center");
      }
    }
  }, [annotationStore.selected?.id, sortedEntities, shouldVirtualize]);

  useEffect(() => {
    const newEntities = [];

    if (enablePredictions) newEntities.push(...annotationStore.predictions);

    if (enableAnnotations) newEntities.push(...annotationStore.annotations);
    setEntities(newEntities);
  }, [annotationStore, JSON.stringify(annotationStore.predictions), JSON.stringify(annotationStore.annotations)]);

  const itemData = useMemo(
    () => ({
      entities: sortedEntities,
      capabilities,
      annotationStore,
      store,
    }),
    [sortedEntities, capabilities, annotationStore, store],
  );

  if (!(enableAnnotations || enablePredictions || enableCreateAnnotation)) {
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
              // Update container width for navigation calculations
              if (width !== containerWidth) {
                setContainerWidth(width - 77); // Account for controls width
              }
              return (
                // @ts-expect-error - react-window types incompatible with React 18
                <List
                  ref={listRef}
                  layout="horizontal"
                  height={height}
                  width={width - 77} // Account for controls
                  itemCount={sortedEntities.length}
                  itemSize={ITEM_WIDTH + ITEM_GAP}
                  itemData={itemData}
                  onScroll={handleScroll}
                  overscanCount={5} // Render 5 extra items on each side for smooth scrolling
                  style={{ paddingLeft: ITEM_GAP }}
                >
                  {VirtualizedAnnotationButton}
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

  // Original: Non-virtualized rendering (FF off or small lists)
  return (
    <div
      className={cn("annotations-carousel")
        .mod({ scrolled: currentPosition > 0 })
        .toClassName()}
      style={{ "--carousel-left": `${currentPosition}px` } as any}
    >
      <div ref={containerRef as any} className={cn("annotations-carousel").elem("container").toClassName()}>
        <div ref={carouselRef as any} className={cn("annotations-carousel").elem("carosel").toClassName()}>
          {sortedEntities.map((entity) => (
            <AnnotationButton
              key={entity?.id}
              entity={entity}
              capabilities={capabilities}
              annotationStore={annotationStore}
              store={store}
            />
          ))}
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
});
