import { useMemo } from "react";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { Button, IconChevronLeft, IconChevronRight, Tooltip } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { FF_DEV_4174, FF_LEAP_1173, FF_TASK_COUNT_FIX, isFF } from "../../utils/feature-flags";
import { guidGenerator } from "../../utils/unique";
import { isDefined } from "../../utils/utilities";
import "./CurrentTask.scss";
import { reaction } from "mobx";

// Manager roles that can force-skip unskippable tasks (OW=Owner, AD=Admin, MA=Manager)
const MANAGER_ROLES = ["OW", "AD", "MA"];

export const CurrentTask = observer(({ store }) => {
  const currentIndex = useMemo(() => {
    return store.taskHistory.findIndex((x) => x.taskId === store.task.id) + 1;
  }, [store.taskHistory]);

  const [initialCommentLength, setInitialCommentLength] = useState(0);
  const [visibleComments, setVisibleComments] = useState(0);

  useEffect(() => {
    store.commentStore.setAddedCommentThisSession(false);

    const reactionDisposer = reaction(
      () => store.commentStore.comments.map((item) => item.isDeleted),
      (result) => {
        setVisibleComments(result.filter((item) => !item).length);
      },
    );

    return () => {
      reactionDisposer?.();
    };
  }, []);

  useEffect(() => {
    if (store.commentStore.addedCommentThisSession) {
      setInitialCommentLength(visibleComments);
    }
  }, [store.commentStore.addedCommentThisSession]);

  const historyEnabled = store.hasInterface("topbar:prevnext");
  const showCounter = store.hasInterface("topbar:task-counter");

  const task = store.task;
  const isEnterprise = window.APP_SETTINGS?.billing?.enterprise;
  const skipDisabled = isEnterprise ? task?.allow_skip === false : false;
  const userRole = window.APP_SETTINGS?.user?.role;
  const hasForceSkipPermission = MANAGER_ROLES.includes(userRole);
  const canSkipOrPostpone = !skipDisabled || hasForceSkipPermission;

  // Check if user has submitted an annotation (pk is defined means annotation is in database)
  const hasSubmittedAnnotation = isDefined(store.annotationStore.selected.pk);

  // If task cannot be skipped and user doesn't have force_skip, also disable postpone
  // Note: store.hasInterface("postpone") is set by lsf-sdk based on task.allow_postpone from API
  let canPostpone =
    !hasSubmittedAnnotation &&
    !store.canGoNextTask &&
    (!isFF(FF_LEAP_1173) || store.hasInterface("skip")) &&
    !store.hasInterface("review") &&
    store.hasInterface("postpone") &&
    canSkipOrPostpone;

  // For unskippable tasks, force user to submit annotation before navigating
  // Block both history navigation (next task) and postpone if no annotation submitted
  const requiresAnnotationSubmission = skipDisabled && !hasForceSkipPermission && !hasSubmittedAnnotation;
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

  if (store.hasInterface("annotations:comments") && isFF(FF_DEV_4174)) {
    canPostpone = canPostpone && store.commentStore.addedCommentThisSession && visibleComments >= initialCommentLength;
  }

  return (
    <div className={cn("bottombar").elem("section").toClassName()}>
      <div className={cn("current-task").mod({ "with-history": historyEnabled }).toClassName()}>
        <div className={cn("current-task").elem("task-id").toClassName()}>
          {store.task.id ?? guidGenerator()}
          {historyEnabled &&
            showCounter &&
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
          <div className={cn("current-task").elem("history-controls").mod({ newui: true }).toClassName()}>
            <Tooltip title={prevButtonMessage}>
              <Button
                data-testid="prev-task"
                aria-label={prevButtonMessage}
                look="string"
                disabled={!historyEnabled || !store.canGoPrevTask}
                onClick={store.prevTask}
                variant="neutral"
                leading={<IconChevronLeft />}
                size="small"
              />
            </Tooltip>
            <Tooltip title={nextButtonMessage}>
              <Button
                data-testid="next-task"
                aria-label={nextButtonMessage}
                look="string"
                disabled={!canNavigateNext && !canPostponeTask}
                onClick={canNavigateNext ? store.nextTask : store.postponeTask}
                variant={!canNavigateNext && canPostponeTask ? "primary" : "neutral"}
                leading={<IconChevronRight />}
                size="small"
              />
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
});
