/* eslint-disable-next-line */
import React, { type InputHTMLAttributes } from "react";
import styles from "./checkbox.module.scss";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  indeterminate?: boolean;
}
const classNameMap = { ...styles };

export const Checkbox = ({ checked, indeterminate, style, onChange, children, ...props }: CheckboxProps) => {
  const checkboxRef = React.createRef();
  const withLabel = !!children;

  React.useEffect(() => {
    checkboxRef.current.indeterminate = indeterminate;
  }, [checkboxRef, indeterminate]);

  const checkboxContent = (
    <span className={styles.checkbox__box}>
      <input
        {...props}
        ref={checkboxRef}
        checked={!!checked}
        className={styles.checkbox__input}
        type="checkbox"
        onChange={(e) => {
          onChange?.(e);
        }}
      />
      <span
        className={`${styles.checkbox__check} ${checked ? styles.checkbox_checked : ""} ${
          indeterminate ? styles.checkbox_indeterminate : ""
        }`}
      />
    </span>
  );

  return (
    <div
      className={`${styles.checkbox} ${props.className} ${withLabel ? styles.checkbox_withLabel : ""}`}
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
