import clsx from "clsx";
import {
  type ChangeEvent,
  forwardRef,
  type TextareaHTMLAttributes,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { type FieldChromeProps, fieldIds, hasFieldChrome, withField } from "../field/field";
import { useFieldFocus } from "../input/use-field-focus";
import styles from "./text-area.module.css";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldChromeProps {
  /** Draws the error state and sets `aria-invalid`. The message itself is rendered next to the field. */
  invalid?: boolean;
  /** Grows with the content instead of scrolling, up to `maxHeight`. */
  autosize?: boolean;
  /** Largest height in px when `autosize` is on; past it the content scrolls. */
  maxHeight?: number;
  /** `vertical` lets the user drag the bottom edge; `none` fixes the size. */
  resize?: "vertical" | "none";
  /** Class for the field's frame. `className` goes to the native textarea. */
  wrapperClassName?: string;
}

/**
 * Multi-line text entry. Every native textarea prop passes through and the ref points at the native
 * `<textarea>`, so a form can register it directly. It holds no label, message or form logic.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      invalid = false,
      autosize = false,
      maxHeight,
      resize = "vertical",
      wrapperClassName,
      className,
      label,
      description,
      info,
      hint,
      error,
      layout,
      rows = 3,
      disabled,
      readOnly,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) => {
    const ref = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement);
    const { focusVisible, handlers } = useFieldFocus<HTMLTextAreaElement>(onFocus, onBlur);

    const fit = useCallback(() => {
      const textarea = ref.current;
      if (!autosize || !textarea) return;
      textarea.style.height = "auto";
      const height = maxHeight ? Math.min(textarea.scrollHeight, maxHeight) : textarea.scrollHeight;
      textarea.style.height = `${height}px`;
    }, [autosize, maxHeight]);

    useLayoutEffect(fit, [fit, props.value]);

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        fit();
        onChange?.(event);
      },
      [fit, onChange],
    );

    const isInvalid = invalid || Boolean(error);
    const generatedId = useId();
    const controlId = props.id ?? `field-${generatedId}`;
    const chrome = { label, description, info, hint, error, layout };
    const wiring = hasFieldChrome(chrome) ? fieldIds(chrome, controlId) : {};
    return withField(
      { ...chrome, required: props.required, id: controlId },
      <div
        className={clsx(styles.field, wrapperClassName)}
        data-resize={autosize ? "none" : resize}
        data-invalid={isInvalid || undefined}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        data-focus-visible={focusVisible || undefined}
        onPointerDown={handlers.onPointerDown}
      >
        <textarea
          {...props}
          {...wiring}
          ref={ref}
          rows={rows}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={isInvalid || undefined}
          className={clsx(styles.textarea, className)}
          onChange={handleChange}
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
        />
      </div>,
    );
  },
);

TextArea.displayName = "TextArea";
