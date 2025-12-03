import { useMemo } from "react";
import { observer } from "mobx-react";
import { Button, IconChevronLeft, IconChevronRight, Tooltip } from "@humansignal/ui";
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

  // Check if user has submitted an annotation (pk is defined means annotation is in database)
  const hasSubmittedAnnotation = isDefined(store.annotationStore.selected.pk);

  // If task cannot be skipped and user doesn't have force_skip, also disable postpone
  // Note: store.hasInterface("postpone") is set by lsf-sdk based on task.allow_postpone from API
  const canPostpone =
    !hasSubmittedAnnotation &&
    !store.canGoNextTask &&
    (!isFF(FF_LEAP_1173) || store.hasInterface("skip")) &&
    !store.hasInterface("review") &&
    store.hasInterface("postpone") &&
    canSkipOrPostpone;

  // For unskippable tasks, force user to submit annotation before navigating
  // Block both history navigation (next task) and postpone if no annotation submitted
  const requiresAnnotationSubmission = !taskAllowSkip && !hasForceSkipPermission && !hasSubmittedAnnotation;
  const canNavigateNext = store.canGoNextTask && !requiresAnnotationSubmission;
  const canPostponeTask = canPostpone && !requiresAnnotationSubmission;

  // Memoized messages for previous button
  const prevButtonMessage = useMemo(() => {
    return !store.canGoPrevTask ? "No previous task" : "Previous task";
  }, [store.canGoPrevTask]);

  // Memoized messages for next button
  const nextButtonMessage = useMemo(() => {
    if (requiresAnnotationSubmission) {
      return "Submit an annotation to continue";
    }
    if (canNavigateNext) {
      return "Next task";
    }
    if (canPostponeTask) {
      return "Postpone task";
    }
    if (!canSkipOrPostpone) {
      return "Cannot postpone: task cannot be skipped";
    }
    return "No next task available";
  }, [requiresAnnotationSubmission, canNavigateNext, canPostponeTask, canSkipOrPostpone]);

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
            <Tooltip title={prevButtonMessage} alignment="bottom-center">
              <Button
                variant="neutral"
                data-testid="prev-task"
                aria-label={prevButtonMessage}
                disabled={!historyEnabled || !store.canGoPrevTask}
                onClick={store.prevTask}
              >
                <IconChevronLeft />
              </Button>
            </Tooltip>
            <Tooltip title={nextButtonMessage} alignment="bottom-center">
              <Button
                data-testid="next-task"
                aria-label={nextButtonMessage}
                disabled={!canNavigateNext && !canPostponeTask}
                onClick={canNavigateNext ? store.nextTask : store.postponeTask}
                variant={!canNavigateNext && canPostponeTask ? "primary" : "neutral"}
              >
                <IconChevronRight />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
});
