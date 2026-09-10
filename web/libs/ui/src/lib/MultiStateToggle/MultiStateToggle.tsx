import { clsx } from "clsx";
import styles from "./MultiStateToggle.module.css";
import { useMemo, useRef, type KeyboardEvent } from "react";

export interface MultiStateToggleOption {
  label?: string | JSX.Element;
  value: string;
}

export interface MultiStateToggleProps {
  selectedOption: string;
  options?: MultiStateToggleOption[];
  onChange?: (option: string) => void;
  /** Stretches the control (and its options evenly) to fill the width of its container, e.g. a filter dropdown. */
  fullWidth?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

export const MultiStateToggle = ({
  options = [],
  selectedOption,
  onChange,
  fullWidth,
  className,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: MultiStateToggleProps) => {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = useMemo(() => {
    return options.findIndex((option: MultiStateToggleOption) => option.value === selectedOption);
  }, [options, selectedOption]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
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
      className={clsx(styles.multiStateToggle, { [styles.multiStateToggle_fullWidth]: fullWidth }, className)}
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={dataTestId}
    >
      {options?.map((option, index) => (
        <button
          key={option.value}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          className={clsx(styles.multiStateToggle__option, {
            [styles.multiStateToggle__option_selected]: selectedIndex === index,
          })}
          onClick={() => onChange?.(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          type="button"
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

export default MultiStateToggle;
