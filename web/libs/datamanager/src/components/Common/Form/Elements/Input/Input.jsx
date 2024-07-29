import { cn } from "../../../../../utils/bem";
import { FF_LOPS_E_10, isFF } from "../../../../../utils/feature-flags";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";
import "./Input.scss";

const Input = ({ label, className, validate, required, skip, labelProps, ghost, ...props }) => {
  const mods = {
    ghost,
    newUI: isFF(FF_LOPS_E_10),
  };
  const classList = [cn("form-input").mod(mods), className].join(" ").trim();

  const input = (
    <FormField label={label} name={props.name} validate={validate} required={required} skip={skip} {...props}>
      {({ ref }) => <input {...props} ref={ref} className={classList} />}
    </FormField>
  );

  return label ? (
    <Label {...(labelProps ?? {})} text={label} required={required}>
      {input}
    </Label>
  ) : (
    input
  );
};

export default Input;
