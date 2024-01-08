import { FC } from 'react';
import { observer } from 'mobx-react';
import { Block } from '../../utils/bem';
import { CommentItem } from './CommentItem';

export const CommentsList: FC<{ commentStore: any }> = observer(({ commentStore }) => {

  return (
    <Block name="comments-list">
      {commentStore.comments.map((comment: any) => (
        <CommentItem key={comment.id} comment={comment} listComments={commentStore.listComments} />
      ))}
    </Block>
  );
});
