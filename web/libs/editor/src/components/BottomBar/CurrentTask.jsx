import { useMemo } from "react";
import { observer } from "mobx-react";
import { Button, IconChevronLeft, IconChevronRight } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { guidGenerator } from "../../utils/unique";
import { isDefined } from "../../utils/utilities";
import { FF_LEAP_1173, FF_TASK_COUNT_FIX, isFF } from "../../utils/feature-flags";
import "./CurrentTask.scss";

// Manager roles that can force-skip unskippable tasks (OW=Owner, AD=Admin, MA=Manager)
const MANAGER_ROLES = ["OW", "AD", "MA"];

export const CurrentTask = observer(({ store }) => {
  const currentIndex = useMemo(() => {
    return store.taskHistory.findIndex((x) => x.taskId === store.task.id) + 1;
  }, [store.taskHistory]);

  const historyEnabled = store.hasInterface("topbar:prevnext");
  const task = store.task;
  const taskAllowSkip = task?.allow_skip !== false;
  const userRole = window.APP_SETTINGS?.user?.role;
  const hasForceSkipPermission = MANAGER_ROLES.includes(userRole);
  const canSkipOrPostpone = taskAllowSkip || hasForceSkipPermission;

  // If task cannot be skipped and user doesn't have force_skip, also disable postpone
  // Note: store.hasInterface("postpone") is set by lsf-sdk based on task.allow_postpone from API
  const canPostpone =
    !isDefined(store.annotationStore.selected.pk) &&
    !store.canGoNextTask &&
    (!isFF(FF_LEAP_1173) || store.hasInterface("skip")) &&
    !store.hasInterface("review") &&
    store.hasInterface("postpone") &&
    canSkipOrPostpone;

  return (
    <div className={cn("bottombar").elem("section").toClassName()}>
      <div className={cn("current-task").mod({ "with-history": historyEnabled }).toClassName()}>
        <div className={cn("current-task").elem("task-id").toClassName()}>
          {store.task.id ?? guidGenerator()}
          {historyEnabled &&
            (isFF(FF_TASK_COUNT_FIX) ? (
              <div className={cn("current-task").elem("task-count").toClassName()}>
                {store.queuePosition} of {store.queueTotal}
              </div>
            ) : (
              <div className={cn("current-task").elem("task-count").toClassName()}>
                {currentIndex} of {store.taskHistory.length}
              </div>
            ))}
        </div>
        {historyEnabled && (
          <div className={cn("current-task").elem("history-controls").toClassName()}>
            <Button
              variant="neutral"
              data-testid="prev-task"
              disabled={!historyEnabled || !store.canGoPrevTask}
              onClick={store.prevTask}
              tooltip={!store.canGoPrevTask ? "No previous task" : "Previous task"}
            >
              <IconChevronLeft />
            </Button>
            <Button
              data-testid="next-task"
              disabled={!store.canGoNextTask && !canPostpone}
              onClick={store.canGoNextTask ? store.nextTask : store.postponeTask}
              variant={!store.canGoNextTask && canPostpone ? "primary" : "neutral"}
              tooltip={
                store.canGoNextTask
                  ? "Next task"
                  : canPostpone
                    ? "Postpone task"
                    : !canSkipOrPostpone
                      ? "Cannot postpone: task cannot be skipped"
                      : "No next task available"
              }
            >
              <IconChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
