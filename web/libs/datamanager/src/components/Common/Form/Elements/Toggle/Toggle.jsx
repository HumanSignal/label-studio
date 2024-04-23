import { forwardRef, useEffect, useMemo, useState } from "react";
import { cn } from "../../../../../utils/bem";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";
import "./Toggle.styl";

const Toggle = forwardRef(
  (
    {
      className,
      label,
      labelProps,
      description,
      checked,
      defaultChecked,
      onChange,
      validate,
      required,
      skip,
      ...props
    },
    ref,
  ) => {
    const rootClass = cn("toggle");
    const initialChecked = useMemo(() => defaultChecked ?? checked ?? false, [defaultChecked, checked]);
    const [isChecked, setIsChecked] = useState(defaultChecked ?? checked ?? false);

    const classList = [rootClass];
    const mods = {};

    useEffect(() => {
      setIsChecked(initialChecked);
    }, [initialChecked]);

    if (isChecked) mods.checked = isChecked;
    mods.disabled = props.disabled;

    classList.push(rootClass.mod(mods), className);

    const formField = (
      <FormField
        ref={label ? null : ref}
        label={label}
        name={props.name}
        validate={validate}
        required={required}
        skip={skip}
        setValue={(value) => setIsChecked(value)}
        {...props}
      >
        {({ ref }) => (
          <div className={classList.join(" ")}>
            <input
              ref={ref}
              {...props}
              className={rootClass.elem("input")}
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                setIsChecked(e.target.checked);
                onChange?.(e);
              }}
            />
            <span className={rootClass.elem("indicator")} />
          </div>
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

export default Toggle;
