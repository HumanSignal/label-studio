import { forwardRef } from "react";
import { Range } from "../../../Range/Range";
import { FormField } from "../../FormField";
import { useValueTracker } from "../../Utils";
import { default as Label } from "../Label/Label";

const RangeField = forwardRef(
  ({ label, className, validate, required, skip, labelProps, description, ...props }, ref) => {
    const [value, setValue] = useValueTracker(props.value, props.defaultValue);

    const formField = (
      <FormField
        ref={ref}
        label={label}
        name={props.name}
        validate={validate}
        required={required}
        skip={skip}
        setValue={(val) => setValue(val)}
        {...props}
      >
        {({ ref, context }) => (
          <Range
            {...props}
            ref={ref}
            className={className}
            onChange={(e) => {
              context.autosubmit();
              props.onChange?.(e);
            }}
            value={value}
          />
        )}
      </FormField>
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
    ) : (
      formField
    );
  },
);

export default RangeField;
