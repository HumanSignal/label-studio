import clsx from "clsx";
import {
  type ChangeEvent,
  createContext,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react";
import { Field, type FieldChromeProps } from "../field/field";
import styles from "./radio-group.module.css";

type RadioGroupContextValue = {
  name: string;
  value: string | undefined;
  disabled: boolean;
  invalid: boolean;
  variant: "list" | "card";
  select: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends Omit<FieldChromeProps, "layout"> {
  /** Shared by the radios; generated when omitted. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `list`: radios with a label and description. `card`: each option is a bordered card in a wrapping grid, icon on top, no radio dot. */
  variant?: "list" | "card";
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** Names the group when there is no visible label. */
  "aria-label"?: string;
  children: ReactNode;
}

/**
 * One choice among several described options. Renders native radios in a fieldset, so the browser
 * gives the group one tab stop, arrow-key navigation and its name for screen readers.
 */
export const RadioGroup = ({
  name,
  value,
  defaultValue,
  onValueChange,
  variant = "list",
  orientation = "vertical",
  disabled = false,
  invalid = false,
  className,
  children,
  "aria-label": ariaLabel,
  label,
  description,
  info,
  required,
  hint,
  error,
}: RadioGroupProps) => {
  const generated = useId();
  const [inner, setInner] = useState(defaultValue);
  const current = value !== undefined ? value : inner;

  const context: RadioGroupContextValue = {
    name: name ?? `radio-${generated}`,
    value: current,
    disabled,
    invalid: invalid || Boolean(error),
    variant,
    select: (next) => {
      if (value === undefined) setInner(next);
      onValueChange?.(next);
    },
  };

  const options = (
    <div
      className={clsx(styles.options, className)}
      data-orientation={orientation}
      data-variant={variant}
      role={label ? undefined : "radiogroup"}
      aria-label={label ? undefined : ariaLabel}
      aria-invalid={!label && context.invalid ? true : undefined}
    >
      {children}
    </div>
  );

  return (
    <RadioGroupContext.Provider value={context}>
      {label || description || hint || error ? (
        <Field group label={label} description={description} info={info} required={required} hint={hint} error={error}>
          {options}
        </Field>
      ) : (
        options
      )}
    </RadioGroupContext.Provider>
  );
};

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "name"> {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  /** Card variant only: an icon above the title. */
  icon?: ReactNode;
}

/** One option of a RadioGroup. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ value, label, description, icon, disabled, className, onChange, ...props }, ref) => {
    const group = useContext(RadioGroupContext);
    if (!group) throw new Error("Radio must be rendered inside a RadioGroup");
    const isDisabled = disabled || group.disabled;
    const checked = group.value === value;

    return (
      <label
        className={clsx(styles.option, className)}
        data-variant={group.variant}
        data-checked={checked || undefined}
        data-disabled={isDisabled || undefined}
        data-invalid={group.invalid || undefined}
      >
        <input
          {...props}
          ref={ref}
          type="radio"
          className={styles.radio}
          name={group.name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          aria-invalid={group.invalid || undefined}
          onChange={(event) => {
            group.select(value, event);
            onChange?.(event);
          }}
        />
        {group.variant === "card" && icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.text}>
          <span className={styles.label}>{label}</span>
          {description && <span className={styles.description}>{description}</span>}
        </span>
      </label>
    );
  },
);

Radio.displayName = "Radio";
