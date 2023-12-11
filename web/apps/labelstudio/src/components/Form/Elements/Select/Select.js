import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../../../../utils/bem';
import { FormField } from '../../FormField';
import { default as Label } from '../Label/Label';
import './Select.styl';

const Select = ({ label, className, options, validate, required, skip, labelProps, ghost, ...props }) => {
  const rootClass = cn('select');
  const initialValue = useMemo(() => props.value ?? "", [props.value]);
  const [value, setValue] = useState(initialValue);

  const classList = rootClass.mod({ ghost }).mix(className);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const selectWrapper = (
    <FormField
      name={props.name}
      label={label}
      validate={validate}
      required={required}
      skip={skip}
      setValue={val => setValue(val)}
      {...props}
    >
      {ref => {
        return (
          <div className={classList}>
            <select
              {...props}
              value={value}
              onChange={(e) => {
                setValue(e.target.value),
                props.onChange?.(e);
              }}
              ref={ref}
              className={rootClass.elem('list')}
            >
              {props.placeholder && (!props.defaulValue || !props.value) && (
                <option value="" disabled hidden>{props.placeholder}</option>
              )}

              {(options ?? []).map(option => {
                const value = option.value ?? option;
                const label = option.label ?? value;
                const disabled = option.disabled ?? false;
                const hidden = option.hidden ?? false;

                return (
                  <option key={value} value={value} disabled={disabled} hidden={hidden}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        );
      }}
    </FormField>
  );

  return label ? <Label {...(labelProps ?? {})} text={label} required={required}>{selectWrapper}</Label> : selectWrapper;
};

export default Select;
