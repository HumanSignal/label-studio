/**
 * Grid component for Compare view - renders annotation panels side-by-side
 * Added virtualization support for large annotation counts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import { Button } from "@humansignal/ui";
import { LeftCircleOutlined, RightCircleOutlined } from "@ant-design/icons";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { observer } from "mobx-react";
import styles from "./Grid.module.css";
import { EntityTab } from "../AnnotationTabs/AnnotationTabs";
import { Annotation } from "./Annotation";
import { useAnnotationFetcher } from "../../hooks/useAnnotationQuery";
import { applyAnnotationHydrationFromApi } from "@humansignal/core/lib/utils/annotationLazyHydration";
import { emitAnnotationTabSelected } from "../../utils/labelingTelemetry";

// FIT-720: Virtualization constants for Compare view
const PANEL_WIDTH = 500; // Width of each annotation panel (approximately 50% of typical viewport)
const PANEL_GAP = 30; // Gap between panels (matches $gap in Grid.module.css)

// FIT-720: Virtualized annotation panel with lazy hydration (exported for tests)
export const VirtualizedAnnotationPanel = observer(
  ({ annotation, root, style, onSelect, isHydrating, hydratedIdsRef }) => {
    // Check if annotation has regions - either from original load (versions.result) or from hydration (areas)
    const versionsResult = annotation.versions?.result;
    const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;
    // Force MobX to track areas by accessing the regions getter (which iterates areas)
    const regions = annotation.regions;
    const hasRegions = regions && regions.length > 0;
    // Annotation is a stub if it has no data and is not user-generated
    // After hydration, hasRegions will be true (deserializeResults populates regions)
    const isStub = !hasVersionsResult && !hasRegions && annotation.pk && !annotation.userGenerate;
    // Already hydrated (including with empty result) — don't show "Waiting to load..."
    const wasHydrated = hydratedIdsRef?.current?.has(annotation.id);

    return (
      <div style={{ ...style, paddingRight: PANEL_GAP }}>
        <div id={`c-${annotation.id}`} className="flex h-full flex-col relative">
          <EntityTab
            entity={annotation}
            onClick={() => onSelect(annotation)}
            prediction={annotation.type === "prediction"}
            bordered={false}
            style={{ height: 44 }}
          />
          {!wasHydrated && (isStub || isHydrating) ? (
            <div className="min-h-0 flex-1 flex flex-col items-center justify-center bg-[var(--color-neutral-surface)]">
              <Spin size="large" />
              <span className="mt-300 text-neutral-content-subtler">
                {isHydrating ? "Loading annotation..." : "Waiting to load..."}
              </span>
            </div>
          ) : (
            <Annotation root={root} annotation={annotation} />
          )}
        </div>
      </div>
    );
  },
);

// FIT-720: Virtualized Grid component
const VirtualizedGrid = observer(({ store, annotations, root, includePredictions = false }) => {
  const listRef = useRef(null);
  const [hydratingIds, setHydratingIds] = useState(new Set());
  const [containerWidth, setContainerWidth] = useState(0);
  const initialHydrationDone = useRef(false);
  // Track annotations that have been successfully hydrated to avoid re-hydrating
  const hydratedIds = useRef(new Set());
  // Debounce timer for scroll-based hydration
  const scrollHydrationTimer = useRef(null);

  const taskId = store?.store?.task?.id ?? store?.task?.id;
  const viewingAll = Boolean(store?.viewingAll);
  // FIT-720: TanStack Query for annotation fetches (task-scoped keys for prefix invalidation)
  const { fetchAnnotationCached, getCachedAnnotation } = useAnnotationFetcher(taskId);

  const annotationPkSignature = useMemo(
    () => annotations.map((a) => (a.pk != null ? String(a.pk) : "")).join(","),
    [annotations],
  );

  // After task reload / annotation list changes, allow Compare All panels to re-fetch (FIT-1660).
  useEffect(() => {
    hydratedIds.current.clear();
    initialHydrationDone.current = false;
  }, [taskId, annotationPkSignature]);

  // FIT-720: On mount, initialize hydratedIds with annotations that already have data
  // This handles the case where user navigated away and came back
  useEffect(() => {
    annotations.forEach((annotation) => {
      if (!annotation.pk || annotation.type === "prediction" || annotation.userGenerate) return;

      const id = annotation.pk;

      // Check if annotation already has data in MST
      const versionsResult = annotation.versions?.result;
      const hasDataInMST = Array.isArray(versionsResult) && versionsResult.length > 0;
      const regions = annotation.regions;
      const hasRegions = regions && regions.length > 0;

      if (hasDataInMST || hasRegions) {
        // FIT-1660: Do not mark hydrated from MST regions alone — Compare All can show stale regions
        // after a sibling save + task reload; onItemsRendered / viewingAll hydration must re-sync from API.
        if (!viewingAll) {
          hydratedIds.current.add(annotation.id);
        }
        return;
      }

      // Check if we have cached data in TanStack Query
      const cachedData = getCachedAnnotation(id);
      if (cachedData?.result !== undefined) {
        // Restore data from cache to MST annotation
        annotation.history?.freeze?.();
        annotation.deserializeResults?.(cachedData.result);
        annotation.setEditable?.(false);
        annotation.updateObjects?.();
        annotation.history?.safeUnfreeze?.();
        annotation.reinitHistory?.();
        // Track as hydrated (don't directly modify MST model - causes protection errors)
        hydratedIds.current.add(annotation.id);
      }
    });
  }, [taskId, viewingAll, annotations, getCachedAnnotation]); // Re-run when task / compare mode changes

  // Filter visible annotations (optionally exclude predictions)
  const visibleAnnotations = useMemo(
    () => annotations.filter((c) => !c.hidden && (includePredictions || c.type !== "prediction")),
    [annotations, includePredictions],
  );

  // Calculate panel width based on container (aim for ~50% width, min PANEL_WIDTH)
  const panelWidth = useMemo(() => {
    if (containerWidth > 0) {
      const halfWidth = Math.floor((containerWidth - PANEL_GAP) / 2);
      return Math.max(halfWidth, PANEL_WIDTH);
    }
    return PANEL_WIDTH;
  }, [containerWidth]);

  const totalWidth = visibleAnnotations.length * (panelWidth + PANEL_GAP);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Navigation states
  const isLeftDisabled = scrollOffset <= 0;
  const isRightDisabled = scrollOffset >= totalWidth - containerWidth;
  const showControls = totalWidth > containerWidth;

  const handleScroll = useCallback(({ scrollOffset: newOffset }) => {
    setScrollOffset(newOffset);
  }, []);

  const scrollLeft = useCallback(() => {
    if (listRef.current) {
      const newOffset = Math.max(0, scrollOffset - panelWidth - PANEL_GAP);
      listRef.current.scrollTo(newOffset);
    }
  }, [scrollOffset, panelWidth]);

  const scrollRight = useCallback(() => {
    if (listRef.current) {
      const maxOffset = totalWidth - containerWidth;
      const newOffset = Math.min(maxOffset, scrollOffset + panelWidth + PANEL_GAP);
      listRef.current.scrollTo(newOffset);
    }
  }, [scrollOffset, panelWidth, totalWidth, containerWidth]);

  const select = useCallback(
    (c) => {
      const previous = store.selected;
      if (c.type === "annotation") {
        store.selectAnnotation(c.id, { exitViewAll: true });
      } else {
        store.selectPrediction(c.id, { exitViewAll: true });
      }
      emitAnnotationTabSelected(store.store, c, previous, { exitViewAll: true });
    },
    [store],
  );

  // FIT-720: Hydrate annotations that come into view using TanStack Query
  const hydrateAnnotation = useCallback(
    async (annotation) => {
      const annotationPk = annotation.pk || annotation.id;
      const annotationId = annotation.id;

      setHydratingIds((prev) => new Set([...prev, annotationId]));

      try {
        const rootStore = store.store;
        const sdk = rootStore?.SDK;

        let fullAnnotation = null;

        if (sdk?.ensureAnnotationLoaded) {
          fullAnnotation = await sdk.ensureAnnotationLoaded(annotationPk);
        }

        const loadViaDm = sdk?.datamanager?.store?.taskStore?.loadAnnotation;
        if ((!fullAnnotation || fullAnnotation.error || fullAnnotation.result === undefined) && loadViaDm) {
          const fromDm = await loadViaDm(annotationPk);
          if (fromDm && !fromDm.error) {
            fullAnnotation = fromDm;
          }
        }

        if (!fullAnnotation || fullAnnotation.error || fullAnnotation.result === undefined) {
          fullAnnotation = await fetchAnnotationCached(annotationPk);
        }

        if (fullAnnotation && !fullAnnotation.error) {
          const freshAnnotation = annotations.find((a) => a.id === annotationId);
          if (freshAnnotation) {
            applyAnnotationHydrationFromApi(annotations, annotationPk, fullAnnotation);
            freshAnnotation.setEditable?.(false);
          }
        }
        hydratedIds.current.add(annotationId);
      } catch (error) {
        /* istanbul ignore next: non-cancel path is hard to trigger in tests */
        if (error?.name === "CancelledError" || error?.revert === true) {
          return;
        }
      } finally {
        setHydratingIds((prev) => {
          const next = new Set(prev);
          next.delete(annotationId);
          return next;
        });
      }
    },
    [store, fetchAnnotationCached, annotations],
  );

  // FIT-720: Handle items rendered - hydrate visible stubs (debounced to avoid hammering on scroll)
  const onItemsRendered = useCallback(
    ({ visibleStartIndex, visibleStopIndex }) => {
      // Clear any pending hydration check
      if (scrollHydrationTimer.current) {
        clearTimeout(scrollHydrationTimer.current);
      }

      // Debounce hydration checks to avoid triggering on every scroll frame
      scrollHydrationTimer.current = setTimeout(() => {
        for (let i = visibleStartIndex; i <= visibleStopIndex; i++) {
          const annotation = visibleAnnotations[i];
          if (!annotation) continue;

          // Skip if already hydrated or currently hydrating
          if (hydratedIds.current.has(annotation.id) || hydratingIds.has(annotation.id)) {
            continue;
          }

          // Use consistent stub detection: check versions.result (source of truth)
          const versionsResult = annotation.versions?.result;
          const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;
          const regions = annotation.regions;
          const hasRegions = regions && regions.length > 0;
          const isStub = !hasVersionsResult && !hasRegions && annotation.pk && !annotation.userGenerate;
          const needsCompareResync =
            viewingAll && annotation.pk && !annotation.userGenerate && annotation.type !== "prediction";

          if (isStub || needsCompareResync) {
            hydrateAnnotation(annotation);
          }
        }
      }, 150); // Debounce for 150ms to avoid rapid-fire hydration
    },
    [visibleAnnotations, hydratingIds, hydrateAnnotation, viewingAll],
  );

  // FIT-720: Initial hydration on mount - hydrate first visible annotations
  useEffect(() => {
    // Only run once when containerWidth becomes non-zero
    if (initialHydrationDone.current || visibleAnnotations.length === 0 || containerWidth === 0) return;

    initialHydrationDone.current = true;

    const visibleCount = Math.ceil(containerWidth / (panelWidth + PANEL_GAP)) + 1;
    const initialVisibleCount = Math.min(visibleCount, visibleAnnotations.length);

    for (let i = 0; i < initialVisibleCount; i++) {
      const annotation = visibleAnnotations[i];
      if (!annotation) continue;

      // Skip if already hydrated
      if (hydratedIds.current.has(annotation.id)) continue;

      // Use consistent stub detection: check versions.result (source of truth)
      const versionsResult = annotation.versions?.result;
      const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;
      const regions = annotation.regions;
      const hasRegions = regions && regions.length > 0;
      const isStub = !hasVersionsResult && !hasRegions && annotation.pk && !annotation.userGenerate;
      const needsCompareResync =
        viewingAll && annotation.pk && !annotation.userGenerate && annotation.type !== "prediction";

      if (isStub || needsCompareResync) {
        hydrateAnnotation(annotation);
      }
    }
  }, [containerWidth, visibleAnnotations, panelWidth, hydrateAnnotation, viewingAll]);

  // Item data for virtualized list
  const itemData = useMemo(
    () => ({
      annotations: visibleAnnotations,
      root,
      onSelect: select,
      hydratingIds,
      hydratedIdsRef: hydratedIds,
    }),
    [visibleAnnotations, root, select, hydratingIds],
  );

  // Row renderer
  const renderPanel = useCallback(({ index, style, data }) => {
    const annotation = data.annotations[index];
    return (
      <VirtualizedAnnotationPanel
        key={annotation.id}
        annotation={annotation}
        root={data.root}
        style={style}
        onSelect={data.onSelect}
        isHydrating={data.hydratingIds.has(annotation.id)}
        hydratedIdsRef={data.hydratedIdsRef}
      />
    );
  }, []);

  return (
    <div className={styles.containerVirtualized}>
      <div className={`${styles.grid} overflow-hidden h-full`}>
        <AutoSizer>
          {({ width, height }) => {
            if (width !== containerWidth) {
              setContainerWidth(width);
            }
            return (
              <List
                ref={listRef}
                layout="horizontal"
                height={height}
                width={width}
                itemCount={visibleAnnotations.length}
                itemSize={panelWidth + PANEL_GAP}
                itemData={itemData}
                onScroll={handleScroll}
                onItemsRendered={onItemsRendered}
                overscanCount={2}
              >
                {renderPanel}
              </List>
            );
          }}
        </AutoSizer>
      </div>
      {showControls && (
        <>
          <Button
            size="small"
            look="string"
            onClick={scrollLeft}
            className={styles.left}
            aria-label="Move left"
            disabled={isLeftDisabled}
          >
            <LeftCircleOutlined />
          </Button>
          <Button
            size="small"
            look="string"
            onClick={scrollRight}
            className={styles.right}
            aria-label="Move right"
            disabled={isRightDisabled}
          >
            <RightCircleOutlined />
          </Button>
        </>
      )}
    </div>
  );
});

export { VirtualizedGrid };

export default function Grid(props) {
  return <VirtualizedGrid {...props} />;
}
