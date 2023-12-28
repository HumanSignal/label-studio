import { FC, RefObject, useCallback, useEffect, useRef } from 'react';
import { Block, Elem } from '../../utils/bem';
import { ReactComponent as IconSend } from '../../assets/icons/send.svg';

import './CommentForm.styl';
import { TextArea } from '../../common/TextArea/TextArea';
import { observer } from 'mobx-react';
import { FF_DEV_3873, isFF } from '../../utils/feature-flags';


export type CommentFormProps = {
  commentStore: any,
  annotationStore: any,
  onChange?: (value: string) => void,
  inline?: boolean,
  rows?: number,
  maxRows?: number,
}

export const CommentForm: FC<CommentFormProps> = observer(({
  commentStore,
  annotationStore,
  inline = true,
  onChange,
  rows = 1,
  maxRows = 4,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const actionRef = useRef<{ update?: (text?: string) => void, el?: RefObject<HTMLTextAreaElement> }>({});
  const clearTooltipMessage = () => commentStore.setTooltipMessage('');
  const onSubmit = useCallback(async (e?: any) => {
    e?.preventDefault?.();

    if (!formRef.current || commentStore.loading === 'addComment') return;

    const comment = new FormData(formRef.current).get('comment') as string;

    if (!comment.trim()) return;

    try {
      actionRef.current.update?.('');

      await commentStore.addComment(comment);

    } catch (err) {
      actionRef.current.update?.(comment || '');
      console.error(err);
    }
  }, [commentStore]);

  const onInput = useCallback((comment: string) => {
    commentStore.setCurrentComment(comment || '');
  }, [commentStore]);

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
    commentStore.setInputRef(actionRef.current.el);
    commentStore.setCommentFormSubmit(() => onSubmit());
  }, [actionRef, commentStore]);

  const value = commentStore.currentComment[annotationStore.selected.id] || '';

  return (
    <Block ref={formRef} tag="form" name="comment-form" mod={{ inline }} onSubmit={onSubmit}>
      <TextArea
        actionRef={actionRef}
        name="comment"
        placeholder="Add a comment"
        value={value}
        rows={rows}
        maxRows={maxRows}
        onChange={onChange}
        onInput={onInput}
        onSubmit={inline ? onSubmit : undefined}
        onBlur={clearTooltipMessage}
      />
      <Elem tag="div" name="primary-action">
        <button type="submit">
          <IconSend />
        </button>
      </Elem>
      {commentStore.tooltipMessage && (
        <Elem name="tooltipMessage">
          {commentStore.tooltipMessage}
        </Elem>
      )}
    </Block>
  );
});
