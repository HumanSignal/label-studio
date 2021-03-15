import React from 'react';
import { cn } from '../../../../utils/bem';
import './Label.styl';

const Label = ({text, children, required, placement, description, size, large, style, flat}) => {
  const rootClass = cn('label');
  const classList = [rootClass];
  const mods = {
    size,
    large,
    flat,
    placement,
    withDescription: !!description,
    empty: !children,
  };

  classList.push(rootClass.mod(mods));

  return (
    <label className={classList.join(" ")} data-required={required} style={style}>
      <div className={rootClass.elem('text')}>
        <div className={rootClass.elem('content')}>
          {text}
          {description && <div className={rootClass.elem("description")}>{description}</div>}
        </div>
      </div>
      <div className={rootClass.elem('field')}>{children}</div>
    </label>
  );
};

export default Label;
