import { clsx } from "clsx";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { JsonEditor, defaultTheme, matchNode } from "json-edit-react";
import { IconSearch, IconReset, IconClose, IconCopyOutline } from "@humansignal/icons";
import { Button } from "../button/button";
import { Tooltip } from "../Tooltip/Tooltip";
import type { JsonViewerProps } from "./types";
import { ReaderViewButton } from "./reader-view-button";
import styles from "./json-viewer.module.scss";

// Custom Label Studio theme for json-edit-react
// Note: Colors are applied via SCSS using :global selectors because
// json-edit-react doesn't support CSS variables in theme configuration
const labelStudioTheme = {
  ...defaultTheme,
  displayName: "Label Studio",
  styles: {
    ...defaultTheme.styles,
    container: {
      backgroundColor: "var(--json-viewer-background)",
      color: "var(--color-neutral-content)",
    },
    collection: {
      ...((defaultTheme.styles as any).collection || {}),
      backgroundColor: "var(--json-viewer-collection-background)",
    },
  },
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

  const [collapseDepth, setCollapseDepth] = useState<number | boolean>(false);
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
        return matchNode(nodeData, searchTerm);
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

      // Always expand all nodes when a filter is applied so filtered results are visible
      setCollapseDepth(Number.POSITIVE_INFINITY);
      setResetKey((prev) => prev + 1);
    },
    [storageKey],
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

  // Custom buttons for Reader View
  // Note: Type assertion is required because json-edit-react's CustomButtonDefinition
  // expects an onClick prop, but our ReaderViewButton handles clicks internally
  const customButtons = useMemo(() => {
    if (!readerViewThreshold || readerViewThreshold <= 0) {
      return undefined;
    }

    return [
      {
        Element: (props: any) => <ReaderViewButton {...props} threshold={readerViewThreshold} />,
      },
    ] as any;
  }, [readerViewThreshold]);

  // Custom icons using Label Studio's icon library
  const customIcons = useMemo(
    () => ({
      copy: <IconCopyOutline width={20} height={20} />,
    }),
    [],
  );

  return (
    <div className={className}>
      <div className={styles.jsonViewer} style={{ minHeight }}>
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
        <div className={clsx(styles.jsonEditorContainer, inset && styles.inset)} style={{ minHeight, maxHeight }}>
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
          <JsonEditor
            key={resetKey}
            data={data}
            restrictEdit={viewOnly}
            restrictDelete={viewOnly}
            restrictAdd={viewOnly}
            searchText={searchText}
            searchFilter={searchFilter}
            theme={labelStudioTheme}
            collapse={collapseDepth}
            showCollectionCount={true}
            minWidth="100%"
            maxWidth="100%"
            rootFontSize={fontSize}
            stringTruncate={stringTruncate}
            enableClipboard={true}
            icons={customIcons}
            customButtons={customButtons}
          />
        </div>
      </div>
    </div>
  );
};
