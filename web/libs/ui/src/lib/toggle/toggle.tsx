import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Label } from "@humansignal/ui";
import styles from "./toggle.module.css";

type ToggleProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  className?: string;
  label?: string;
  labelProps?: Partial<React.ComponentProps<typeof Label>>;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Draws the error state and sets `aria-invalid`. */
  invalid?: boolean;
  /**
   * With a label: `start` puts the toggle before the label (the default); `end` puts it at the right
   * edge, for narrow forms where it stays close to its label.
   */
  align?: "start" | "end";
  required?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
  alwaysBlue?: boolean;
};

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      className,
      label,
      labelProps,
      description,
      checked,
      defaultChecked,
      onChange,
      required,
      style,
      alwaysBlue,
      invalid = false,
      align = "start",
      ...props
    },
    ref,
  ) => {
    const initialChecked = useMemo(() => defaultChecked ?? checked ?? false, [defaultChecked, checked]);
    const [isChecked, setIsChecked] = useState<boolean>(defaultChecked ?? checked ?? false);
    useEffect(() => {
      setIsChecked(initialChecked);
    }, [initialChecked]);

    const onChangeHandler = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (typeof checked === "undefined") {
          setIsChecked(e.target.checked);
        }
        onChange?.(e);
      },
      [onChange, checked],
    );

    const formField = (
      <div
        className={clsx(
          styles.toggle,
          {
            [styles.toggle_disabled]: props.disabled,
            [styles.toggle_checked]: isChecked,
            [styles.toggle_alwaysBlue]: alwaysBlue,
            [styles.toggle_invalid]: invalid,
          },
          className,
        )}
        style={style}
      >
        <input
          {...props}
          ref={ref}
          className={clsx(styles.toggle__input)}
          type="checkbox"
          checked={isChecked}
          aria-invalid={invalid || undefined}
          onChange={onChangeHandler}
        />
        <span className={clsx(styles.toggle__indicator)} />
      </div>
    );

    return label ? (
      <Label
        placement={align === "end" ? "left" : "right"}
        required={required}
        text={label}
        description={description}
        className={clsx(styles.toggle_label, align === "end" && styles.toggle_alignEnd)}
        {...(labelProps ?? {})}
      >
        {formField}
      </Label>
    ) : (
      formField
    );
  },
);
