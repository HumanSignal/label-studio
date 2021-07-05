import React from 'react';
import { cn } from '../../../../utils/bem';
import { FormField } from '../../FormField';
import { default as Label } from '../Label/Label';
import './Select.styl';

const Select = ({label, className, options, validate, required, skip, labelProps, ghost, ...props}) => {
  const rootClass = cn('select');

  const classList = rootClass.mod({ghost}).mix(className);

  const selectWrapper = (
    <FormField
      name={props.name}
      label={label}
      validate={validate}
      required={required}
      skip={skip}
      {...props}
    >
      {ref => (
        <div className={classList}>
          <select {...props} ref={ref} className={rootClass.elem('list')}>
            {(options ?? []).map(option => {
              const value = option.value ?? option;
              const label = option.label ?? value;
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </FormField>
  );

  return label ? <Label {...(labelProps ?? {})} text={label} required={required}>{selectWrapper}</Label> : selectWrapper;
};

export default Select;
