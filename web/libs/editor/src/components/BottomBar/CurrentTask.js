import { observer } from 'mobx-react';
import { useMemo } from 'react';
import { Button } from '../../common/Button/Button';
import { Block, Elem } from '../../utils/bem';
import { guidGenerator } from '../../utils/unique';
import { isDefined } from '../../utils/utilities';
import './CurrentTask.styl';


export const CurrentTask = observer(({ store }) => {
  const currentIndex = useMemo(() => {
    return store.taskHistory.findIndex((x) => x.taskId === store.task.id) + 1;
  }, [store.taskHistory]);

  const historyEnabled = store.hasInterface('topbar:prevnext');
  // @todo some interface?
  const canPostpone = !isDefined(store.annotationStore.selected.pk)
    && !store.canGoNextTask
    && !store.hasInterface('review')
    && store.hasInterface('postpone');

  return (
    <Elem name="section">
      <Block name="current-task" mod={{ 'with-history': historyEnabled }}>
        <Elem name="task-id">
          {store.task.id ?? guidGenerator()}
          {historyEnabled && (
            <Elem name="task-count">
              {currentIndex} of {store.taskHistory.length}
            </Elem>
          )}
        </Elem>
        {historyEnabled && (
          <Elem name="history-controls">
            <Elem
              tag={Button}
              name="prevnext"
              mod={{ prev: true, disabled: !store.canGoPrevTask }}
              type="link"
              disabled={!historyEnabled || !store.canGoPrevTask}
              onClick={store.prevTask}
              style={{ background: 'none', backgroundColor: 'none' }}
            />
            <Elem
              tag={Button}
              name="prevnext"
              mod={{
                next: true,
                disabled: !store.canGoNextTask && !canPostpone,
                postpone: !store.canGoNextTask && canPostpone,
              }}
              type="link"
              disabled={!store.canGoNextTask && !canPostpone}
              onClick={store.canGoNextTask ? store.nextTask : store.postponeTask}
              style={{ background: 'none', backgroundColor: 'none' }}
            />
          </Elem>
        )}
      </Block>
    </Elem>
  );
});
