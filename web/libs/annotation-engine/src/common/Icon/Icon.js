import React from 'react';
import { Block } from '../../utils/bem';
import './Icon.styl';

export const Icon = React.forwardRef(({ icon, ...props }, ref) => {
  return (
    <Block tag='span' name='icon' ref={ref}>
      {React.createElement(icon, props)}
    </Block>
  );
});
