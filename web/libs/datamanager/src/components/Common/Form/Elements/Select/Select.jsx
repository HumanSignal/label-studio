import { cn } from "../../../../../utils/bem";
import { FormField } from "../../FormField";
import { useValueTracker } from "../../Utils";
import { default as Label } from "../Label/Label";
import { Select as SelectUI } from "@humansignal/ui";

const Select = ({
  label,
  className,
  options,
  validate,
  required,
  skip,
  labelProps,
  ghost,
  size = "medium",
  defaultValue,
  contentClassName,
  ...props
}) => {
  const rootClass = cn("form-select");
  const [value, setValue] = useValueTracker(props.value, defaultValue);

  const selectWrapper = (
    <FormField
      name={props.name}
      label={label}
      validate={validate}
      required={required}
      skip={skip}
      setValue={(val) => {
        setValue(val);
      }}
      {...props}
    >
      {({ ref }) => {
        return (
          <SelectUI
            {...props}
            ref={ref}
            value={value}
            onChange={(val) => {
              setValue(val);
              props.onChange?.(val);
            }}
            triggerClassName={rootClass.elem("list").toString()}
            options={options?.toJSON ? options.toJSON() : options}
            size={size}
            contentClassName={contentClassName}
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
