import { CaretDownIcon, CaretUpIcon, MinusIcon, PlusIcon } from "@humansignal/icons";
import clsx from "clsx";
import { type FocusEvent, forwardRef, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "../button/button";
import { Input, type InputProps } from "../input/input";
import styles from "./number-input.module.css";

export interface NumberInputProps
  extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step" | "trailing"> {
  /** The number, or null when empty. */
  value?: number | null;
  defaultValue?: number | null;
  /** Fires with the parsed number (null when empty) on every valid edit, step and clamp. */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Amount added or removed by the buttons and the arrow keys. */
  step?: number;
  /** Decimal places kept when the field is left. */
  precision?: number;
  /** Text after the number, such as `%` or `minutes`. */
  unit?: ReactNode;
  /**
   * `side`: minus and plus buttons on both ends, larger targets (the default). `compact`: up and down
   * arrows at the right edge, for tight layouts. `none`: no buttons; arrow keys still step.
   */
  stepper?: "side" | "compact" | "none";
}

const parse = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * A number field whose value is a number, never a string. Typing is free; the value is clamped to
 * min and max and rounded to precision when the field is left. Arrow keys and the buttons step.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      defaultValue = null,
      onValueChange,
      min,
      max,
      step = 1,
      precision,
      unit,
      stepper = "side",
      size = "medium",
      disabled,
      readOnly,
      onBlur,
      onKeyDown,
      leading,
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    const controlled = value !== undefined;
    const [inner, setInner] = useState<number | null>(defaultValue);
    const current = controlled ? (value ?? null) : inner;
    const [draft, setDraft] = useState<string>(current === null ? "" : String(current));
    const editing = useRef(false);

    useEffect(() => {
      if (!editing.current) setDraft(current === null ? "" : String(current));
    }, [current]);

    const clamp = (n: number) => {
      let next = n;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      if (precision !== undefined) next = Number(next.toFixed(precision));
      return next;
    };

    const commit = (next: number | null) => {
      if (!controlled) setInner(next);
      setDraft(next === null ? "" : String(next));
      if (next !== current) onValueChange?.(next);
    };

    const stepBy = (direction: 1 | -1) => {
      if (disabled || readOnly) return;
      const base = parse(draft) ?? current ?? min ?? 0;
      commit(clamp(Number((base + direction * step).toFixed(10))));
    };

    const editable = !disabled && !readOnly;
    const atMin = min !== undefined && current !== null && current <= min;
    const atMax = max !== undefined && current !== null && current >= max;

    const stepButton = (direction: 1 | -1, compact = false) => (
      <Button
        type="button"
        look="ghost"
        variant="neutral"
        size="smaller"
        tabIndex={-1}
        className={clsx(styles.step, compact && styles.compactStep)}
        aria-label={direction === 1 ? "Increase" : "Decrease"}
        disabled={!editable || (direction === 1 ? atMax : atMin)}
        onClick={() => stepBy(direction)}
        icon={
          compact ? (
            direction === 1 ? (
              <CaretUpIcon size={12} weight="bold" />
            ) : (
              <CaretDownIcon size={12} weight="bold" />
            )
          ) : direction === 1 ? (
            <PlusIcon size={16} weight="bold" />
          ) : (
            <MinusIcon size={16} weight="bold" />
          )
        }
      />
    );

    const unitNode = unit !== undefined && <span className={clsx(stepper === "none" && styles.unitSlot)}>{unit}</span>;

    return (
      <Input
        {...props}
        ref={ref}
        size={size}
        type="text"
        inputMode={precision === 0 || (precision === undefined && Number.isInteger(step)) ? "numeric" : "decimal"}
        role="spinbutton"
        aria-valuenow={current ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        disabled={disabled}
        readOnly={readOnly}
        value={draft}
        className={clsx(stepper === "side" && styles.centered, className)}
        wrapperClassName={clsx(
          styles.field,
          stepper === "side" && styles.side,
          stepper === "none" && unit !== undefined && styles.unitEnd,
          wrapperClassName,
        )}
        leading={stepper === "side" ? stepButton(-1) : leading}
        trailing={
          stepper === "side" ? (
            <>
              {unitNode}
              {stepButton(1)}
            </>
          ) : stepper === "compact" ? (
            <>
              {unitNode}
              <span className={styles.compact}>
                {stepButton(1, true)}
                {stepButton(-1, true)}
              </span>
            </>
          ) : (
            unitNode || undefined
          )
        }
        onChange={(event) => {
          editing.current = true;
          setDraft(event.target.value);
          const parsed = parse(event.target.value);
          if (parsed !== null || event.target.value.trim() === "") {
            if (!controlled) setInner(parsed);
            if (parsed !== current) onValueChange?.(parsed);
          }
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            stepBy(event.key === "ArrowUp" ? 1 : -1);
          }
          onKeyDown?.(event);
        }}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          editing.current = false;
          const parsed = parse(draft);
          commit(parsed === null ? null : clamp(parsed));
          onBlur?.(event);
        }}
      />
    );
  },
);

NumberInput.displayName = "NumberInput";
