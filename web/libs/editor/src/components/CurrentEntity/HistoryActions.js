import { observer } from 'mobx-react';
import { LsRedo, LsRemove, LsUndo } from '../../assets/icons';
import { Button } from '../../common/Button/Button';
import { Tooltip } from '../../common/Tooltip/Tooltip';
import { Block, Elem } from '../../utils/bem';
import './HistoryActions.styl';
import { Hotkey } from '../../core/Hotkey';

export const HistoryActions = observer(({ annotation }) => {
  const { history } = annotation;

  return (
    <Block name="history-buttons">
      <Hotkey.Tooltip name="annotation:undo">
        <Elem
          tag={Button}
          name="action"
          type="text"
          aria-label="Undo"
          disabled={!history?.canUndo}
          onClick={() => annotation.undo()}
          icon={<LsUndo />}
        />
      </Hotkey.Tooltip>
      <Hotkey.Tooltip name="annotation:redo">
        <Elem
          tag={Button}
          name="action"
          type="text"
          aria-label="Redo"
          disabled={!history?.canRedo}
          onClick={() => annotation.redo()}
          icon={<LsRedo />}
        />
      </Hotkey.Tooltip>
      <Tooltip title="Reset">
        <Elem
          tag={Button}
          name="action"
          look="danger"
          type="text"
          aria-label="Reset"
          disabled={!history?.canUndo}
          onClick={() => history?.reset()}
          icon={<LsRemove />}
        />
      </Tooltip>
    </Block>
  );
});
