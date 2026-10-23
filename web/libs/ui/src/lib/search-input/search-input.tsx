import { MagnifyingGlassIcon } from "@humansignal/icons";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type InputHTMLAttributes } from "react";
import clsx from "clsx";
import styles from "./search-input.module.css";

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Apply the shared appearance to a specialized input, such as a command combobox. */
  asChild?: boolean;
  /** Class for the surrounding icon and border; className applies to the input. */
  wrapperClassName?: string;
  wrapperDataSlot?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      asChild = false,
      wrapperClassName,
      wrapperDataSlot = "search-input-wrapper",
      className,
      placeholder,
      type,
      ...props
    },
    ref,
  ) => {
    const inputPlaceholder = placeholder ?? (asChild ? undefined : "Search...");
    const Input = asChild ? Slot : "input";
    return (
      <div className={clsx(styles.container, wrapperClassName)} data-slot={wrapperDataSlot}>
        <MagnifyingGlassIcon className={styles.icon} aria-hidden="true" />
        <Input
          ref={ref}
          type={type ?? (asChild ? undefined : "search")}
          placeholder={inputPlaceholder}
          aria-label={
            props["aria-labelledby"] ? undefined : (props["aria-label"] ?? (asChild ? undefined : inputPlaceholder))
          }
          {...props}
          className={clsx(styles.input, className)}
        />
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
