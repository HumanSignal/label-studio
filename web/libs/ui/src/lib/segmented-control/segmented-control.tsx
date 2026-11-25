import { clsx } from "clsx";
import styles from "./segmented-control.module.css";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ControlSize } from "../../ds-manifest/control-sizes";
import { Tooltip } from "../Tooltip/Tooltip";

export interface SegmentedControlOption {
  label?: string | JSX.Element;
  value: string;
  /** Shown on hover. Also the option's accessible name when the label is only an icon. */
  tooltip?: string;
  "aria-label"?: string;
  /** Overrides the default `${data-testid}-${value}` id. */
  "data-testid"?: string;
  className?: string;
  /** Disables this option alone; arrow keys skip it. */
  disabled?: boolean;
}

export interface SegmentedControlProps {
  selectedOption: string;
  /** Manual activation moves focus with arrows; Enter/Space or click commits the selected value. */
  activationMode?: "automatic" | "manual";
  options?: SegmentedControlOption[];
  onChange?: (option: string) => void;
  /** Stretches the control (and its options evenly) to fill the width of its container, e.g. a filter dropdown. */
  fullWidth?: boolean;
  size?: ControlSize;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

export const SegmentedControl = ({
  options = [],
  selectedOption,
  activationMode = "automatic",
  onChange,
  fullWidth,
  size = "medium",
  disabled = false,
  className,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: SegmentedControlProps) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = useMemo(() => {
    return options.findIndex((option: SegmentedControlOption) => option.value === selectedOption);
  }, [options, selectedOption]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    let nextIndex = index;
    for (let step = 0; step < options.length; step++) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) break;
    }
    const nextOption = options[nextIndex];
    if (!nextOption || nextOption.disabled || nextIndex === index) return;
    if (activationMode === "automatic") onChange?.(nextOption.value);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      className={clsx(styles.segmentedControl, { [styles.segmentedControl_fullWidth]: fullWidth }, className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedIndex(null);
      }}
      data-size={size}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      data-testid={dataTestId}
    >
      {options?.map((option, index) => {
        const button = (
          <button
            key={option.value}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            className={clsx(
              styles.segmentedControl__option,
              { [styles.segmentedControl__option_selected]: selectedIndex === index },
              option.className,
            )}
            onClick={() => onChange?.(option.value)}
            onFocus={() => {
              if (activationMode === "manual") setFocusedIndex(index);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            type="button"
            disabled={disabled || option.disabled}
            role="radio"
            aria-checked={selectedIndex === index}
            aria-label={option["aria-label"] ?? option.tooltip}
            tabIndex={
              (activationMode === "manual" && focusedIndex !== null ? focusedIndex : Math.max(0, selectedIndex)) ===
              index
                ? 0
                : -1
            }
            data-testid={option["data-testid"] ?? (dataTestId ? `${dataTestId}-${option.value}` : undefined)}
          >
            {option.label ?? option.value}
          </button>
        );
        return option.tooltip ? (
          <Tooltip key={option.value} title={option.tooltip}>
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
};

export default SegmentedControl;
