import React from "react";
import { cn } from "../../../utils/bem";
import "./Checkbox.styl";

export const Checkbox = ({ checked, indeterminate, style, onChange, children, ...props }) => {
  const rootClass = cn("checkbox");
  const checkboxRef = React.createRef();
  const withLabel = !!children;

  React.useEffect(() => {
    checkboxRef.current.indeterminate = indeterminate;
  }, [checkboxRef, indeterminate]);

  const checkboxContent = (
    <span className={rootClass.elem("box")}>
      <input
        {...props}
        ref={checkboxRef}
        checked={!!checked}
        className={rootClass.elem("input")}
        type="checkbox"
        onChange={(e) => {
          onChange?.(e);
        }}
      />
      <span className={rootClass.elem("check").mod({ checked, indeterminate })} />
    </span>
  );

  return (
    <div className={rootClass.mod({ withLabel }).mix(props.className)} style={style}>
      {children ? (
        <label className={rootClass.elem("label")}>
          {checkboxContent} {children}
        </label>
      ) : (
        checkboxContent
      )}
    </div>
  );
};
