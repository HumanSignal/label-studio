import { FC, FocusEvent, MutableRefObject, RefObject, useCallback, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import { cn } from '../../utils/bem';
import { isMacOS } from '../../utils/utilities';

import './TextArea.styl';
import mergeRefs from '../Utils/mergeRefs';

export type TextAreaProps = {
  value?: string|null,
  onSubmit?: (value: string) => void|Promise<void>,
  onChange?: (value: string) => void,
  onInput?: (value: string) => void,
  onFocus?: (e: FocusEvent) => void,
  onBlur?: (e: FocusEvent) => void,
  ref?: MutableRefObject<HTMLTextAreaElement>,
  actionRef?: MutableRefObject<{ update?: (text?: string) => void, el?: RefObject<HTMLTextAreaElement> }>,
  rows?: number,
  maxRows?: number,
  autoSize?: boolean,
  className?: string,
  placeholder?: string,
  name?: string,
  id?: string,
}

export const TextArea: FC<TextAreaProps> = ({
  ref,
  actionRef,
  onChange: _onChange,
  onInput: _onInput,
  onSubmit,
  value, 
  autoSize = true,
  rows = 1,
  maxRows = 4,
  className,
  ...props
}) => {

  const inlineAction = !!onSubmit;

  const rootClass = cn('textarea');
  const classList = [
    rootClass.mod({ inline: inlineAction, autosize: autoSize }),
    className,
  ].join(' ').trim();

  const autoGrowRef = useRef({
    rows,
    maxRows: Math.max(maxRows - 1, 1),
    lineHeight: 24,
    maxHeight: Infinity,
  });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextArea = useCallback(debounce(() => {
    const textarea = textAreaRef.current;

    if (!textarea || !autoGrowRef.current || !textAreaRef.current) return;

    if (autoGrowRef.current.maxHeight === Infinity) {
      textarea.style.height = 'auto';
      const currentValue = textAreaRef.current.value;

      textAreaRef.current.value = '';
      autoGrowRef.current.lineHeight = (textAreaRef.current.scrollHeight / autoGrowRef.current.rows);
      autoGrowRef.current.maxHeight = (autoGrowRef.current.lineHeight * autoGrowRef.current.maxRows);

      textAreaRef.current.value = currentValue;
    }

    let newHeight: number;

    if (textarea.scrollHeight > autoGrowRef.current.maxHeight) {
      textarea.style.overflowY = 'scroll';
      newHeight = autoGrowRef.current.maxHeight;
    } else {
      textarea.style.overflowY = 'hidden';
      textarea.style.height = 'auto';
      newHeight = textarea.scrollHeight;
    }
    const contentLength = textarea.value.length;
    const cursorPosition = textarea.selectionStart;

    requestAnimationFrame(() => {
      textarea.style.height = `${newHeight}px`;

      if (contentLength === cursorPosition) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    });
  }, 10, { leading: true }), []);

  if (actionRef) {
    actionRef.current = {
      update: (text = '') => {
        if (!textAreaRef.current) return;

        textAreaRef.current.value = text;
        resizeTextArea();
      },
      el: textAreaRef,
    };
  }

  const onInput = useCallback((e: any) => {
    _onInput?.(e.target.value);
    resizeTextArea();
  }, [_onInput]);

  const onChange = useCallback((e: any) => {
    _onChange?.(e.target.value);
    resizeTextArea();
  }, [_onChange]);

  useEffect(() => { 
    const resize = new ResizeObserver(resizeTextArea);

    resize.observe(textAreaRef.current as any);

    return () => {
      if (textAreaRef.current) {
        resize.unobserve(textAreaRef.current as any);
      } 
    }; 
  }, []);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.value = value || '';
      resizeTextArea();
    }
  }, [value]);

  useEffect(() => {
    if (!onSubmit) return;

    const listener = (event: KeyboardEvent) => {
      if (!textAreaRef.current) return;
      if (event.key === 'Enter' && (event.ctrlKey || isMacOS() && event.metaKey)) {
        onSubmit(textAreaRef.current.value);
      }
    };


    if (textAreaRef.current) {
      textAreaRef.current.addEventListener('keydown', listener);
    }
    return () => {
      if (textAreaRef.current) {
        textAreaRef.current.removeEventListener('keydown', listener);
      }
    };
  }, [onSubmit]);


  return (
    <textarea
      ref={mergeRefs(textAreaRef, ref)}
      className={classList}
      rows={autoGrowRef.current.rows}
      onChange={onChange}
      onInput={onInput}
      {...props}
    />
  );
};
