import React from 'react';
import { cn } from '../../../../utils/bem';
import { FormField } from '../../FormField';
import { default as Label } from '../Label/Label';
import './Toggle.styl';

const Toggle = ({className, label, labelProps, description, checked, defaultChecked, onChange, validate, required, skip, ...props}) => {
  const rootClass = cn('toggle');
  const [isChecked, setIsChecked] = React.useState(defaultChecked ?? checked ?? false);

  const classList = [rootClass];
  const mods = {};

  if (isChecked) mods.checked = isChecked;
  mods.disabled = props.disabled;

  classList.push(rootClass.mod(mods), className);

  const formField = (
    <FormField
      label={label}
      name={props.name}
      validate={validate}
      required={required}
      skip={skip}
      setValue={value => setIsChecked(value)}
      {...props}
    >
      {ref => (
        <div className={classList.join(" ")}>
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
          <span className={rootClass.elem('indicator')}></span>
        </div>
      )}
    </FormField>
  );

  return label ? <Label
    placement="right"
    required={required}
    text={label}
    children={formField}
    description={description}
    {...(labelProps ?? {})}
  /> : formField;
};

export default Toggle;
