import { observer } from 'mobx-react';
import { Tooltip } from '../../common/Tooltip/Tooltip';
import Utils from '../../utils';
import { cn } from '../../utils/bem';

import './DraftPanel.styl';

const panel = cn('draft-panel');

export const DraftPanel = observer(({ item }) => {
  if (!item.draftSaved && !item.versions.draft) return null;
  const saved = item.draft && item.draftSaved ? ` saved ${Utils.UDate.prettyDate(item.draftSaved)}` : '';

  if (!item.selected) {
    if (!item.draft) return null;
    return <div className={panel}>draft{saved}</div>;
  }
  if (!item.versions.result || !item.versions.result.length) {
    return <div className={panel}>{saved ? `draft${saved}` : 'not submitted draft'}</div>;
  }
  return (
    <div className={panel}>
      <Tooltip placement="topLeft" title={item.draftSelected ? 'switch to original result' : 'switch to current draft'}>
        <button onClick={() => item.toggleDraft()} className={panel.elem('toggle')}>
          {item.draftSelected ? 'draft' : 'original'}
        </button>
      </Tooltip>
      {saved}
    </div>
  );
});
