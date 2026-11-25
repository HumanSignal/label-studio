import { type ReactNode, useRef, useState } from "react";
import { ModalWindow, Typography } from "@humansignal/ui";
import { type TaskLoadOptions, TaskSourceViewer } from "./TaskSourceViewer";

/** The task to show in the source dialog: the row's task data and how to load the full task. */
export type TaskSource = {
  task: { id?: number | string; [key: string]: unknown };
  onTaskLoad: (options?: TaskLoadOptions) => Promise<any>;
};

/** A task's source in a dialog, with the Code / Interactive toggle in its header. */
export const TaskSourceDialog = ({
  source,
  storageKey,
  onClose,
}: {
  /** The task to show; `null` closes the dialog. */
  source: TaskSource | null;
  storageKey?: string;
  onClose: () => void;
}) => {
  const [toggle, setToggle] = useState<ReactNode>(null);
  const shown = useRef(source);
  if (source) shown.current = source;
  const title = `Source for task ${shown.current?.task?.id ?? ""}`;

  return (
    <ModalWindow
      open={source !== null}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      header={
        <div className="flex items-center justify-between gap-base">
          <Typography variant="title" size="large" className="text-neutral-content" data-testid="modal-window-title">
            {title}
          </Typography>
          {toggle}
        </div>
      }
      size="large"
      dataTestId="task-source-modal"
    >
      {source && (
        <TaskSourceViewer
          content={source.task}
          onTaskLoad={source.onTaskLoad}
          storageKey={storageKey}
          renderToggle={setToggle}
        />
      )}
    </ModalWindow>
  );
};
