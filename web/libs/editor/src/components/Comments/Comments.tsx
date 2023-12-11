import { FC, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Block } from '../../utils/bem';
import { CommentForm } from './CommentForm';
import { CommentsList } from './CommentsList';
import { useMounted } from '../../common/Utils/useMounted';
import { FF_DEV_3034, isFF } from '../../utils/feature-flags';

import './Comments.styl';


export const Comments: FC<{ commentStore: any, cacheKey?: string }> = observer(({ commentStore, cacheKey }) => {
  const mounted = useMounted();

  const loadComments = async () => {
    await commentStore.listComments({ mounted });
    if (!isFF(FF_DEV_3034)) {
      commentStore.restoreCommentsFromCache(cacheKey);
    }
  };

  useEffect(() => {
    loadComments(); // will reset comments during load
    // id is internal id,
    // always different for different annotations, even empty ones;
    // remain the same when user submit draft, so no unneeded calls.
  }, [commentStore.annotation.id]);

  useEffect(() => {
    const confirmCommentsLoss = (e: any) => {

      if (commentStore.hasUnsaved) {
        e.returnValue = 'You have unpersisted comments which will be lost if continuing.';
      }

      return e;
    };

    // Need to handle this entirely separate to client-side based navigation
    window.addEventListener('beforeunload', confirmCommentsLoss);
    return () => {
      window.removeEventListener('beforeunload', confirmCommentsLoss);
    };
  }, [commentStore.hasUnsaved]);

  return (
    <Block name="comments">
      <CommentForm commentStore={commentStore} inline />
      <CommentsList commentStore={commentStore} />
    </Block>
  );
});
