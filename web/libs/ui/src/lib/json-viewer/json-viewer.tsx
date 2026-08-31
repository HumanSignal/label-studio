import { clsx } from "clsx";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { matchNode } from "json-edit-react";
import { ff } from "@humansignal/core";
import { IconSearch, IconReset, IconClose, IconCopyOutline } from "@humansignal/icons";
import { Button } from "../button/button";
import { Tooltip } from "../Tooltip/Tooltip";
import type { JsonViewerProps } from "./types";
import { LegacyJsonViewerInner } from "./legacy-json-viewer-inner";
import { VirtualizedJsonViewerInner } from "./virtualized-json-viewer-inner";
import styles from "./json-viewer.module.css";

const fallbackNodeMatch = (nodeData: any, searchTerm: string): boolean => {
  const normalizedTerm = searchTerm.toLowerCase();
  const nodeKey = typeof nodeData?.key === "string" ? nodeData.key.toLowerCase() : "";

  if (nodeKey.includes(normalizedTerm)) {
    return true;
  }

  if (Array.isArray(nodeData?.path)) {
    const hasPathMatch = nodeData.path.some((segment: string | number) =>
      String(segment).toLowerCase().includes(normalizedTerm),
    );

    if (hasPathMatch) {
      return true;
    }
  }

  const nodeValue = nodeData?.value;
  if (typeof nodeValue === "string" || typeof nodeValue === "number" || typeof nodeValue === "boolean") {
    return String(nodeValue).toLowerCase().includes(normalizedTerm);
  }

  return false;
};

/**
 * JsonViewer - An interactive JSON viewer component
 *
 * Features:
 * - Interactive tree view with expand/collapse
 * - Search functionality
 * - Custom filters
 * - Copy to clipboard
 */
export const JsonViewer: FC<JsonViewerProps> = ({
  // Core data
  data,
  // Behavior
  viewOnly = true,
  // UI Controls visibility
  showSearch = true,
  showFilters = true,
  showCopyButton = true,
  // Features
  customFilters = [],
  readerViewThreshold = 100,
  storageKey,
  toolbarExtra,
  // Display settings
  minHeight = 500,
  maxHeight = 500,
  fontSize = "inherit",
  stringTruncate,
  collapse: initialCollapse,
  // Styling
  className = "",
  inset = false,
  // Callbacks
  onCopy,
}) => {
  // Initialize state from localStorage if storageKey is provided
  const [searchText, setSearchText] = useState(() =>
    storageKey ? localStorage.getItem(`${storageKey}:search`) || "" : "",
  );

  const [copied, setCopied] = useState(false);

  const [activeFilter, setActiveFilter] = useState<string | null>(() =>
    storageKey ? localStorage.getItem(`${storageKey}:filter`) : null,
  );

  const [collapseDepth, setCollapseDepth] = useState<number | boolean>(initialCollapse ?? false);
  const [resetKey, setResetKey] = useState(0);

  // Combine built-in "All" filter with custom filters
  const allFilters = useMemo(
    () => [
      {
        id: "all",
        label: "All",
        filterFn: () => true,
      },
      ...customFilters,
    ],
    [customFilters],
  );

  // Format JSON for copying
  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

  // Copy to clipboard functionality
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      onCopy?.();
    });
  }, [jsonString, onCopy]);

  // Custom search filter function
  const searchFilter = useMemo(() => {
    if (!activeFilter) {
      return "all" as const;
    }

    const filterConfig = allFilters.find((f) => f.id === activeFilter);
    if (!filterConfig) {
      return "all" as const;
    }

    return (nodeData: any, searchTerm: string) => {
      // Apply custom filter
      if (!filterConfig.filterFn(nodeData)) {
        return false;
      }
      // Also apply search if there's search text
      if (searchTerm) {
        return matchNode(nodeData, searchTerm) || fallbackNodeMatch(nodeData, searchTerm);
      }
      return true;
    };
  }, [activeFilter, allFilters]);

  const handleFilterClick = useCallback(
    (filterId: string) => {
      setActiveFilter((prev) => {
        // Don't toggle off if already selected - just keep it selected
        if (prev === filterId) {
          return prev;
        }

        // Save to localStorage
        if (storageKey) {
          localStorage.setItem(`${storageKey}:filter`, filterId);
        }

        return filterId;
      });

      // Expand nodes so filtered results are visible, but limit depth to avoid
      // freezing with large datasets (e.g. 1000+ annotations)
      setCollapseDepth(initialCollapse ?? Number.POSITIVE_INFINITY);

      // Legacy json-edit-react needs a remount to apply collapse + filter state.
      // Virtualized viewer updates pathFilterQuery in place — remounting reparses MB JSON.
      if (!ff.isActive(ff.FF_FIT_2007_VIRTUALIZED_JSON_EDITOR)) {
        setResetKey((prev) => prev + 1);
      }
    },
    [storageKey, initialCollapse],
  );

  const handleResetFilters = useCallback(() => {
    setActiveFilter(null);
    setSearchText("");
    setCollapseDepth(false); // Reset to default collapsed state
    setResetKey((prev) => prev + 1);

    // Clear from localStorage
    if (storageKey) {
      localStorage.removeItem(`${storageKey}:filter`);
      localStorage.removeItem(`${storageKey}:search`);
    }
  }, [storageKey]);

  // Persist search text to localStorage when it changes
  useEffect(() => {
    if (storageKey && searchText) {
      localStorage.setItem(`${storageKey}:search`, searchText);
    } else if (storageKey && !searchText) {
      localStorage.removeItem(`${storageKey}:search`);
    }
  }, [searchText, storageKey]);

  const useVirtualizedJsonViewer = ff.isActive(ff.FF_FIT_2007_VIRTUALIZED_JSON_EDITOR);
  const JsonViewerInner = useVirtualizedJsonViewer ? VirtualizedJsonViewerInner : LegacyJsonViewerInner;

  const innerProps = useVirtualizedJsonViewer
    ? {
        data,
        searchText,
        activeFilterId: activeFilter,
        collapseDepth,
        resetKey,
        fontSize,
        stringTruncate,
        readerViewThreshold,
      }
    : {
        data,
        viewOnly,
        searchText,
        searchFilter,
        collapseDepth,
        resetKey,
        fontSize,
        stringTruncate,
        readerViewThreshold,
      };

  const viewerStyle = useMemo(() => {
    const style: React.CSSProperties = {};

    if (maxHeight != null) {
      style.maxHeight = maxHeight;
      style.height = maxHeight;
    } else if (minHeight != null) {
      style.minHeight = minHeight;
      style.height = minHeight;
    } else {
      style.height = "100%";
    }

    return style;
  }, [minHeight, maxHeight]);

  return (
    <div className={clsx(styles.jsonViewer, className)} style={viewerStyle}>
      {(showSearch || (showFilters && allFilters.length > 0)) && (
        <div className={styles.controls}>
          <div className={styles.leftControls}>
            {showSearch && (
              <div className={styles.searchWrapper}>
                <IconSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search keys or values"
                  value={searchText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Search JSON"
                />
                {searchText && (
                  <Tooltip title="Clear Search">
                    <Button
                      look="string"
                      variant="primary"
                      size="small"
                      onClick={() => setSearchText("")}
                      className={styles.searchClear}
                      leading={<IconClose width={20} height={20} />}
                      aria-label="Clear Search"
                    />
                  </Tooltip>
                )}
              </div>
            )}
            {showFilters && allFilters.length > 0 && (
              <div className={styles.filters}>
                {allFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    look="outlined"
                    variant={activeFilter === filter.id ? "primary" : "neutral"}
                    size="small"
                    onClick={() => handleFilterClick(filter.id)}
                  >
                    {filter.label}
                  </Button>
                ))}
                {activeFilter && (
                  <Tooltip title="Reset filters">
                    <Button
                      look="outlined"
                      variant="neutral"
                      size="small"
                      onClick={handleResetFilters}
                      leading={<IconReset width={16} height={16} />}
                    />
                  </Tooltip>
                )}
              </div>
            )}
            {toolbarExtra}
          </div>
        </div>
      )}
      <div
        className={clsx(
          styles.jsonEditorContainer,
          inset && styles.inset,
          useVirtualizedJsonViewer && styles.jsonEditorContainerVirtualized,
        )}
      >
        {showCopyButton && (
          <Tooltip title={copied ? "Copied!" : "Copy JSON"}>
            <Button
              look="outlined"
              variant="neutral"
              size="small"
              className={styles.copyButton}
              onClick={handleCopy}
              leading={<IconCopyOutline width={20} height={20} />}
            />
          </Tooltip>
        )}
        <JsonViewerInner {...innerProps} />
      </div>
    </div>
  );
};
