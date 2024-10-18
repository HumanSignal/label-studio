import { createContext, type FC, useCallback, useMemo } from "react";
import { observer } from "mobx-react";

import { LINK_COMMENT_MODE } from "../../../stores/Annotation/LinkingModes";
import { Block } from "../../../utils/bem";
import { CommentItem } from "./CommentItem";

export type CommentContextType = {
  startLinkingMode: (comment: any) => void;
  globalLinking: boolean;
  currentComment: any;
};

export const CommentsContext = createContext<CommentContextType>({
  startLinkingMode: () => {},
  globalLinking: false,
  currentComment: null,
});

export const CommentsList: FC<{ commentStore: any }> = observer(({ commentStore }) => {
  const startLinkingMode = useCallback(
    (comment: any) => {
      commentStore.annotation.startLinkingMode(LINK_COMMENT_MODE, comment);
    },
    [commentStore],
  );
  const globalLinking = commentStore.annotation?.linkingMode === LINK_COMMENT_MODE;
  const currentComment = commentStore.annotation.currentLinkingMode?.comment;
  const contextValue = useMemo(
    () => ({ startLinkingMode, currentComment, globalLinking }),
    [startLinkingMode, currentComment, globalLinking],
  );
  return (
    <CommentsContext.Provider value={contextValue}>
      <CommentsListInner commentStore={commentStore} />
    </CommentsContext.Provider>
  );
});

export const CommentsListInner: FC<{ commentStore: any }> = observer(({ commentStore }) => {
  return (
    <Block name="comments-list">
      {commentStore.comments.map((comment: any) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          listComments={commentStore.listComments}
          classificationsItems={commentStore.commentClassificationsItems}
        />
      ))}
    </Block>
  );
});
