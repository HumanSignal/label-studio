import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { JsonEditor, defaultTheme, matchNode } from "json-edit-react";
import { Button } from "../button/button";
import { Tooltip } from "../Tooltip/Tooltip";
import { Typography } from "../typography/typography";
import { IconSearch, IconFilter, IconReset, IconClose, IconCopyOutline } from "@humansignal/icons";
import type { FilterConfig, JsonViewerProps } from "./types";
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
  data,
  viewOnly = true,
  showSearch = true,
  customFilters = [],
  minHeight = 500,
  maxHeight = 500,
  fontSize = 14,
  stringTruncate,
  onCopy,
  className = "",
  readerViewThreshold = 100,
  storageKey,
}) => {
  // Initialize state from localStorage if storageKey is provided
  const [searchText, setSearchText] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}:search`);
      return saved || "";
    }
    return "";
  });

  const [copied, setCopied] = useState(false);

  const [activeFilter, setActiveFilter] = useState<string | null>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}:filter`);
      return saved || null;
    }
    return null;
  });

  const [collapseDepth, setCollapseDepth] = useState<number | boolean>(false);
  const [resetKey, setResetKey] = useState(0);

  // Built-in filters
  const builtInFilters: FilterConfig[] = useMemo(
    () => [
      {
        id: "all",
        label: "All",
        filterFn: () => true, // Show everything
      },
    ],
    [],
  );

  // Combine built-in and custom filters
  const allFilters = useMemo(() => [...builtInFilters, ...customFilters], [builtInFilters, customFilters]);

  // Format JSON for copying
  const jsonString = useMemo(() => {
    return data ? JSON.stringify(data, null, 2) : "";
  }, [data]);

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

        const newFilter = filterId;

        // Save to localStorage
        if (storageKey) {
          localStorage.setItem(`${storageKey}:filter`, newFilter);
        }

        return newFilter;
      });

      // Always expand all nodes when a filter is applied so filtered results are visible
      // Use Number.POSITIVE_INFINITY to expand all levels
      setCollapseDepth(Number.POSITIVE_INFINITY);
      setResetKey((prev) => prev + 1); // Force remount to reset collapse state
    },
    [storageKey],
  );

  const handleResetFilters = useCallback(() => {
    setActiveFilter(null);
    setSearchText("");
    setCollapseDepth(Number.POSITIVE_INFINITY); // Expand all nodes at all levels
    setResetKey((prev) => prev + 1); // Force remount to reset collapse state

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
  const customButtons = useMemo(() => {
    if (!readerViewThreshold || readerViewThreshold <= 0) {
      return undefined;
    }

    return [
      {
        Element: (props: any) => <ReaderViewButton {...props} threshold={readerViewThreshold} />,
      },
    ] as any; // Type assertion needed as json-edit-react's CustomButtonDefinition requires onClick
  }, [readerViewThreshold]);

  // Custom icons using Label Studio's icon library
  const customIcons = useMemo(
    () => ({
      copy: <IconCopyOutline width={20} height={20} />,
    }),
    [],
  );

  const content = useMemo(
    () => (
      <div className={styles.jsonViewer} style={{ minHeight }}>
        {(showSearch || allFilters.length > 0) && (
          <div className={styles.controls}>
            <div className={styles.leftControls}>
              {showSearch && (
                <div className={styles.searchWrapper}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search keys or value"
                    value={searchText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                    className={styles.searchInput}
                    aria-label="Search JSON"
                  />
                  {searchText && (
                    <Tooltip title="Clear Search">
                      <Button
                        look="outlined"
                        variant="neutral"
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
              {allFilters.length > 0 && (
                <>
                  <div className={styles.filterLabel}>
                    <IconFilter className={styles.filterIcon} width={24} height={24} />
                    <Typography variant="label" size="small" className={styles.filterLabelText}>
                      Quick Filters:
                    </Typography>
                  </div>
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
                </>
              )}
            </div>
          </div>
        )}
        <div className={styles.jsonEditorContainer} style={{ minHeight, maxHeight }}>
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
    ),
    [
      activeFilter,
      allFilters,
      collapseDepth,
      copied,
      customButtons,
      customIcons,
      data,
      fontSize,
      handleCopy,
      handleFilterClick,
      handleResetFilters,
      minHeight,
      maxHeight,
      resetKey,
      searchFilter,
      searchText,
      showSearch,
      stringTruncate,
      styles.controls,
      styles.copyButton,
      styles.filterIcon,
      styles.filterLabel,
      styles.filterLabelText,
      styles.filters,
      styles.jsonEditorContainer,
      styles.jsonViewer,
      styles.leftControls,
      styles.rightControls,
      styles.searchClear,
      styles.searchIcon,
      styles.searchInput,
      styles.searchWrapper,
      viewOnly,
    ],
  );

  return (
    <div className={className} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      {content}
    </div>
  );
};
