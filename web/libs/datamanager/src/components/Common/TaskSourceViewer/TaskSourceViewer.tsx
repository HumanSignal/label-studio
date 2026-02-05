import { type ChangeEvent, type FC, useEffect, useState, useCallback } from "react";
import { JsonViewer, type FilterConfig, Toggle } from "@humansignal/ui";
import { FF_LOPS_E_3, FF_INTERACTIVE_JSON_VIEWER, isFF } from "../../../utils/feature-flags";
import { CodeView } from "./CodeView";
import styles from "./TaskSourceViewer.module.scss";
import { ViewToggle, type ViewMode } from "./ViewToggle";

export type { ViewMode };

/** Options passed to onTaskLoad callback */
export interface TaskLoadOptions {
  /** Whether to resolve storage URIs to proxy URLs (default: false) */
  resolveUri?: boolean;
}

export interface TaskSourceViewerProps {
  /** Task content data */
  content: any;
  /** Function to load full task data */
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

  // Manage view state internally
  const [view, setView] = useState<ViewMode>(() =>
    storageKey ? (localStorage.getItem(`${storageKey}:view`) as ViewMode) || "code" : "code",
  );

  // Manage resolve URIs state - default OFF to show original storage URIs
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

  // Load full task data
  useEffect(() => {
    onTaskLoad({ resolveUri: resolveUrls }).then((response) => {
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

      setTaskData(formatted);
    });
  }, [onTaskLoad, sdkType, resolveUrls]);

  // Handle resolve URIs toggle change
  const handleResolveUrlsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.checked;
      setResolveUrls(newValue);
      if (storageKey) {
        localStorage.setItem(`${storageKey}:resolveUrls`, String(newValue));
      }
    },
    [storageKey],
  );

  // Provide toggle to external render location (e.g., modal header)
  useEffect(() => {
    if (renderToggle && isInteractiveViewerEnabled) {
      renderToggle(<ViewToggle view={view} onViewChange={handleViewChange} />);
    }
  }, [renderToggle, view, handleViewChange, isInteractiveViewerEnabled]);

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
            toolbarExtra={
              <div style={{ marginLeft: "auto" }}>
                <Toggle label="Resolve URIs" checked={resolveUrls} onChange={handleResolveUrlsChange} />
              </div>
            }
          />
        )}
      </div>
    </div>
  );
};
