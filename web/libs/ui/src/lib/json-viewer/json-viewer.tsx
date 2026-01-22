import { type FC, useCallback, useMemo, useState } from "react";
import { JsonEditor, defaultTheme, matchNode } from "json-edit-react";
import { Button } from "../button/button";
import { Tooltip } from "../Tooltip/Tooltip";
import { IconCopy, IconSearch } from "@humansignal/icons";
import type { JsonViewerProps } from "./types";
import styles from "./json-viewer.module.scss";

// Custom Label Studio theme for json-edit-react
const labelStudioTheme = {
  ...defaultTheme,
  displayName: "Label Studio",
  fragments: {
    ...defaultTheme.fragments,
    edit: "var(--color-primary-content)",
    add: "var(--color-positive-content)",
    del: "var(--color-negative-content)",
    brackets: "var(--color-accent-grape-base)",
    keys: "var(--color-primary-content)",
    values: {
      ...defaultTheme.fragments.values,
      string: "var(--color-accent-kale-bold)",
      number: "var(--color-accent-grape-bold)",
      boolean: "var(--color-accent-canteloupe-bold)",
      null: "var(--color-neutral-content-subtler)",
    },
  },
  styles: {
    ...defaultTheme.styles,
    container: {
      backgroundColor: "var(--color-neutral-surface-inset)",
      color: "var(--color-neutral-content)",
    },
    collection: {
      ...defaultTheme.styles.collection,
      backgroundColor: "var(--color-neutral-surface-inset)",
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
  maxHeight = 500,
  onCopy,
  className = "",
}) => {
  const [searchText, setSearchText] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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

    const filterConfig = customFilters.find((f) => f.id === activeFilter);
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
  }, [activeFilter, customFilters]);

  const handleFilterClick = useCallback((filterId: string) => {
    setActiveFilter((prev) => (prev === filterId ? null : filterId));
  }, []);

  const content = useMemo(
    () => (
      <div className={styles.jsonViewer}>
        {(showSearch || customFilters.length > 0) && (
          <div className={styles.controls}>
            <div className={styles.leftControls}>
              {showSearch && (
                <div className={styles.searchWrapper}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search JSON keys and values..."
                    value={searchText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                    className={styles.searchInput}
                    aria-label="Search JSON"
                  />
                </div>
              )}
              {customFilters.length > 0 && (
                <div className={styles.filters}>
                  {customFilters.map((filter) => (
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
                    <Button look="outlined" variant="neutral" size="small" onClick={() => setActiveFilter(null)}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className={styles.rightControls}>
              <Tooltip title={copied ? "Copied!" : "Copy JSON"}>
                <Button
                  look="outlined"
                  variant="neutral"
                  size="small"
                  onClick={handleCopy}
                  leading={<IconCopy size={24} />}
                >
                  Copy
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
        <div
          className={`${styles.jsonEditorContainer} bg-neutral-surface-inset rounded-small overflow-auto`}
          style={{ maxHeight }}
        >
          <JsonEditor
            data={data}
            restrictEdit={viewOnly}
            restrictDelete={viewOnly}
            restrictAdd={viewOnly}
            searchText={searchText}
            searchFilter={searchFilter}
            theme={labelStudioTheme}
            collapse={false}
            showCollectionCount={true}
            minWidth="100%"
            maxWidth="100%"
            enableClipboard={true}
          />
        </div>
      </div>
    ),
    [
      activeFilter,
      copied,
      customFilters,
      data,
      handleCopy,
      handleFilterClick,
      maxHeight,
      searchFilter,
      searchText,
      showSearch,
      styles.controls,
      styles.filters,
      styles.jsonEditorContainer,
      styles.jsonViewer,
      styles.leftControls,
      styles.rightControls,
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
