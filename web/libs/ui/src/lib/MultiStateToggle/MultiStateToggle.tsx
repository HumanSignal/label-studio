import { clsx } from "clsx";
import styles from "./MultiStateToggle.module.scss";
import { useMemo } from "react";

export interface MultiStateToggleOption {
  label?: string | JSX.Element;
  value: string;
}

export interface MultiStateToggleProps {
  selectedOption: string;
  options?: MultiStateToggleOption[];
  onChange?: (option: string) => void;
}

export const MultiStateToggle = ({ options = [], selectedOption, onChange }: MultiStateToggleProps) => {
  const selectedIndex = useMemo(() => {
    return options.findIndex((option: MultiStateToggleOption) => option.value === selectedOption);
  }, [options, selectedOption]);
  return (
    <div className={clsx(styles.multiStateToggle)}>
      {options?.map((option, index) => (
        <button
          key={option.value}
          className={clsx(styles.multiStateToggle__option, {
            [styles.multiStateToggle__option_selected]: selectedIndex === index,
          })}
          onClick={() => onChange?.(option.value)}
        >
          {option?.label ?? option.value}
        </button>
      ))}
    </div>
  );
};

export default MultiStateToggle;
