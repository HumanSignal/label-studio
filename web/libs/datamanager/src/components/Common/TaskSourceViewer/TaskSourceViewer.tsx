import { type FC, useCallback, useEffect, useState } from "react";
import { JsonViewer, type FilterConfig, ToggleItems } from "@humansignal/ui";
import { FF_LOPS_E_3, FF_INTERACTIVE_JSON_VIEWER, isFF } from "../../../utils/feature-flags";
import { CodeView } from "./CodeView";
import styles from "./TaskSourceViewer.module.scss";

export interface TaskSourceViewerProps {
  /** Task content data */
  content: any;
  /** Function to load full task data */
  onTaskLoad: () => Promise<any>;
  /** SDK type (e.g., "DE" for Data Explorer) */
  sdkType?: string;
}

type ViewMode = "code" | "interactive";

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
];

/**
 * TaskSourceViewer - Displays task source with code and interactive views
 *
 * Loads task data and provides a toggle between code view and interactive JSON viewer.
 * Specific to the Data Manager and should not be part of the reusable UI library.
 */
export const TaskSourceViewer: FC<TaskSourceViewerProps> = ({ content, onTaskLoad, sdkType }) => {
  const storageKey = "dm:tasksource";
  const customFilters = TASK_SOURCE_FILTERS;
  const isInteractiveViewerEnabled = isFF(FF_INTERACTIVE_JSON_VIEWER);

  const [taskData, setTaskData] = useState(content);
  const [view, setView] = useState<ViewMode>(() => {
    if (storageKey && isInteractiveViewerEnabled) {
      const saved = localStorage.getItem(`${storageKey}:view`);
      return (saved as ViewMode) || "code";
    }
    return "code";
  });

  // Load full task data
  useEffect(() => {
    onTaskLoad().then((response) => {
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
  }, [onTaskLoad, sdkType]);

  // Save view preference to localStorage
  useEffect(() => {
    if (storageKey && isInteractiveViewerEnabled) {
      localStorage.setItem(`${storageKey}:view`, view);
    }
  }, [view, storageKey, isInteractiveViewerEnabled]);

  // If feature flag is disabled, show simple code view
  if (!isInteractiveViewerEnabled) {
    return <CodeView data={taskData} />;
  }

  // Feature flag enabled: Show toggle with code + interactive views

  const handleViewChange = useCallback((v: string) => {
    setView(v as ViewMode);
  }, []);

  return (
    <div className={styles.taskSourceView}>
      <ToggleItems
        items={{ code: "Code", interactive: "Interactive" }}
        active={view}
        onSelect={handleViewChange}
        className={styles.viewToggle}
      />
      <div className={styles.viewContent}>
        {view === "code" ? (
          <CodeView data={taskData} />
        ) : (
          <JsonViewer data={taskData} viewOnly={true} showSearch={true} customFilters={customFilters} maxHeight={500} />
        )}
      </div>
    </div>
  );
};
