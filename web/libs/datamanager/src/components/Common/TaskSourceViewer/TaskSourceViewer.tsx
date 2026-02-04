import { type FC, useEffect, useState, useCallback, useRef } from "react";
import { JsonViewer, type FilterConfig } from "@humansignal/ui";
import { FF_LOPS_E_3, FF_INTERACTIVE_JSON_VIEWER, isFF } from "../../../utils/feature-flags";
import { CodeView } from "./CodeView";
import styles from "./TaskSourceViewer.module.scss";
import { ViewToggle, type ViewMode } from "./ViewToggle";

export type { ViewMode };

/** Options passed to onTaskLoad callback */
export interface TaskLoadOptions {
  /** Whether to resolve storage URLs to proxy URLs (default: false) */
  resolveUri?: boolean;
}

export interface TaskSourceViewerProps {
  /** Task content data */
  content: any;
  /**
   * Function to load full task data.
   * @param options - Options including resolveUri to control URL resolution
   * @returns Promise with task data
   */
  onTaskLoad: (options?: TaskLoadOptions) => Promise<any>;
  /** SDK type (e.g., "DE" for Data Explorer) */
  sdkType?: string;
  /** Storage key for localStorage persistence */
  storageKey?: string;
  /** Render toggle in external location (e.g., modal header) */
  renderToggle?: (toggle: React.ReactNode) => void;
}

// Define filters outside component to prevent recreation on every render
const TASK_SOURCE_FILTERS: FilterConfig[] = [
  {
    id: "annotations",
    label: "Annotations",
    filterFn: (nodeData) => {
      const path = nodeData.path;
      return path && path.includes("annotations");
    },
  },
  {
    id: "predictions",
    label: "Predictions",
    filterFn: (nodeData) => {
      const path = nodeData.path;
      return path && path.includes("predictions");
    },
  },
  {
    id: "data",
    label: "Data",
    filterFn: (nodeData) => {
      const path = nodeData.path;
      return path && path.includes("data");
    },
  },
];

/**
 * TaskSourceViewer - Displays task source with code and interactive views
 *
 * Loads task data and provides either code view or interactive JSON viewer.
 * Specific to the Data Manager and should not be part of the reusable UI library.
 *
 * Features:
 * - Code/Interactive view toggle for different JSON display modes
 * - Resolve URLs toggle to show original storage URLs (s3://...) or resolved proxy URLs
 */
export const TaskSourceViewer: FC<TaskSourceViewerProps> = ({
  content,
  onTaskLoad,
  sdkType,
  storageKey = "dm:tasksource",
  renderToggle,
}) => {
  const isInteractiveViewerEnabled = isFF(FF_INTERACTIVE_JSON_VIEWER);

  const [taskData, setTaskData] = useState(content);
  const [isLoading, setIsLoading] = useState(false);

  // Track if this is the initial load to avoid double-fetching
  const isInitialLoadRef = useRef(true);

  // Manage view state internally
  const [view, setView] = useState<ViewMode>(() =>
    storageKey ? (localStorage.getItem(`${storageKey}:view`) as ViewMode) || "code" : "code",
  );

  // Manage resolve URLs state - default OFF to show original storage URLs
  const [resolveUrls, setResolveUrls] = useState<boolean>(() =>
    storageKey ? localStorage.getItem(`${storageKey}:resolveUrls`) === "true" : false,
  );

  const handleViewChange = useCallback(
    (newView: ViewMode) => {
      setView(newView);

      // Save to localStorage
      if (storageKey) {
        localStorage.setItem(`${storageKey}:view`, newView);
      }
    },
    [storageKey],
  );

  const handleResolveUrlsChange = useCallback(
    (newResolveUrls: boolean) => {
      setResolveUrls(newResolveUrls);

      // Save to localStorage
      if (storageKey) {
        localStorage.setItem(`${storageKey}:resolveUrls`, String(newResolveUrls));
      }
    },
    [storageKey],
  );

  /**
   * Format raw API response into display format.
   * Strips annotations/predictions for Data Explorer mode.
   */
  const formatTaskData = useCallback(
    (response: any) => {
      const formatted: any = {
        id: response.id,
        data: response.data,
      };

      // Don't include annotations/predictions for Data Explorer
      if (sdkType !== "DE" && !isFF(FF_LOPS_E_3)) {
        formatted.annotations = response.annotations ?? [];
        formatted.predictions = response.predictions ?? [];
      }

      if (response.state) {
        formatted.state = response.state;
      }

      return formatted;
    },
    [sdkType],
  );

  /**
   * Load task data from API with current resolveUrls setting.
   */
  const loadTaskData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await onTaskLoad({ resolveUri: resolveUrls });
      setTaskData(formatTaskData(response));
    } finally {
      setIsLoading(false);
    }
  }, [onTaskLoad, resolveUrls, formatTaskData]);

  // Initial load
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      loadTaskData();
    }
  }, [loadTaskData]);

  // Reload when resolveUrls changes (but not on initial load)
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      loadTaskData();
    }
  }, [resolveUrls]); // eslint-disable-line react-hooks/exhaustive-deps

  // Provide toggle to external render location (e.g., modal header)
  useEffect(() => {
    if (renderToggle && isInteractiveViewerEnabled) {
      renderToggle(
        <ViewToggle
          view={view}
          onViewChange={handleViewChange}
          resolveUrls={resolveUrls}
          onResolveUrlsChange={handleResolveUrlsChange}
        />,
      );
    }
  }, [renderToggle, view, handleViewChange, resolveUrls, handleResolveUrlsChange, isInteractiveViewerEnabled]);

  return (
    <div className={styles.taskSourceView}>
      <div className={styles.viewContent}>
        {view === "code" ? (
          <CodeView data={taskData} />
        ) : (
          <JsonViewer
            data={taskData}
            inset={true}
            viewOnly={true}
            showSearch={true}
            customFilters={TASK_SOURCE_FILTERS}
            minHeight={560}
            maxHeight={560}
            readerViewThreshold={100}
            storageKey={storageKey}
          />
        )}
      </div>
    </div>
  );
};
