import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Block, cn, Elem } from '../../utils/bem';
import { Label } from '../Label/Label';
import './Toggle.styl';

const Toggle = forwardRef(({
  className,
  label,
  labelProps,
  description,
  checked,
  defaultChecked,
  onChange,
  required,
  style,
  ...props
}, ref) => {
  const rootClass = cn('toggle');
  const initialChecked = useMemo(() => defaultChecked ?? checked ?? false, [defaultChecked, checked]);
  const [isChecked, setIsChecked] = useState(defaultChecked ?? checked ?? false);

  const mods = {};

  useEffect(() => {
    setIsChecked(initialChecked);
  }, [initialChecked]);

  if (isChecked) mods.checked = isChecked;
  mods.disabled = props.disabled;

  const formField = (
    <Block name="toggle" className={className} mod={mods} style={style}>
      <input
        ref={ref}
        {...props}
        className={rootClass.elem('input')}
        type="checkbox"
        checked={isChecked}
        onChange={(e) => {
          setIsChecked(e.target.checked);
          onChange?.(e);
        }}
      />
      <Elem tag="span" name="indicator"/>
    </Block>
  );

  return label ? (
    <Label
      ref={ref}
      placement="right"
      required={required}
      text={label}
      children={formField}
      description={description}
      {...(labelProps ?? {})}
    />
  ) : formField;
});

export default Toggle;
