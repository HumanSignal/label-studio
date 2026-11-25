import { clsx } from "clsx";
import {
  type ChangeEvent,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CheckboxGroupContext } from "../checkbox-group/context";
import styles from "./checkbox.module.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  indeterminate?: boolean;
  checkboxClassName?: string;
  ariaLabel?: string;
  /** Visible label; the same as passing children. */
  label?: ReactNode;
  /** Help under the label. */
  description?: ReactNode;
  /** Draws the error state and sets `aria-invalid`. */
  invalid?: boolean;
  /** Inside a CheckboxGroup, the value this checkbox adds to the group's list. */
  value?: string;
}

/**
 * A checkbox on a native input. The ref points at the input, so a form can register it. Controlled
 * with `checked`, uncontrolled with `defaultChecked`, or driven by a CheckboxGroup through `value`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((allProps, ref) => {
  const {
    checked,
    defaultChecked,
    indeterminate,
    style,
    onChange,
    children,
    label,
    description,
    invalid = false,
    value,
    checkboxClassName,
    ariaLabel,
    disabled,
    ...props
  } = allProps;
  // Passing `checked` at all, even as undefined, keeps the box controlled: undefined reads as unchecked.
  const controlled = "checked" in allProps;
  const checkboxRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => checkboxRef.current as HTMLInputElement);
  const group = useContext(CheckboxGroupContext);
  const inGroup = group !== null && value !== undefined;

  const [inner, setInner] = useState(Boolean(defaultChecked));
  const isChecked = inGroup ? group.values.includes(value) : controlled ? Boolean(checked) : inner;
  const isDisabled = disabled || (inGroup && group.disabled);
  const isInvalid = invalid || (inGroup && group.invalid);
  const text = label ?? children;
  // Indeterminate wins over checked: one mark in the box, never the check under the square.
  const showChecked = isChecked && !indeterminate;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (inGroup) group.toggle(value, event.target.checked);
    else if (!controlled) setInner(event.target.checked);
    onChange?.(event);
  };

  const checkboxContent = (
    <span className={clsx(styles.checkbox__box, { [styles.checkbox__box_checked]: showChecked })}>
      <input
        {...props}
        ref={checkboxRef}
        checked={isChecked}
        value={value}
        name={props.name ?? (inGroup ? group.name : undefined)}
        disabled={isDisabled}
        className={clsx(styles.checkbox__input, checkboxClassName)}
        type="checkbox"
        onChange={handleChange}
        aria-checked={indeterminate ? "mixed" : isChecked}
        aria-invalid={isInvalid || undefined}
        aria-label={ariaLabel ?? (typeof text === "string" ? text : undefined)}
      />
      <span
        className={clsx(styles.checkbox__check, {
          [styles.checkbox__check_checked]: showChecked,
          [styles.checkbox__check_indeterminate]: indeterminate,
        })}
      />
    </span>
  );

  return (
    <div
      className={clsx(
        styles.checkbox,
        { [styles.checkbox_disabled]: isDisabled, [styles.checkbox_invalid]: isInvalid },
        props.className,
      )}
      style={style}
    >
      {text ? (
        <label className={styles.checkbox__label}>
          {checkboxContent}{" "}
          {description ? (
            <span className={styles.checkbox__text}>
              <span>{text}</span>
              <span className={styles.checkbox__description}>{description}</span>
            </span>
          ) : (
            text
          )}
        </label>
      ) : (
        checkboxContent
      )}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

export default Checkbox;
