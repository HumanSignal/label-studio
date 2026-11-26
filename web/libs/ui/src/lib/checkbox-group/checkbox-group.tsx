import clsx from "clsx";
import { type ReactNode, useId, useState } from "react";
import { Field, type FieldChromeProps } from "../field/field";
import { CheckboxGroupContext } from "./context";
import styles from "./checkbox-group.module.css";

export interface CheckboxGroupProps extends Omit<FieldChromeProps, "layout"> {
  /** Shared by the checkboxes; generated when omitted. */
  name?: string;
  /** The values of the checked boxes. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** Names the group when there is no visible label. */
  "aria-label"?: string;
  /** Checkboxes, each with a `value`. */
  children: ReactNode;
}

/** Several checkboxes whose checked values form one list, in a fieldset named by the label. */
export const CheckboxGroup = ({
  name,
  value,
  defaultValue = [],
  onValueChange,
  orientation = "vertical",
  disabled = false,
  invalid = false,
  className,
  "aria-label": ariaLabel,
  children,
  label,
  description,
  info,
  required,
  hint,
  error,
}: CheckboxGroupProps) => {
  const generated = useId();
  const [inner, setInner] = useState<string[]>(defaultValue);
  const values = value ?? inner;

  const toggle = (item: string, checked: boolean) => {
    const next = checked ? [...values.filter((v) => v !== item), item] : values.filter((v) => v !== item);
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const boxes = (
    <div
      className={clsx(styles.options, className)}
      data-orientation={orientation}
      role={label ? undefined : "group"}
      aria-label={label ? undefined : ariaLabel}
    >
      {children}
    </div>
  );

  return (
    <CheckboxGroupContext.Provider
      value={{ name: name ?? `checkbox-${generated}`, values, disabled, invalid: invalid || Boolean(error), toggle }}
    >
      {label || description || hint || error ? (
        <Field group label={label} description={description} info={info} required={required} hint={hint} error={error}>
          {boxes}
        </Field>
      ) : (
        boxes
      )}
    </CheckboxGroupContext.Provider>
  );
};
