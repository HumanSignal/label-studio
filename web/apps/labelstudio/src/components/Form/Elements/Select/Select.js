import React, { useEffect, useMemo, useState } from "react";
import { cn } from "../../../../utils/bem";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";
import "./Select.styl";

const SelectOption = ({ value, label, disabled = false, hidden = false, ...props }) => {
  return (
    <option value={value} disabled={disabled} hidden={hidden} {...props}>
      {label ?? value}
    </option>
  );
};

const Select = ({ label, className, options, validate, required, skip, labelProps, groupProps, ghost, ...props }) => {
  const rootClass = cn("select");
  const initialValue = useMemo(() => props.value ?? "", [props.value]);
  const [value, setValue] = useState(initialValue);

  const grouped = options.reduce((groupedOptions, option) => {
    const key = option.group || "NoGroup"; // fallback group for items without a group property

    (groupedOptions[key] = groupedOptions[key] || []).push(option);
    return groupedOptions;
  }, {});

  const renderOptions = (option) => {
    return <SelectOption {...(option.value ? { ...option, key: option.value } : { value: option, key: option })} />;
  };

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
      setValue={(val) => setValue(val)}
      {...props}
    >
      {(ref) => {
        return (
          <div className={classList}>
            <select
              {...props}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                props.onChange?.(e);
              }}
              ref={ref}
              className={rootClass.elem("list")}
            >
              {props.placeholder && (!props.defaulValue || !props.value) && (
                <option value="" disabled hidden>
                  {props.placeholder}
                </option>
              )}

              {Object.keys(grouped).map((group) => {
                return group === "NoGroup" ? (
                  grouped[group].map(renderOptions)
                ) : (
                  <optgroup label={group}>{grouped[group].map(renderOptions)}</optgroup>
                );
              })}
            </select>
          </div>
        );
      }}
    </FormField>
  );

  return label ? (
    <Label {...(labelProps ?? {})} text={label} required={required}>
      {selectWrapper}
    </Label>
  ) : (
    selectWrapper
  );
};

export default Select;
