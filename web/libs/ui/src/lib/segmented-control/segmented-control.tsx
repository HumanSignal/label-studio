import { clsx } from "clsx";
import styles from "./segmented-control.module.css";
import { useMemo, useRef, type KeyboardEvent } from "react";

export interface SegmentedControlOption {
  label?: string | JSX.Element;
  value: string;
}

export interface SegmentedControlProps {
  selectedOption: string;
  options?: SegmentedControlOption[];
  onChange?: (option: string) => void;
  /** Stretches the control (and its options evenly) to fill the width of its container, e.g. a filter dropdown. */
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

export const SegmentedControl = ({
  options = [],
  selectedOption,
  onChange,
  fullWidth,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: SegmentedControlProps) => {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = useMemo(() => {
    return options.findIndex((option: SegmentedControlOption) => option.value === selectedOption);
  }, [options, selectedOption]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = (index + direction + options.length) % options.length;
    const nextOption = options[nextIndex];
    if (!nextOption) return;
    onChange?.(nextOption.value);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      className={clsx(styles.segmentedControl, { [styles.segmentedControl_fullWidth]: fullWidth }, className)}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      data-testid={dataTestId}
    >
      {options?.map((option, index) => (
        <button
          key={option.value}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          className={clsx(styles.segmentedControl__option, {
            [styles.segmentedControl__option_selected]: selectedIndex === index,
          })}
          onClick={() => onChange?.(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={selectedIndex === index}
          tabIndex={selectedIndex === index || (selectedIndex === -1 && index === 0) ? 0 : -1}
          data-testid={dataTestId ? `${dataTestId}-${option.value}` : undefined}
        >
          {option?.label ?? option.value}
        </button>
      ))}
    </div>
  );
};

/** @deprecated Use `SegmentedControl`. */
export const MultiStateToggle = SegmentedControl;
/** @deprecated Use `SegmentedControlOption`. */
export type MultiStateToggleOption = SegmentedControlOption;
/** @deprecated Use `SegmentedControlProps`. */
export type MultiStateToggleProps = SegmentedControlProps;

export default SegmentedControl;
