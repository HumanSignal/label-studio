import React, { forwardRef, useMemo } from 'react';
import { cn } from '../../utils/bem';
import Label from '../Label/Label';
import './Input.styl';

const Input = forwardRef(({ label, className, required, labelProps, ghost, waiting, ...props }, ref) => {
  const rootClass = cn('input');
  const classList = [
    rootClass.mod({ ghost }),
    className,
  ].join(' ').trim();

  const input = useMemo(() => {
    return waiting ? (
      <div className={rootClass.elem('spinner')}/>
    ) : (
      <input {...props} ref={ref} className={classList}/>
    );
  }, [props, ref, classList, waiting]);

  return label ? (
    <Label
      {...(labelProps ?? {})}
      text={label}
      required={required}
    >{input}</Label>
  ) : input;
});

Input.displayName = 'Input';

export default Input;
