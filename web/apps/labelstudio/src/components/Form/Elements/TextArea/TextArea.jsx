import { cn } from "../../../../utils/bem";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";

const TextArea = ({ label, className, validate, required, skip, labelProps, ...props }) => {
  const classList = [cn("textarea-ls"), className].join(" ").trim();

  const input = (
    <FormField label={label} name={props.name} validate={validate} required={required} skip={skip} {...props}>
      {(ref) => <textarea {...props} ref={ref} className={classList} />}
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

export default TextArea;
