import { type FC, useCallback } from "react";
import { getRoot } from "mobx-state-tree";
import { Dropdown } from "@humansignal/ui";
// @ts-expect-error - Menu is from JS module
import { Menu } from "../../Menu/Menu";
import { modal } from "../../Modal/Modal";
import { TaskSourceViewer } from "../../TaskSourceViewer";
// @ts-expect-error - utils is JS module
import { getProperty } from "../utils";
import styles from "./RowContextMenu.module.scss";

export interface RowContextMenuProps {
  /** Task data object */
  row: any;
  /** Currently clicked column (for copy cell content) */
  column?: any;
  /** DataManager view store for navigation */
  view: any;
  /** LSE-only callback for viewing analytics */
  onViewAnalytics?: (row: any) => void;
  /** Callback when menu closes */
  onClose: () => void;
}

export const RowContextMenu: FC<RowContextMenuProps> = ({ row, column, view, onViewAnalytics, onClose }) => {
  // Columns that should not have copy cell content option
  const excludedColumns = [
    "select",
    "show-source",
    "tasks:id", // ID has its own "Copy task ID" option
    "tasks:annotators", // Annotated by
    "tasks:reviewers", // Reviewed by
    "tasks:reviewed", // Reviewed
    "tasks:draft_exists", // Drafts
    "tasks:ground_truth", // Ground Truth
    "tasks:allow_skip", // Allow Skip
  ];

  // Get the actual cell value for copying (must be declared before callbacks that use it)
  // Use the column's accessor function if available, otherwise try getProperty
  const cellValue = column
    ? typeof column.accessor === "function"
      ? column.accessor(row)
      : getProperty(row, column.id)
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
    if (!cellValue) {
      showToast("No content to copy", "error");
      onClose();
      return;
    }

    try {
      // Convert value to string for copying
      const textToCopy = typeof cellValue === "string" ? cellValue : String(cellValue);
      await navigator.clipboard.writeText(textToCopy);

      const taskId = row.id ?? row.task_id;
      const columnName = column?.title || column?.alias || "content";
      showToast(`Copied "${columnName}" for Task ${taskId} to clipboard`, "info");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
    onClose();
  }, [cellValue, column, row, onClose, showToast]);

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
    const taskId = row.id ?? row.task_id;

    // Get API from view
    const api = (view as any).api;

    const onTaskLoad = async (options: any = {}) => {
      const response = await api.task({
        taskID: taskId,
        resolve_uri: options.resolveUri ?? false,
      });
      return response ?? {};
    };

    const taskData = row.source ? JSON.parse(row.source) : row;

    modal({
      title: `Source for task ${taskId}`,
      style: { width: 900 },
      body: (
        <TaskSourceViewer
          content={taskData}
          onTaskLoad={onTaskLoad}
          sdkType={(view as any).SDK?.type}
          storageKey="dm:tasksource"
        />
      ),
    });

    onClose();
  }, [row, view, onClose]);

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

  return (
    <Dropdown inline visible={true} animated={false}>
      <Menu className={styles.menu} closeDropdownOnItemClick={true}>
        <Menu.Item onClick={handleCompareAnnotations} data-testid="menu-item-compare-annotations">
          Compare All Annotations
        </Menu.Item>

        <Menu.Divider />

        {canCopyCellContent && (
          <Menu.Item onClick={handleCopyCellContent} data-testid="menu-item-copy-cell">
            Copy Cell Contents
          </Menu.Item>
        )}

        <Menu.Item onClick={handleCopyTaskId} data-testid="menu-item-copy-task-id">
          Copy Task ID
        </Menu.Item>

        <Menu.Item onClick={handleViewTaskSource} data-testid="menu-item-view-source">
          View Task Source
        </Menu.Item>

        {onViewAnalytics && hasAnnotators && (
          <>
            <Menu.Divider />
            <Menu.Item onClick={handleViewAnalytics} data-testid="menu-item-view-analytics">
              View Annotator Performance
            </Menu.Item>
          </>
        )}
      </Menu>
    </Dropdown>
  );
};
