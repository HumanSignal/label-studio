import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  VirtualizeJSON,
  type JSONViewerRowContext,
  type JSONViewerRowDecorator,
  type JSONViewerRowFilter,
  type JSONViewerRowRenderer,
} from "react-json-virtualization";
import "react-json-virtualization/styles.css";
import { CopyNodeButton } from "./copy-node-button";
import { ReaderViewButton } from "./reader-view-button";
import { rowContextToNodeData } from "./node-data-adapter";
import {
  clipString,
  resolveInitialExpandDepth,
  resolvePathFilterQuery,
  resolveStringTruncate,
} from "./virtualized-json-viewer-utils";
import { scheduleDeepSearchExpansionPaths } from "./deep-search";
import { VIRTUALIZED_SEARCH_DEBOUNCE_MS } from "./virtualized-search-filter";
import { labelStudioVirtualizedTheme } from "./virtualized-json-viewer-theme";
import styles from "./json-viewer.module.css";

export type VirtualizedJsonViewerInnerProps = {
  data: unknown;
  searchText: string;
  activeFilterId: string | null;
  collapseDepth: number | boolean;
  resetKey: number;
  fontSize: string | number;
  stringTruncate?: number;
  readerViewThreshold: number;
};

/** Match legacy json-edit-react collection header: `{` + "N items" instead of `{ } Object(N)`. */
function formatCollectionCount(preview: string): string | null {
  const match = preview.match(/\((\d+)\)/);
  if (!match) {
    return preview || null;
  }
  const count = Number(match[1]);
  return count === 1 ? "1 item" : `${count} items`;
}

export const VirtualizedJsonViewerInner = ({
  data,
  searchText,
  activeFilterId,
  collapseDepth,
  resetKey,
  fontSize,
  stringTruncate,
  readerViewThreshold,
}: VirtualizedJsonViewerInnerProps) => {
  const previewTruncate = resolveStringTruncate(stringTruncate);
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [deepSearchExpansionPaths, setDeepSearchExpansionPaths] = useState<Set<string> | null>(null);
  const pendingSearchQuery = searchText.trim();
  const activeSearchQuery = debouncedSearchText.trim();
  const isSearchPending = pendingSearchQuery !== activeSearchQuery;

  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setDebouncedSearchText("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, VIRTUALIZED_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  // Serialize once per data change; library requires a string and parses incrementally.
  const json = useMemo(() => JSON.stringify(data ?? null), [data]);
  const initialExpandDepth = resolveInitialExpandDepth(collapseDepth);
  const pathFilterQuery = resolvePathFilterQuery(activeFilterId);

  // The library only searches flattened (expanded) rows. Walk the full payload so deep
  // nested keys like review_dimensions stay searchable at default expand depth.
  useEffect(() => {
    if (!activeSearchQuery || isSearchPending) {
      setDeepSearchExpansionPaths(null);
      return;
    }

    let cancelled = false;
    setDeepSearchExpansionPaths(null);

    const scheduled = scheduleDeepSearchExpansionPaths(data, activeSearchQuery, {
      pathFilterPrefix: pathFilterQuery,
    });

    void scheduled.promise.then((paths) => {
      if (!cancelled) {
        setDeepSearchExpansionPaths(paths);
      }
    });

    return () => {
      cancelled = true;
      scheduled.cancel();
    };
  }, [activeSearchQuery, data, isSearchPending, pathFilterQuery]);

  const searchVisiblePaths = useMemo(() => {
    if (!activeSearchQuery || isSearchPending || deepSearchExpansionPaths === null) {
      return null;
    }

    return deepSearchExpansionPaths;
  }, [activeSearchQuery, deepSearchExpansionPaths, isSearchPending]);

  const rowDecorator = useCallback<JSONViewerRowDecorator>(
    (context: JSONViewerRowContext) => {
      if (context.mode !== "tree") {
        return undefined;
      }

      const actions: ReactNode[] = [<CopyNodeButton key="copy" value={context.row.rawValue} />];

      if (readerViewThreshold > 0 && context.row.valueType === "string") {
        const value = context.row.rawValue;
        if (typeof value === "string" && value.length > readerViewThreshold) {
          const nodeData = rowContextToNodeData(context);
          if (nodeData) {
            actions.push(<ReaderViewButton key="reader" nodeData={nodeData} threshold={readerViewThreshold} />);
          }
        }
      }

      return { actions: <>{actions}</> };
    },
    [readerViewThreshold],
  );

  const rowFilter = useCallback<JSONViewerRowFilter>(
    (context) => {
      if (!activeSearchQuery || isSearchPending || context.mode !== "tree") {
        return true;
      }

      if (!searchVisiblePaths) {
        return true;
      }

      return searchVisiblePaths.has(context.path);
    },
    [activeSearchQuery, isSearchPending, searchVisiblePaths],
  );

  const rowRenderer = useCallback<JSONViewerRowRenderer>(
    (context, defaultContent) => {
      if (context.mode !== "tree") {
        return defaultContent;
      }

      const { row } = context;

      if (row.valueType === "string") {
        const rawValue = typeof row.rawValue === "string" ? row.rawValue : String(row.rawValue ?? "");

        return (
          <span className={styles.virtualizedRowBody}>
            {row.key !== undefined ? (
              <>
                <span className="rjv-token-key">{row.key}</span>
                <span className="rjv-token-punctuation">: </span>
              </>
            ) : null}
            <span className={clsx("rjv-token-string", styles.truncatedStringValue)} title={rawValue}>
              &quot;{clipString(rawValue, previewTruncate)}&quot;
            </span>
          </span>
        );
      }

      if (row.valueType === "number" || row.valueType === "boolean" || row.valueType === "null") {
        const valueClassName =
          row.valueType === "number"
            ? "rjv-token-number"
            : row.valueType === "boolean"
              ? "rjv-token-boolean"
              : "rjv-token-null";
        const valueLabel = row.valueType === "null" ? "null" : row.preview;

        return (
          <span className={styles.virtualizedRowBody}>
            {row.key !== undefined ? (
              <>
                <span className="rjv-token-key">{row.key}</span>
                <span className="rjv-token-punctuation">: </span>
              </>
            ) : null}
            <span className={valueClassName}>{valueLabel}</span>
          </span>
        );
      }

      if (row.valueType !== "object" && row.valueType !== "array") {
        return defaultContent;
      }

      const openBracket = row.valueType === "array" ? "[" : "{";
      const countLabel = formatCollectionCount(row.preview);
      const rootLabel = row.key === undefined ? "root" : row.key;

      return (
        <span className={styles.virtualizedRowBody}>
          <span className="rjv-token-key">{rootLabel}</span>
          {row.key !== undefined ? <span className="rjv-token-punctuation">: </span> : null}
          <span className="rjv-token-punctuation">{openBracket}</span>
          {countLabel && <span className={styles.collectionItemCount}>{countLabel}</span>}
        </span>
      );
    },
    [previewTruncate],
  );

  const viewerStyle = fontSize === "inherit" ? undefined : { fontSize };

  return (
    <div className={styles.virtualizedJsonViewer} style={viewerStyle} data-testid="virtualized-json-viewer-inner">
      <VirtualizeJSON.Collapsable
        key={resetKey}
        json={json}
        metadata
        height="100%"
        rowHeight={24}
        className={styles.virtualizedJsonViewerTree}
        initialExpandDepth={initialExpandDepth}
        expandedPaths={
          deepSearchExpansionPaths && deepSearchExpansionPaths.size > 0 ? deepSearchExpansionPaths : undefined
        }
        pathFilterQuery={pathFilterQuery}
        pathFilterMode={pathFilterQuery ? "prefix" : undefined}
        searchQuery={activeSearchQuery || undefined}
        searchMode="includes"
        rowFilter={rowFilter}
        theme={labelStudioVirtualizedTheme}
        rowRenderer={rowRenderer}
        rowDecorator={rowDecorator}
      />
    </div>
  );
};
