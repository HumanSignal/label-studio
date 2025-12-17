import { type FC, type MouseEventHandler, useCallback, useEffect, useRef, useState, useMemo } from "react";
import { observer } from "mobx-react";

import { LINK_COMMENT_MODE } from "../../../stores/Annotation/LinkingModes";
import { CommentBase } from "../../../stores/Comment/Comment";
import { TextArea } from "../../../common/TextArea/TextArea";
import type { ActionRefValue } from "../../../common/TextArea/TextArea";
import { cn } from "../../../utils/bem";
import { FF_DEV_3873, isFF } from "../../../utils/feature-flags";

import { LinkState } from "./LinkState";
import "./CommentForm.scss";
import { NewTaxonomy as Taxonomy, type TaxonomyPath } from "../../../components/NewTaxonomy/NewTaxonomy";
import { CommentFormButtons } from "./CommentFormButtons";
import { taxonomyPathsToSelectedItems, COMMENT_TAXONOMY_OPTIONS } from "../../../utils/commentClassification";

export type CommentFormProps = {
  commentStore: any;
  annotationStore: any;
  inline?: boolean;
};

const ROWS = 1;
const MAX_ROWS = 4;

export const CommentForm: FC<CommentFormProps> = observer(({ commentStore, annotationStore, inline = true }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const actionRef = useRef<ActionRefValue>({});
  const clearTooltipMessage = () => commentStore.setTooltipMessage("");
  const globalLinking = annotationStore.selected && annotationStore.selected.linkingMode === LINK_COMMENT_MODE;
  const [linkingComment, setLinkingComment] = useState();

  const getCurrentComment = useCallback(
    (mayCreate = true) => {
      let currentComment = commentStore.commentInProgress;
      if (!currentComment && mayCreate) {
        currentComment = CommentBase.create({ text: "" }, { annotationStore: commentStore.annotationStore });
        commentStore.setCurrentComment(currentComment);
      }
      return currentComment;
    },
    [commentStore],
  );

  const updateComment = useCallback(
    (comment: string) => {
      const currentComment = getCurrentComment();
      currentComment.setText(comment);
    },
    [commentStore, annotationStore],
  );

  const linkToHandler: MouseEventHandler<HTMLElement> = useCallback(
    (e) => {
      e?.preventDefault?.();
      const globalLinking = annotationStore.selected && annotationStore.selected.linkingMode === LINK_COMMENT_MODE;
      if (globalLinking) {
        annotationStore.selected.stopLinkingMode();
        return;
      }
      const currentComment = getCurrentComment();
      setLinkingComment(currentComment);
      annotationStore.selected.startLinkingMode(LINK_COMMENT_MODE, currentComment);
    },
    [commentStore, annotationStore],
  );

  const onSubmit = useCallback(
    async (e?: any) => {
      e?.preventDefault?.();

      if (!formRef.current || commentStore.loading === "addComment") return;

      const currentComment = getCurrentComment(false);
      const text = currentComment?.text;
      const regionRef = currentComment?.regionRef;
      const classifications = currentComment?.classifications;

      if (!text.trim() && !classifications) return;

      try {
        commentStore.setCurrentComment(undefined);

        const commentProps = {
          text,
          regionRef,
          classifications,
        };
        await commentStore.addComment(commentProps);
      } catch (err) {
        commentStore.setCurrentComment(currentComment);
        console.error(err);
      }
    },
    [commentStore, annotationStore],
  );

  useEffect(() => {
    if (!isFF(FF_DEV_3873)) {
      commentStore.setAddedCommentThisSession(false);
      clearTooltipMessage();
    }
    return () => clearTooltipMessage();
  }, []);

  useEffect(() => {
    if (isFF(FF_DEV_3873)) {
      commentStore.tooltipMessage && actionRef.current?.el?.current?.focus({ preventScroll: true });
    }
  }, [commentStore.tooltipMessage]);

  useEffect(() => {
    commentStore.setInputRef(actionRef.current?.el);
    commentStore.setCommentFormSubmit(() => onSubmit());
  }, [actionRef, commentStore]);

  const currentLinkingComment = annotationStore.selected.currentLinkingMode?.comment;
  const currentComment = getCurrentComment();
  const { text = "", regionRef, classifications } = currentComment || {};
  const { region, result } = regionRef || {};
  const linking = !!linkingComment && currentLinkingComment === linkingComment && globalLinking;
  const hasLinkState = linking || region;
  const selections = useMemo(() => taxonomyPathsToSelectedItems(classifications?.default?.values), [classifications]);
  const classificationsItems = commentStore.commentClassificationsItems;

  const updateCommentClassifications = useCallback(
    (classifications: object | null) => {
      const currentComment = getCurrentComment();
      currentComment.setClassifications(classifications);
    },
    [getCurrentComment],
  );

  const taxonomyOnChange = useCallback(
    async (_: Node, values: TaxonomyPath[]) => {
      const newClassifications =
        values.length > 0
          ? {
              default: {
                type: "taxonomy",
                values,
              },
            }
          : null;
      updateCommentClassifications(newClassifications);
    },
    [updateCommentClassifications],
  );

  return (
    <form
      ref={formRef as any}
      className={cn("comment-form-new").mod({ inline, linked: !!region }).toClassName()}
      onSubmit={onSubmit}
    >
      <div className={cn("comment-form-new").elem("text-row").toClassName()}>
        <TextArea
          actionRef={actionRef}
          name="comment"
          placeholder="Add a comment"
          value={text}
          rows={ROWS}
          maxRows={MAX_ROWS}
          onInput={updateComment}
          onSubmit={inline ? onSubmit : undefined}
          onBlur={clearTooltipMessage}
        />
        {classificationsItems.length === 0 && (
          <CommentFormButtons region={region} linking={linking} onLinkTo={linkToHandler} />
        )}
      </div>
      {classificationsItems.length > 0 && (
        <div className={cn("comment-form-new").elem("classifications-row").toClassName()}>
          <div className={cn("comment-form-new").elem("category-selector").toClassName()}>
            <Taxonomy
              selected={selections}
              items={classificationsItems}
              onChange={taxonomyOnChange}
              options={COMMENT_TAXONOMY_OPTIONS}
            />
          </div>
          <CommentFormButtons region={region} linking={linking} onLinkTo={linkToHandler} />
        </div>
      )}
      {hasLinkState && (
        <div className={cn("comment-form-new").elem("link-state").toClassName()}>
          <LinkState linking={linking} region={region} result={result} onUnlink={currentComment?.unsetLink} />
        </div>
      )}
      {commentStore.tooltipMessage && (
        <div className={cn("comment-form-new").elem("tooltipMessage").toClassName()}>{commentStore.tooltipMessage}</div>
      )}
    </form>
  );
});
