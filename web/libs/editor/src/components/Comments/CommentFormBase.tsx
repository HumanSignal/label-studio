import { FC, RefObject, useCallback, useRef } from 'react';
import { Block, Elem } from '../../utils/bem';
import { ReactComponent as IconSend } from '../../assets/icons/send.svg';

import './CommentForm.styl';
import { TextArea } from '../../common/TextArea/TextArea';
import { observer } from 'mobx-react';


export type CommentFormProps = {
  value?: string,
  onChange?: (value: string) => void,
  onSubmit?: (value: string) => void,
  onBlur?: (e: FocusEvent) => void,
  inline?: boolean,
  rows?: number,
  maxRows?: number,
}

export const CommentFormBase: FC<CommentFormProps> = observer(({
  value = '',
  inline = true,
  onChange,
  onSubmit,
  onBlur,
  rows = 1,
  maxRows = 4,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const actionRef = useRef<{ update?: (text?: string) => void, el?: RefObject<HTMLTextAreaElement> }>({});

  const submitHandler = useCallback(async (e?: any) => {
    e?.preventDefault?.();

    if (!formRef.current) return;

    const comment = (new FormData(formRef.current).get('comment') as string)?.trim();

    if (!comment) return;

    onSubmit?.(comment);
  }, [onSubmit]);

  const onInput = useCallback((comment: string) => {
    onChange?.(comment || '');
  }, [onChange]);

  return (
    <Block ref={formRef} tag="form" name="comment-form" mod={{ inline }} onSubmit={submitHandler}>
      <TextArea
        actionRef={actionRef}
        name="comment"
        placeholder="Add a comment"
        value={value}
        rows={rows}
        maxRows={maxRows}
        onChange={onChange}
        onInput={onInput}
        onSubmit={(newValue) => {
          if (!inline) return;

          newValue = newValue.trim();
          if (!newValue) return;

          onSubmit?.(newValue);
        }}
        onBlur={(e) => onBlur?.(e)}
      />
      <Elem tag="div" name="primary-action">
        <button type="submit">
          <IconSend />
        </button>
      </Elem>
    </Block>
  );
});
