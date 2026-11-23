import { CheckIcon, CopyIcon, EyeIcon, EyeSlashIcon, XIcon } from "@humansignal/icons";
import { useCopyText } from "@humansignal/core";
import clsx from "clsx";
import {
  type ChangeEvent,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useCallback,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "../button/button";
import { type FieldChromeProps, fieldIds, hasFieldChrome, withField } from "../field/field";
import styles from "./input.module.css";
import { useFieldFocus } from "./use-field-focus";

export type InputSize = "medium" | "small" | "smaller";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, FieldChromeProps {
  /** Height preset, matching Button and Select: medium 40px, small 32px, smaller 24px. */
  size?: InputSize;
  /** Draws the error state and sets `aria-invalid`. The message itself is rendered next to the field. */
  invalid?: boolean;
  /** Content before the text: an icon, or fixed text such as `https://`. */
  leading?: ReactNode;
  /** Content after the text: an icon, or a unit such as `%`. */
  trailing?: ReactNode;
  /** Shows a button that empties the field. It fires `onChange` with an empty value. */
  clearable?: boolean;
  /** With `type="password"`, shows a button that reveals the value. */
  revealable?: boolean;
  /** Shows a button that copies the value, for read-only values such as URLs and ids. */
  copyable?: boolean;
  /** Class for the field's frame. `className` goes to the native input. */
  wrapperClassName?: string;
}

const setNativeValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

/**
 * Single-line text entry. Every native input prop passes through and the ref points at the native
 * `<input>`, so a form can register it directly. It holds no label, message or form logic.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "medium",
      invalid = false,
      leading,
      trailing,
      clearable = false,
      revealable = false,
      copyable = false,
      wrapperClassName,
      className,
      label,
      description,
      info,
      hint,
      error,
      layout,
      type = "text",
      disabled,
      readOnly,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    const controlled = props.value !== undefined;
    const [uncontrolledEmpty, setUncontrolledEmpty] = useState(
      props.defaultValue === undefined || String(props.defaultValue) === "",
    );
    const empty = controlled ? String(props.value ?? "") === "" : uncontrolledEmpty;

    const [revealed, setRevealed] = useState(false);
    const [copy, copied] = useCopyText();
    const { focusVisible, handlers } = useFieldFocus<HTMLInputElement>(onFocus, onBlur);

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        if (!controlled) setUncontrolledEmpty(event.target.value === "");
        onChange?.(event);
      },
      [controlled, onChange],
    );

    const clear = () => {
      const input = inputRef.current;
      if (!input) return;
      setNativeValue(input, "");
      input.focus();
    };

    const isInvalid = invalid || Boolean(error);
    const generatedId = useId();
    const controlId = props.id ?? `field-${generatedId}`;
    const chrome = { label, description, info, hint, error, layout };
    const wiring = hasFieldChrome(chrome) ? fieldIds(chrome, controlId) : {};
    const editable = !disabled && !readOnly;
    const showClear = clearable && editable && !empty;
    const isPassword = type === "password";

    return withField(
      { ...chrome, required: props.required, id: controlId },
      <div
        className={clsx(styles.field, wrapperClassName)}
        data-size={size}
        data-invalid={isInvalid || undefined}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        data-focus-visible={focusVisible || undefined}
        onPointerDown={handlers.onPointerDown}
      >
        {leading && <span className={styles.affix}>{leading}</span>}
        <input
          {...props}
          {...wiring}
          ref={inputRef}
          type={isPassword && revealed ? "text" : type}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={isInvalid || undefined}
          className={clsx(styles.input, className)}
          onChange={handleChange}
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
        />
        {showClear && (
          <Button
            type="button"
            look="ghost"
            variant="neutral"
            size="smaller"
            className={styles.action}
            aria-label="Clear"
            icon={<XIcon size={16} weight="bold" />}
            onClick={clear}
          />
        )}
        {isPassword && revealable && (
          <Button
            type="button"
            look="ghost"
            variant="neutral"
            size="smaller"
            className={styles.action}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            icon={revealed ? <EyeSlashIcon size={16} weight="bold" /> : <EyeIcon size={16} weight="bold" />}
            onClick={() => setRevealed((value) => !value)}
            disabled={disabled}
          />
        )}
        {copyable && (
          <Button
            type="button"
            look="ghost"
            variant="neutral"
            size="smaller"
            className={styles.action}
            aria-label={copied ? "Copied" : "Copy"}
            icon={copied ? <CheckIcon size={16} weight="bold" /> : <CopyIcon size={16} weight="bold" />}
            onClick={() => copy(inputRef.current?.value ?? "")}
          />
        )}
        {trailing && <span className={styles.affix}>{trailing}</span>}
      </div>,
    );
  },
);

Input.displayName = "Input";
