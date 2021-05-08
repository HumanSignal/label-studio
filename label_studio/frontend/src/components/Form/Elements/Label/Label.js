import React, { createElement } from 'react';
import { cn } from '../../../../utils/bem';
import './Label.styl';

const Label = ({text, children, required, placement, description, size, large, style, simple, flat}) => {
  const rootClass = cn('label');
  const classList = [rootClass];
  const tagName = simple ? 'div' : 'label';
  const mods = {
    size,
    large,
    flat,
    placement,
    withDescription: !!description,
    empty: !children,
  };

  classList.push(rootClass.mod(mods));

  return createElement(tagName, {
    'className': classList.join(" "),
    'data-required': required,
    'style': style,
  }, (
    <>
      <div className={rootClass.elem('text')}>
        <div className={rootClass.elem('content')}>
          {text}
          {description && <div className={rootClass.elem("description")}>{description}</div>}
        </div>
      </div>
      <div className={rootClass.elem('field')}>{children}</div>
    </>
  ));
};

export default Label;
