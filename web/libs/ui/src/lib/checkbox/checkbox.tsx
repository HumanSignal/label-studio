import { type InputHTMLAttributes, useEffect, useMemo, useRef } from "react";
import { clsx } from "clsx";
import styles from "./checkbox.module.scss";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  indeterminate?: boolean;
  checkboxClassName?: string;
  ariaLabel?: string;
}

export const Checkbox = ({ checked, indeterminate, style, onChange, children, checkboxClassName, ariaLabel, ...props }: CheckboxProps) => {
  const checkboxRef = useRef<HTMLInputElement>();
  const withLabel = !!children;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const checkboxContent = (
    <span className={styles.checkbox__box}>
      <input
        {...props}
        ref={checkboxRef}
        checked={!!checked}
        className={clsx(styles.checkbox__input, checkboxClassName)}
        type="checkbox"
        onChange={onChange}
        aria-checked={!!checked}
        aria-label={ariaLabel ?? (typeof children === 'string' ? children : "")}
      />
      <span
        className={clsx(styles.checkbox__check, {
          [styles.checkbox__check_checked]: checked,
          [styles.checkbox__check_indeterminate]: indeterminate,
        })}
      />
    </span>
  );

  return (
    <div
      className={clsx(styles.checkbox, {[styles.checkbox_withLabel]: withLabel}, props.className)}
      style={style}
    >
      {children ? (
        <label className={styles.checkbox__label}>
          {checkboxContent} {children}
        </label>
      ) : (
        checkboxContent
      )}
    </div>
  );
};

export default Checkbox;
