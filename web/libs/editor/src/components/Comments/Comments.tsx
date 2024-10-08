import { type FC, useEffect } from "react";
import { observer } from "mobx-react";
import { Block } from "../../utils/bem";
import { CommentForm as CommentFormOld } from "./OldComment/CommentForm";
import { CommentForm as CommentsFormNew } from "./Comment/CommentForm";
import { CommentsList as CommentsListOld } from "./OldComment/CommentsList";
import { CommentsList as CommentsListNew } from "./Comment/CommentsList";
import { useMounted } from "../../common/Utils/useMounted";
import { FF_DEV_3034, FF_PER_FIELD_COMMENTS, isFF } from "../../utils/feature-flags";

import "./Comments.scss";

const isPerFieldComments = isFF(FF_PER_FIELD_COMMENTS);

const CommentForm = isPerFieldComments ? CommentsFormNew : CommentFormOld;
const CommentsList = isPerFieldComments ? CommentsListNew : CommentsListOld;

export const Comments: FC<{ annotationStore: any; commentStore: any; cacheKey?: string }> = observer(
  ({ annotationStore, commentStore, cacheKey }) => {
    const mounted = useMounted();

    const loadComments = async () => {
      const listCommentsOptions: any = { mounted };
      if (isPerFieldComments) {
        // It prevents blinking on opening comments tab for the same annotation when comments are already there
        listCommentsOptions.suppressClearComments = commentStore.isRelevantList;
      }
      await commentStore.listComments(listCommentsOptions);
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
          e.returnValue = "You have unpersisted comments which will be lost if continuing.";
        }

        return e;
      };

      // Need to handle this entirely separate to client-side based navigation
      window.addEventListener("beforeunload", confirmCommentsLoss);
      return () => {
        window.removeEventListener("beforeunload", confirmCommentsLoss);
      };
    }, [commentStore.hasUnsaved]);

    return (
      <Block name="comments">
        <CommentForm commentStore={commentStore} annotationStore={annotationStore} inline />
        <CommentsList commentStore={commentStore} />
      </Block>
    );
  },
);
