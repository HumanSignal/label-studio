import React from 'react';
import { cn } from '../../utils/bem';
import './Hamburger.styl';

export const Hamburger = ({opened, animated = true}) => {
  const root = cn('hamburger');

  return (
    <span className={root.mod({animated, opened})}>
      <span></span>
      <span></span>
      <span></span>
    </span>
  );
};
