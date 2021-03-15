import React from 'react';
import { cn } from '../../utils/bem';
import './Spinner.styl';

export const Spinner = ({ className, style, size, stopped = false }) => {
  const rootClass = cn('spinner');

  return (
    <div className={rootClass.mix(className)} style={{...(style ?? {}), '--spinner-size': `${size ?? 32}px`}}>
      <div className={rootClass.elem('body').mod({stopped})}>
        <span/>
        <span/>
        <span/>
        <span/>
      </div>
    </div>
  );
};
