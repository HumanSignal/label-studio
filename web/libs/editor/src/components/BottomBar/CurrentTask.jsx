import { useMemo } from "react";
import { observer } from "mobx-react";
import { Button, IconChevronLeft, IconChevronRight } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { guidGenerator } from "../../utils/unique";
import { isDefined } from "../../utils/utilities";
import { FF_LEAP_1173, FF_TASK_COUNT_FIX, isFF } from "../../utils/feature-flags";
import "./CurrentTask.scss";

export const CurrentTask = observer(({ store }) => {
  const currentIndex = useMemo(() => {
    return store.taskHistory.findIndex((x) => x.taskId === store.task.id) + 1;
  }, [store.taskHistory]);

  const historyEnabled = store.hasInterface("topbar:prevnext");

  // @todo some interface?
  const canPostpone =
    !isDefined(store.annotationStore.selected.pk) &&
    !store.canGoNextTask &&
    (!isFF(FF_LEAP_1173) || store.hasInterface("skip")) &&
    !store.hasInterface("review") &&
    store.hasInterface("postpone");

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
            >
              <IconChevronLeft />
            </Button>
            <Button
              data-testid="next-task"
              disabled={!store.canGoNextTask && !canPostpone}
              onClick={store.canGoNextTask ? store.nextTask : store.postponeTask}
              variant={!store.canGoNextTask && canPostpone ? "primary" : "neutral"}
            >
              <IconChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
