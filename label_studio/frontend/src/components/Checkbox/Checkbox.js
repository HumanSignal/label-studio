import React from 'react';
import { cn } from '../../utils/bem';
import './Checkbox.styl';

export const Checkbox = ({checked, style, onChange, ...props}) => {
  const rootClass = cn("checkbox");
  const className = [rootClass, props.className].join(" ");

  return (
    <span className={className} style={style}>
      <input
        {...props}
        checked={checked && "checked"}
        className={rootClass.elem('input')}
        type="checkbox"
        onChange={(e) => onChange?.(e)}
      />
      <span
        className={[
          rootClass.elem('check'),
          rootClass.elem("check").mod({checked})
        ].join(" ")}></span>
    </span>
  );
};
