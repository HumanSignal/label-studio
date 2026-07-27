import { type FC, useCallback } from "react";
import { getRoot } from "mobx-state-tree";
import { IconBraces, IconCopyOutline, IconUserStats, IntersectSquareIcon } from "@humansignal/icons";
// @ts-expect-error - Menu is from JS module
import { Menu } from "../../Menu/Menu";
import { modal } from "../../Modal/Modal";
import { TaskSourceViewer, getTaskSourceViewerStorageKey } from "../../TaskSourceViewer";
// @ts-expect-error - utils is JS module
import { getProperty } from "../utils";

export interface RowContextMenuProps {
  /** Task data object */
  row: any;
  /** Currently clicked column (for copy cell content) */
  column?: any;
  /** DataManager view store for navigation */
  view: any;
  /** API object from useSDK hook */
  api?: any;
  /** SDK type (e.g., "DE" for Data Explorer) */
  sdkType?: string;
  /** LSE-only callback for viewing analytics */
  onViewAnalytics?: (row: any) => void;
  /** Callback when menu closes */
  onClose: () => void;
  /** Optional project ID for project-scoped TaskSourceViewer storage */
  projectId?: string | number | null;
}

/**
 * Domain menu content for DM row context menus.
 * Open/close/positioning is owned by the table-level `useContextMenu` host —
 * this component intentionally does not wrap Dropdown.
 */
export const RowContextMenu: FC<RowContextMenuProps> = ({
  row,
  column,
  view,
  api,
  sdkType,
  onViewAnalytics,
  onClose,
  projectId,
}) => {
  // Columns that should not have copy cell content option
  const excludedColumns = [
    "select",
    "show-source",
    "tasks:id", // ID has its own "Copy task ID" option
    "tasks:annotators", // Annotated by
    "tasks:draft_exists", // Drafts
  ];

  // Get the actual cell value for copying (must be declared before callbacks that use it)
  // For copying, we want the raw data, not the formatted/truncated display value
  // First try to get the raw value from the row data using the column's original field
  // If that's not available, fall back to the accessor function or getProperty
  const cellValue = column
    ? (() => {
        // Try to get the raw value from the original field (e.g., "tasks:annotations_results" -> "annotations_results")
        const fieldName = column.id?.includes(":") ? column.id.split(":")[1] : column.id;
        const rawValue = row[fieldName];

        // If we have a raw value and it's different from what the accessor returns, use the raw value
        if (rawValue !== undefined && rawValue !== null) {
          return rawValue;
        }

        // Otherwise fall back to the accessor/getProperty
        return typeof column.accessor === "function" ? column.accessor(row) : getProperty(row, column.id);
      })()
    : null;

  // Helper to show toast notifications via DataManager
  const showToast = useCallback(
    (message: string, type: "info" | "error" = "info") => {
      const root = getRoot(view) as any;
      if (root?.SDK?.invoke) {
        root.SDK.invoke("toast", { message, type });
      } else {
        // Fallback for development
        console.warn(`[Toast] ${message}`);
      }
    },
    [view],
  );

  // 1. Compare all annotations
  const handleCompareAnnotations = useCallback(() => {
    (getRoot(view) as any).startLabeling(row, { interface: "annotations:view-all" });
    onClose();
  }, [row, view, onClose]);

  // 2. Copy cell content
  const handleCopyCellContent = useCallback(async () => {
    if (cellValue == null || (typeof cellValue === "string" && cellValue.trim() === "")) {
      showToast("No content to copy", "error");
      onClose();
      return;
    }

    try {
      // For annotations_results and predictions_results, fetch full data from API if truncated
      // The backend's GroupConcat has a max length that truncates long results
      const fieldName = column?.id?.includes(":") ? column.id.split(":")[1] : column?.id;
      const isAnnotationsOrPredictions = fieldName === "annotations_results" || fieldName === "predictions_results";

      let textToCopy = typeof cellValue === "string" ? cellValue : String(cellValue);

      // If annotations/predictions appear truncated, fetch full data from API
      if (isAnnotationsOrPredictions && textToCopy.length > 0 && !textToCopy.endsWith("]")) {
        const taskId = row.id ?? row.task_id;
        const root = getRoot(view) as any;

        if (root?.apiCall) {
          try {
            const fullTask = await root.apiCall("task", { taskID: taskId });

            if (fieldName === "annotations_results" && fullTask.annotations) {
              const results = fullTask.annotations.map((ann: any) => JSON.stringify(ann.result));
              textToCopy = `[${results.join(", ")}]`;
            } else if (fieldName === "predictions_results" && fullTask.predictions) {
              const results = fullTask.predictions.map((pred: any) => JSON.stringify(pred.result));
              textToCopy = `[${results.join(", ")}]`;
            }
          } catch (error) {
            console.warn("[RowContextMenu] Failed to fetch full task data:", error);
          }
        }
      }

      await navigator.clipboard.writeText(textToCopy);

      const taskId = row.id ?? row.task_id;
      const columnName = column?.title || column?.alias || "content";
      showToast(`Copied "${columnName}" for Task ${taskId} to clipboard`, "info");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
    onClose();
  }, [cellValue, column, row, onClose, showToast, view]);

  // 3. Copy task ID
  const handleCopyTaskId = useCallback(async () => {
    const taskId = row.id ?? row.task_id;

    if (!taskId) {
      showToast("Task ID not found", "error");
      onClose();
      return;
    }

    try {
      await navigator.clipboard.writeText(String(taskId));
      showToast(`Copied Task ID ${taskId} to clipboard`, "info");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
    onClose();
  }, [row, onClose, showToast]);

  // 4. View task source
  const handleViewTaskSource = useCallback(() => {
    // Parse and structure task data the same way as the show-source button
    let taskData = JSON.parse(row.source ?? "{}");

    taskData = {
      id: taskData?.id,
      data: taskData?.data,
      annotations: taskData?.annotations,
      predictions: taskData?.predictions,
    };

    const taskId = taskData.id;

    const onTaskLoad = async (options: any = {}) => {
      const response = await api.task({
        taskID: taskId,
        resolve_uri: options.resolveUri ?? false,
      });
      return response ?? {};
    };

    const modalInstance = modal({
      title: `Source for task ${taskId}`,
      style: { width: 900 },
      header: null, // Will be set by renderToggle
      body: (
        <TaskSourceViewer
          content={taskData}
          onTaskLoad={onTaskLoad}
          sdkType={sdkType}
          storageKey={getTaskSourceViewerStorageKey(projectId)}
          renderToggle={(toggle) => {
            // Update modal header with toggle
            modalInstance?.update({ header: toggle });
          }}
        />
      ),
    });

    onClose();
  }, [row, api, sdkType, onClose, projectId]);

  // 5. View annotator performance (LSE-only)
  const handleViewAnalytics = useCallback(() => {
    if (onViewAnalytics) {
      onViewAnalytics(row);
      onClose();
    }
  }, [row, onViewAnalytics, onClose]);

  // Check if cell content can be copied
  const canCopyCellContent = column && column.id && !excludedColumns.includes(column.id) && cellValue != null;

  // Check if task has annotators (for View Annotator Performance)
  // Use annotators array which only contains actual annotators, not predictions
  const hasAnnotators = row.annotators && row.annotators.length > 0;
  const annotatorCount = row.annotators?.length ?? 0;
  const annotatorLabel = annotatorCount === 1 ? "Annotator" : "Annotators";

  return (
    <Menu closeDropdownOnItemClick={true} className="row-context-menu">
      <Menu.Item
        onClick={handleCompareAnnotations}
        data-testid="menu-item-compare-annotations"
        icon={<IntersectSquareIcon size="20" />}
      >
        Compare All Annotations
      </Menu.Item>

      <Menu.Divider />

      {canCopyCellContent && (
        <Menu.Item onClick={handleCopyCellContent} data-testid="menu-item-copy-cell" icon={<IconCopyOutline />}>
          Copy Cell Contents
        </Menu.Item>
      )}

      <Menu.Item onClick={handleCopyTaskId} data-testid="menu-item-copy-task-id" icon={<IconCopyOutline />}>
        Copy Task ID
      </Menu.Item>

      <Menu.Item onClick={handleViewTaskSource} data-testid="menu-item-view-source" icon={<IconBraces />}>
        View Task Source
      </Menu.Item>

      {onViewAnalytics && hasAnnotators && (
        <>
          <Menu.Divider />
          <Menu.Item onClick={handleViewAnalytics} data-testid="menu-item-view-analytics" icon={<IconUserStats />}>
            View {annotatorLabel} Performance
          </Menu.Item>
        </>
      )}
    </Menu>
  );
};
