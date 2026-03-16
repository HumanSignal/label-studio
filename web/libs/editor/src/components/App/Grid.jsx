/**
 * Grid component for Compare view - renders annotation panels side-by-side
 * Added virtualization support for large annotation counts
 */

import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import { Button, Tooltip } from "@humansignal/ui";
import { LeftCircleOutlined, RightCircleOutlined } from "@ant-design/icons";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { observer } from "mobx-react";
import styles from "./Grid.module.css";
import { EntityTab } from "../AnnotationTabs/AnnotationTabs";
import { observe } from "mobx";
import Konva from "konva";
import { Annotation } from "./Annotation";
import { isDefined } from "../../utils/utilities";
import { FF_DEV_3391, isFF } from "../../utils/feature-flags";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { moveStylesBetweenHeadTags } from "../../utils/html";
import { useAnnotationFetcher } from "../../hooks/useAnnotationQuery";

// FIT-720: Virtualization constants for Compare view
const PANEL_WIDTH = 500; // Width of each annotation panel (approximately 50% of typical viewport)
const PANEL_GAP = 30; // Gap between panels (matches $gap in Grid.module.css)

/***** DON'T TRY THIS AT HOME *****/
/*
Grid renders a container which remains untouched all the process.
On every rerender it renders Item with next annotation in the list.
Rendered annotation is cloned into the container. And index of "current" annotation increases.
This triggers next rerender with next annotation until all the annotations are rendered.
*/

// Exported for unit tests (coverage)
export class Item extends Component {
  componentDidMount() {
    Promise.all(
      this.props.annotation.objects.map((o) => {
        // as the image has lazy load, and the image is not being added to the viewport
        // until it's loaded we need to skip the validation assuming that it's always ready,
        // otherwise we'll get a blank canvas
        if (o.type === "image") return Promise.resolve();

        /* istanbul ignore next: observe path requires mobx in test env */
        return o.isReady
          ? Promise.resolve(o.isReady)
          : new Promise((resolve) => {
              const dispose = observe(o, "isReady", () => {
                dispose();
                resolve();
              });
            });
      }),
    ).then(() => {
      // ~2 ticks for canvas to be rendered and resized completely
      setTimeout(this.props.onFinish, 32);
    });
  }

  render() {
    return <Annotation root={this.props.root} annotation={this.props.annotation} />;
  }
}

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
const VirtualizedGrid = observer(({ store, annotations, root }) => {
  const listRef = useRef(null);
  const [hydratingIds, setHydratingIds] = useState(new Set());
  const [containerWidth, setContainerWidth] = useState(0);
  const initialHydrationDone = useRef(false);
  // Track annotations that have been successfully hydrated to avoid re-hydrating
  const hydratedIds = useRef(new Set());
  // Debounce timer for scroll-based hydration
  const scrollHydrationTimer = useRef(null);

  // FIT-720: Use TanStack Query for annotation fetching
  const { fetchAnnotationCached, getCachedAnnotation } = useAnnotationFetcher();

  // FIT-720: On mount, initialize hydratedIds with annotations that already have data
  // This handles the case where user navigated away and came back
  useEffect(() => {
    if (!isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) return;

    annotations.forEach((annotation) => {
      if (!annotation.pk || annotation.type === "prediction" || annotation.userGenerate) return;

      const id = annotation.pk;

      // Check if annotation already has data in MST
      const versionsResult = annotation.versions?.result;
      const hasDataInMST = Array.isArray(versionsResult) && versionsResult.length > 0;
      const regions = annotation.regions;
      const hasRegions = regions && regions.length > 0;

      if (hasDataInMST || hasRegions) {
        // This annotation was previously hydrated or has data
        hydratedIds.current.add(annotation.id);
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
  }, []); // Only run once on mount

  // Filter visible annotations
  const visibleAnnotations = useMemo(() => annotations.filter((c) => !c.hidden), [annotations]);

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
      c.type === "annotation"
        ? store.selectAnnotation(c.id, { exitViewAll: true })
        : store.selectPrediction(c.id, { exitViewAll: true });
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
        // Access the root store to get the SDK
        const rootStore = store.store;
        const sdk = rootStore?.SDK;

        let fullAnnotation = null;

        if (sdk?.ensureAnnotationLoaded) {
          // Try the SDK method (works for labelStream)
          await sdk.ensureAnnotationLoaded(annotationPk);
          return; // SDK method handles everything
        }

        if (sdk?.datamanager?.store?.taskStore?.loadAnnotation) {
          // Fallback: directly load annotation via taskStore
          fullAnnotation = await sdk.datamanager.store.taskStore.loadAnnotation(annotationPk);
        } else {
          // Use TanStack Query for caching and deduplication
          fullAnnotation = await fetchAnnotationCached(annotationPk);
        }

        if (fullAnnotation && !fullAnnotation.error && fullAnnotation.result) {
          // IMPORTANT: Re-fetch the annotation from the store after async operation
          // The original reference might be stale (user navigated, scrolled, etc.)
          // which causes MST "object is protected" errors
          const freshAnnotation = annotations.find((a) => a.id === annotationId);
          if (!freshAnnotation) {
            // Annotation no longer exists in the store
            return;
          }

          // Check if annotation is still valid and not already hydrated
          const versionsResult = freshAnnotation.versions?.result;
          const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;
          const regions = freshAnnotation.regions;
          const hasRegions = regions && regions.length > 0;

          if (hasVersionsResult || hasRegions) {
            // Already hydrated (possibly by another code path)
            hydratedIds.current.add(annotationId);
            return;
          }

          // Hydrate the annotation with the loaded result
          freshAnnotation.history?.freeze?.();
          freshAnnotation.deserializeResults?.(fullAnnotation.result);

          // Ensure dynamically hydrated annotation is strictly read-only when viewing all (Compare All)
          freshAnnotation.setEditable?.(false);

          // Critical: updateObjects() is required to render visual regions after deserializing
          freshAnnotation.updateObjects?.();

          // Unfreeze history
          freshAnnotation.history?.safeUnfreeze?.();

          // reinitHistory cancels autosave and sets initial values so the hydration
          // isn't treated as a user modification (prevents unwanted draft creation)
          freshAnnotation.reinitHistory?.();

          // Mark as successfully hydrated to avoid re-hydrating
          // Note: Don't directly modify MST model (is_stub) - it causes protection errors
          hydratedIds.current.add(annotationId);
        } else {
          // Even if no results, mark as hydrated to avoid repeated attempts
          hydratedIds.current.add(annotationId);
        }
      } catch (error) {
        // Silently ignore cancellation errors - they're expected when scrolling
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

          if (isStub) {
            hydrateAnnotation(annotation);
          }
        }
      }, 150); // Debounce for 150ms to avoid rapid-fire hydration
    },
    [visibleAnnotations, hydratingIds, hydrateAnnotation],
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

      if (isStub) {
        hydrateAnnotation(annotation);
      }
    }
  }, [containerWidth, visibleAnnotations, panelWidth, hydrateAnnotation]);

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

// Original Grid class component (used when FF is off or few annotations)
class GridClassComponent extends Component {
  state = {
    item: 0,
    loaded: new Set(),
  };
  container = React.createRef();

  shouldComponentUpdate(nextProps, nexState) {
    return (
      !nextProps.store.selected.selected ||
      nexState.item >= nextProps.annotations.length ||
      nextProps.annotations[nexState.item] === nextProps.store.selected
    );
  }

  componentDidMount() {
    if (!isFF(FF_DEV_3391) && this.props.annotations[0] !== this.props.store.selected) {
      this.startRenderCycle();
    }
  }

  startRenderCycle() {
    this.renderNext(0);
  }

  renderNext(idx) {
    this.setState({ item: isDefined(idx) ? idx : this.state.item + 1 }, () => {
      if (this.state.item < this.props.annotations.length) {
        this.props.store._selectItem(this.props.annotations[this.state.item]);
      } else {
        this.props.store._unselectAll();
      }
    });
  }

  onFinish = () => {
    const c = this.container.current;

    if (!c) return;

    const itemWrapper = c.children[c.children.length - 1];
    const item = itemWrapper.children[itemWrapper.children.length - 1];
    const clone = item.cloneNode(true);

    c.children[this.state.item].appendChild(clone);

    // Force redraw
    /* istanbul ignore next: Konva not testable in jsdom */
    Konva.stages.map((stage) => stage.draw());

    /* canvases are cloned empty, so clone their content */
    const sourceCanvas = item.querySelectorAll("canvas");
    const clonedCanvas = clone.querySelectorAll("canvas");

    /* istanbul ignore next: canvas clone not testable in jsdom */
    clonedCanvas.forEach((canvas, i) => {
      canvas.getContext("2d").drawImage(sourceCanvas[i], 0, 0);
    });

    /*
      Procedure created style rules are not clonable so for
      iframe we should take care about them (highlight styles)
    */
    const sourceIframe = item.querySelectorAll("iframe");
    const clonedIframe = clone.querySelectorAll("iframe");

    /* istanbul ignore next: iframe clone not testable in jsdom */
    clonedIframe.forEach((iframe, idx) => {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(sourceIframe[idx].contentDocument.documentElement.outerHTML);
      moveStylesBetweenHeadTags(sourceIframe[idx].contentDocument.head, iframe.contentDocument.head);
    });

    this.setState((state) => {
      return {
        ...state,
        loaded: new Set([...state.loaded, this.props.store.selected.id]),
      };
    });

    this.renderNext();
  };

  shift = (delta) => {
    const container = this.container.current;
    const children = container.children;

    const current = Array.from(children).findIndex((child) => container.scrollLeft <= child.offsetLeft);

    if (!container) return;

    const count = this.props.annotations.length;
    const next = current + delta;

    if (next < 0 || next > count - 1) return;
    const newPosition = children[next].offsetLeft;

    container.scrollTo({ left: newPosition, top: 0, behavior: "smooth" });
  };

  left = () => {
    this.shift(-1);
  };

  right = () => {
    this.shift(1);
  };

  select = (c) => {
    const { store } = this.props;

    c.type === "annotation"
      ? store.selectAnnotation(c.id, { exitViewAll: true })
      : store.selectPrediction(c.id, { exitViewAll: true });
  };

  render() {
    const i = this.state.item;
    const { annotations } = this.props;
    const selected = isFF(FF_DEV_3391) ? null : this.props.store.selected;
    const isRenderingNext = i < annotations.length && annotations[i] === selected;

    return (
      <div className={styles.container}>
        <div ref={this.container} className={styles.grid}>
          {annotations
            .filter((c) => !c.hidden)
            .map((c) => (
              <div id={`c-${c.id}`} key={`anno-${c.id}`} style={{ position: "relative" }}>
                <Tooltip title="Open Annotation Tab">
                  <div>
                    <EntityTab
                      entity={c}
                      onClick={() => this.select(c)}
                      prediction={c.type === "prediction"}
                      bordered={false}
                      style={{ height: 44 }}
                    />
                  </div>
                </Tooltip>
                {isFF(FF_DEV_3391) ? (
                  <Annotation root={this.props.root} annotation={c} />
                ) : (
                  !this.state.loaded.has(c.id) && (
                    <div
                      style={{
                        top: 0,
                        left: 0,
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Spin size="large" />
                    </div>
                  )
                )}
              </div>
            ))}
          {isRenderingNext && (
            <div id={"c-tmp"} key={"anno-tmp"} style={{ opacity: 0, position: "relative", right: 99999 }}>
              <EntityTab
                entity={selected}
                prediction={selected.type === "prediction"}
                bordered={false}
                style={{ height: 44 }}
              />
              <Item root={this.props.root} onFinish={this.onFinish} key={i} annotation={selected} />
            </div>
          )}
        </div>
        <Button size="small" look="string" onClick={this.left} className={styles.left} aria-label="Move left">
          <LeftCircleOutlined />
        </Button>
        <Button size="small" look="string" onClick={this.right} className={styles.right} aria-label="Move right">
          <RightCircleOutlined />
        </Button>
      </div>
    );
  }
}

// FIT-720: Grid wrapper that chooses virtualized or original based on FF and annotation count
export default function Grid(props) {
  // FIT-720: Use VirtualizedGrid when FF is on so stub hydration runs (fixes compare-all with
  // 2 annotations where the second panel would never load in GridClassComponent).
  // Virtualization (react-window) is still only a win when we have many annotations.
  const shouldVirtualize = isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS);

  if (shouldVirtualize) {
    return <VirtualizedGrid {...props} />;
  }

  return <GridClassComponent {...props} />;
}
