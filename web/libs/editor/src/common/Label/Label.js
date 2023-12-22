import { forwardRef } from 'react';
import { Block, Elem } from '../../utils/bem';
import './Label.styl';

export const Label = forwardRef(({ text, children, required, placement, description, size, large, style, simple, flat }, ref) => {
  const tagName = simple ? 'div' : 'label';
  const mods = {
    size,
    large,
    flat,
    placement,
    withDescription: !!description,
    empty: !children,
  };

  return (
    <Block ref={ref} name="field-label" mod={mods} tag={tagName} style={style} data-required={required}>
      <Elem name="text">
        <Elem name="content">
          {text}
          {description && <Elem name="description">{description}</Elem>}
        </Elem>
      </Elem>
      <Elem name="field">{children}</Elem>
    </Block>
  );
});

export default Label;
