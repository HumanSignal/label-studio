import { useEffect, useMemo, useState } from "react";
import { cn } from "../../../../utils/bem";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";
import { Select as SelectUI } from "@humansignal/ui";

const _SelectOption = ({ value, label, disabled = false, hidden = false, ...props }) => {
  return (
    <option value={value} disabled={disabled} hidden={hidden} {...props}>
      {label ?? value}
    </option>
  );
};

const Select = ({ label, className, options, validate, required, skip, labelProps, groupProps, ghost, ...props }) => {
  const rootClass = cn("select-ls");
  const initialValue = useMemo(() => props.value ?? "", [props.value]);
  const [value, setValue] = useState(initialValue);

  const grouped = options.reduce((groupedOptions, option) => {
    const key = option.group || "NoGroup"; // fallback group for items without a group property

    (groupedOptions[key] = groupedOptions[key] || []).push(option);
    return groupedOptions;
  }, {});

  const _classList = rootClass.mod({ ghost }).mix(className);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const selectOptions = useMemo(() => {
    return Object.keys(grouped).flatMap((group) => {
      return group === "NoGroup"
        ? grouped[group]
        : (grouped[group] = {
            label: group,
            children: grouped[group],
          });
    });
  }, [grouped]);

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
          <SelectUI
            {...props}
            value={value}
            onChange={(val) => {
              setValue(val);
              props.onChange?.(val);
            }}
            ref={ref}
            options={selectOptions}
          />
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
