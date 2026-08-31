import { type FC, useEffect, useRef } from "react";
import { observer } from "mobx-react";
import { Spin } from "antd";

import { cn } from "../../utils/bem";
import { CommentForm } from "./Comment/CommentForm";
import { CommentsList } from "./Comment/CommentsList";
import { useMounted } from "../../common/Utils/useMounted";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS, isFF } from "@humansignal/core/lib/utils/feature-flags";

import "./Comments.prefix.css";

// FIT-720: Skeleton loader for comments while fetching
const CommentsLoadingSkeleton: FC = () => (
  <div className={cn("comments").elem("loading").toClassName()}>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 0" }}>
      <Spin size="default" />
      <span style={{ marginLeft: 12, color: "#999" }}>Loading comments...</span>
    </div>
  </div>
);

export const Comments: FC<{
  annotationStore: any;
  commentStore: any;
  isActive?: boolean; // FIT-720: Only fetch comments when tab is active (when FF enabled)
}> = observer(({ annotationStore, commentStore, isActive = true }) => {
  const mounted = useMounted();
  const taskId = commentStore.task?.id;
  const annotationId = commentStore.annotation?.id;
  // Track the annotation ID we last loaded comments for (FIT-720)
  const lastLoadedAnnotationId = useRef<string | null>(null);
  const prevTaskId = useRef<typeof taskId>(undefined);

  // FIT-720: Check if lazy loading is enabled
  const lazyLoadEnabled = isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS);

  const loadComments = async () => {
    // Capture the current annotation id before the async call.
    // The store tree can be replaced while awaiting, so avoid reading
    // commentStore.annotation after await.
    const annotationId = commentStore.annotation?.id;

    // It prevents blinking on opening comments tab for the same annotation when comments are already there
    const listCommentsOptions: any = { mounted, suppressClearComments: commentStore.isRelevantList };
    await commentStore.listComments(listCommentsOptions);

    if (!mounted.current) return;

    // Track that we loaded comments for this annotation (FIT-720)
    lastLoadedAnnotationId.current = annotationId ?? null;
  };

  // Single effect: reset lazy-load cursor when the task changes (e.g. DM refresh), then fetch if needed.
  useEffect(() => {
    if (taskId !== prevTaskId.current) {
      lastLoadedAnnotationId.current = null;
      prevTaskId.current = taskId;
    }

    if (lazyLoadEnabled) {
      // FIT-720: Only load comments when active AND we haven't already loaded for this annotation
      const needsLoad = annotationId && lastLoadedAnnotationId.current !== annotationId;

      if (isActive && needsLoad) {
        loadComments();
      }
    } else if (annotationId) {
      // Original behavior: Load comments whenever annotation changes
      loadComments();
    }
    // id is internal id,
    // always different for different annotations, even empty ones;
    // remain the same when user submit draft, so no unneeded calls.
  }, [annotationId, isActive, lazyLoadEnabled, taskId]);

  const isLoading = lazyLoadEnabled && commentStore.isListLoading && !!commentStore.annotation;

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
    <div className={cn("comments").toClassName()}>
      <CommentForm commentStore={commentStore} annotationStore={annotationStore} inline />
      {/* FIT-720: Show skeleton loader while fetching comments */}
      {isLoading ? <CommentsLoadingSkeleton /> : <CommentsList commentStore={commentStore} />}
    </div>
  );
});
