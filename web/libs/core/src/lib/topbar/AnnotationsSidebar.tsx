/**
 * Resizable sidebar wrapper for the vertical annotations list.
 *
 * Renders a filter bar + AnnotationsCarousel inside a column with explicit width,
 * plus a border-line resize handle on the right edge. Width is persisted
 * via usePersistentState.
 *
 * The sidebar uses a render-prop pattern: it computes displayEntities (filtered + sorted)
 * and passes them to the children function so wrappers can inject them into the carousel.
 */

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { FunnelSimpleIcon } from "@humansignal/icons";
import { Button, EmptyState } from "@humansignal/ui";
import { cnb as cn } from "../utils/bem";
import { usePersistentJSONState, usePersistentState } from "../hooks/usePersistentState";
import { AnnotationsListFilter } from "./AnnotationsListFilter";
import {
  filterAnnotationsList,
  DEFAULT_ANNOTATIONS_LIST_FILTER,
  isFilterActive,
  matchesAnnotationsListFilter,
  normalizeAnnotationsListFilter,
  stripReviewStatusFilters,
} from "./annotations-list-filter";
import {
  DEFAULT_ANNOTATIONS_LIST_SORT,
  normalizeAnnotationsListSort,
  sortAnnotationsList,
} from "./sortAnnotationsList";
import { ViewAllToggle } from "./ViewAllToggle";
import type {
  AnnotationCapabilities,
  AnnotationsListFilter as FilterState,
  AnnotationsListSortState,
  SharedAnnotation,
} from "./types";
import "./AnnotationsSidebar.prefix.css";

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 420;

export interface AnnotationsSidebarToolbarProps {
  showViewAll?: boolean;
  isViewAll?: boolean;
  onToggleViewAll?: () => void;
}

function annotationsListStorageKey(suffix: string, projectId?: number | string | null): string {
  return projectId != null ? `${suffix}:project:${projectId}` : suffix;
}

export interface AnnotationsSidebarProps extends AnnotationsSidebarToolbarProps {
  entities: SharedAnnotation[];
  selectedId: string | null;
  capabilities: AnnotationCapabilities;
  /** When set, filter and sort preferences are persisted per project in localStorage. */
  projectId?: number | string | null;
  /**
   * Render the annotation list. Receives the filtered+sorted entities to display and a
   * pre-built filter notice to forward into the carousel when the filter yields no
   * matches but the selected result remains visible (pass it as the carousel's `emptyState` prop).
   */
  children: (displayEntities: SharedAnnotation[], emptyState: ReactNode) => ReactNode;
  /**
   * When provided, automatically selects the first visible annotation/prediction
   * whenever the filter or sort state changes and at least one result exists.
   */
  onFirstResultOnFilter?: (entity: SharedAnnotation) => void;
}

export function AnnotationsSidebar({
  entities,
  selectedId,
  capabilities,
  projectId,
  children,
  showViewAll,
  isViewAll,
  onToggleViewAll,
  onFirstResultOnFilter,
}: AnnotationsSidebarProps) {
  const filterStorageKey = annotationsListStorageKey("annotations-list-filter", projectId);
  const sortStorageKey = annotationsListStorageKey("annotations-list-sort", projectId);

  const [width, setWidth] = usePersistentJSONState<number>("annotations-sidebar-width", DEFAULT_WIDTH);
  const [storedFilter, setStoredFilter] = usePersistentJSONState<FilterState>(
    filterStorageKey,
    DEFAULT_ANNOTATIONS_LIST_FILTER,
  );
  const enableReviewStatusFilters = capabilities.enableReviewStatusFilters === true;
  const filter = useMemo(
    () => stripReviewStatusFilters(normalizeAnnotationsListFilter(storedFilter), enableReviewStatusFilters),
    [storedFilter, enableReviewStatusFilters],
  );
  const setFilter = useCallback(
    (value: FilterState | ((prev: FilterState) => FilterState)) => {
      setStoredFilter((prev) => {
        const current = stripReviewStatusFilters(normalizeAnnotationsListFilter(prev), enableReviewStatusFilters);
        const next = value instanceof Function ? value(current) : value;
        return stripReviewStatusFilters(normalizeAnnotationsListFilter(next), enableReviewStatusFilters);
      });
    },
    [setStoredFilter, enableReviewStatusFilters],
  );
  const [sort, setSort] = usePersistentState<AnnotationsListSortState>(sortStorageKey, DEFAULT_ANNOTATIONS_LIST_SORT, {
    decoder: (value, defaultValue) => {
      try {
        return normalizeAnnotationsListSort(JSON.parse(value));
      } catch {
        return defaultValue;
      }
    },
    encoder: (value) => JSON.stringify(value),
  });

  const isFirstFilterRender = useRef(true);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startWidth = width;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const containerMax = Math.min(MAX_WIDTH, window.innerWidth * 0.35);
        const next = Math.max(MIN_WIDTH, Math.min(containerMax, startWidth + delta));
        setWidth(next);
      };

      const onUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("lostpointercapture", onUp);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("lostpointercapture", onUp);
    },
    [setWidth, width],
  );

  // When annotations:hide-info is on (`showUserInfo: false`), hide the filter bar
  // so search/filter/sort-by-name cannot be used to probe masked annotator identity.
  const showFilterBar = capabilities.showUserInfo;
  const effectiveFilter = showFilterBar ? filter : DEFAULT_ANNOTATIONS_LIST_FILTER;
  const effectiveSort = showFilterBar ? sort : DEFAULT_ANNOTATIONS_LIST_SORT;
  const filtered = filterAnnotationsList(entities, effectiveFilter, selectedId);
  const displayEntities = sortAnnotationsList(filtered, effectiveSort);
  const filteredMatchCount = entities.filter((entity) => matchesAnnotationsListFilter(entity, effectiveFilter)).length;
  const totalCount = entities.length;
  const showFilterEmpty =
    showFilterBar && isFilterActive(effectiveFilter) && filteredMatchCount === 0 && displayEntities.length > 0;

  const handleClearFilters = useCallback(() => {
    setFilter(DEFAULT_ANNOTATIONS_LIST_FILTER);
  }, [setFilter]);

  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    if (!showFilterBar || !onFirstResultOnFilter) return;

    // If the currently selected entity still satisfies the new filter, leave it selected.
    // This avoids flickering on minor filter tweaks and is the correct UX for sort changes.
    const currentlySelected = selectedId ? displayEntities.find((e) => e.id === selectedId) : null;
    if (currentlySelected && matchesAnnotationsListFilter(currentlySelected, effectiveFilter)) return;

    // Current selection no longer matches — navigate to the first entity that does.
    const firstMatch = displayEntities.find((e) => matchesAnnotationsListFilter(e, effectiveFilter));
    if (firstMatch) onFirstResultOnFilter(firstMatch);
    // Intentionally only re-run when filter or sort changes, not on entity/selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilter, effectiveSort, showFilterBar]);

  return (
    <div
      className={cn("annotations-sidebar").toClassName()}
      style={{ width: `${width}px` }}
      data-testid="annotations-sidebar"
    >
      {showViewAll && onToggleViewAll && (
        <div className={cn("annotations-sidebar").elem("toolbar").toClassName()}>
          <ViewAllToggle isActive={!!isViewAll} onClick={onToggleViewAll} variant="sidebar" />
        </div>
      )}
      {showFilterBar && (
        <AnnotationsListFilter
          filter={filter}
          onChange={setFilter}
          capabilities={capabilities}
          filteredMatchCount={filteredMatchCount}
          totalCount={totalCount}
          sort={sort}
          onSortChange={setSort}
        />
      )}
      <div className={cn("annotations-sidebar").elem("list").toClassName()}>
        {children(
          displayEntities,
          showFilterEmpty ? (
            <EmptyState
              size="small"
              variant="neutral"
              icon={<FunnelSimpleIcon size={20} aria-hidden="true" />}
              title="No matching results"
              description="Nothing matches your search or filters. The selected result stays visible."
              actions={
                <Button
                  type="button"
                  variant="neutral"
                  look="outlined"
                  size="small"
                  onClick={handleClearFilters}
                  data-testid="annotations-sidebar-filter-clear"
                >
                  Clear Filters
                </Button>
              }
              className={cn("annotations-sidebar").elem("listEmpty").toClassName()}
              data-testid="annotations-sidebar-filter-empty"
            />
          ) : null,
        )}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize annotations panel"
        tabIndex={0}
        className={cn("annotations-sidebar").elem("resizer").toClassName()}
        onPointerDown={handleResizePointerDown}
      />
    </div>
  );
}
