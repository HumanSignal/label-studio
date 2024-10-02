import { nanoid } from "nanoid";
import { type InputHTMLAttributes, useEffect, useMemo, useRef } from "react";
import styles from "./checkbox.module.scss";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  indeterminate?: boolean;
}

export const Checkbox = ({ checked, indeterminate, style, onChange, children, ...props }: CheckboxProps) => {
  const checkboxRef = useRef<HTMLInputElement>();
  const withLabel = !!children;
  const id = useMemo(nanoid, []);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const checkboxContent = (
    <span className={styles.checkbox__box}>
      <input
        {...props}
        id={id}
        ref={checkboxRef}
        checked={!!checked}
        className={styles.checkbox__input}
        type="checkbox"
        onChange={onChange}
      />
      <span
        className={[
          styles.checkbox__check,
          checked && styles.checkbox_checked,
          indeterminate && styles.checkbox_indeterminate,
        ].filter(Boolean).join(" ")}
      />
    </span>
  );

  return (
    <div
      className={`${styles.checkbox} ${props.className} ${withLabel ? styles.checkbox_withLabel : ""}`}
      style={style}
    >
      {children ? (
        <label className={styles.checkbox__label} htmlFor={id}>
          {checkboxContent} {children}
        </label>
      ) : (
        checkboxContent
      )}
    </div>
  );
};

export default Checkbox;
