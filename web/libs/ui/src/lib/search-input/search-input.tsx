import { MagnifyingGlassIcon, XIcon } from "@humansignal/icons";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef, useRef, useState, type InputHTMLAttributes } from "react";
import clsx from "clsx";
import { Button } from "../button/button";
import type { ControlSize } from "../../ds-manifest/control-sizes";
import { useFieldFocus } from "../input/use-field-focus";
import styles from "./search-input.module.css";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: ControlSize;
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
      size = "medium",
      wrapperClassName,
      wrapperDataSlot = "search-input-wrapper",
      className,
      placeholder,
      type,
      onFocus,
      onBlur,
      onChange,
      ...props
    },
    ref,
  ) => {
    const { focusVisible, handlers } = useFieldFocus<HTMLInputElement>(onFocus, onBlur);
    const inputPlaceholder = placeholder ?? (asChild ? undefined : "Search...");
    const Input = asChild ? Slot : "input";
    const inputRef = useRef<HTMLInputElement | null>(null);
    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };
    const [typed, setTyped] = useState(() => String(props.defaultValue ?? "").length > 0);
    const hasText = props.value !== undefined ? String(props.value).length > 0 : typed;
    const clearable = !asChild && hasText && !props.disabled && !props.readOnly;
    // Setting the value natively and firing `input` reaches the caller's onChange, controlled or not.
    const clear = () => {
      const input = inputRef.current;
      if (!input) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    };
    return (
      <div
        className={clsx(styles.container, wrapperClassName)}
        data-slot={wrapperDataSlot}
        data-size={size}
        data-focus-visible={focusVisible || undefined}
        onPointerDown={handlers.onPointerDown}
      >
        <MagnifyingGlassIcon className={styles.icon} aria-hidden="true" />
        <Input
          ref={setRefs}
          type={type ?? (asChild ? undefined : "search")}
          placeholder={inputPlaceholder}
          aria-label={
            props["aria-labelledby"] ? undefined : (props["aria-label"] ?? (asChild ? undefined : inputPlaceholder))
          }
          {...props}
          onChange={
            asChild
              ? onChange
              : (event) => {
                  setTyped(event.target.value.length > 0);
                  onChange?.(event);
                }
          }
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
          className={clsx(styles.input, className)}
        />
        {clearable ? (
          <Button
            type="button"
            look="ghost"
            variant="neutral"
            size="smaller"
            className={styles.clear}
            aria-label="Clear search"
            icon={<XIcon weight="bold" />}
            onClick={clear}
          />
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
