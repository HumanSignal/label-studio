import { UploadSimpleIcon } from "@humansignal/icons";
import clsx from "clsx";
import {
  type ChangeEvent,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { type ButtonProps, buttonVariant } from "../button/button";
import styles from "./InputFile.module.css";

export interface InputFileProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Button text. */
  text?: ReactNode;
  /** Matches Button: medium 40px, small 32px, smaller 24px. */
  size?: ButtonProps["size"];
  /** Matches Button; outlined by default. */
  look?: ButtonProps["look"];
  /** Draws the error state and sets `aria-invalid`. */
  invalid?: boolean;
  /** Shows the chosen file names next to the button (the default). */
  showFileNames?: boolean;
  /** @deprecated Spread the input props directly. */
  props?: Record<string, unknown>;
}

/**
 * A button that opens the file picker, on a native file input. The ref points at the input, so a
 * form can read its files. For a drag-and-drop area use DropZone.
 */
export const InputFile = forwardRef<HTMLInputElement, InputFileProps>(
  (
    {
      text,
      size = "medium",
      look = "outlined",
      invalid = false,
      showFileNames = true,
      className,
      onChange,
      disabled,
      props: legacyProps,
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    const [names, setNames] = useState<string[]>([]);

    // A caller that clears the input with `input.value = ""` fires no change event, so watch the
    // assignment itself and drop the names with it. React already tracks `value` on the element, so
    // wrap whatever accessor is there instead of replacing it.
    useEffect(() => {
      const input = inputRef.current;
      if (!input) return;
      const own = Object.getOwnPropertyDescriptor(input, "value");
      const current = own ?? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      if (!current?.set || !current.get) return;
      Object.defineProperty(input, "value", {
        configurable: true,
        enumerable: current.enumerable,
        get: () => current.get?.call(input),
        set: (next: string) => {
          current.set?.call(input, next);
          if (!next) setNames([]);
        },
      });
      return () => {
        if (own) Object.defineProperty(input, "value", own);
        else delete (input as { value?: string }).value;
      };
    }, []);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      setNames(Array.from(event.target.files ?? []).map((file) => file.name));
      onChange?.(event);
    };

    return (
      <span className={clsx(styles.inputFile, className)} data-invalid={invalid || undefined}>
        <label
          className={clsx(
            buttonVariant({ variant: invalid ? "negative" : "primary", look, size }),
            styles.button,
            disabled && styles.disabled,
          )}
        >
          <UploadSimpleIcon size={16} weight="bold" aria-hidden="true" />
          {text ?? "Upload Image"}
          <input
            {...legacyProps}
            {...props}
            ref={inputRef}
            type="file"
            className={styles.input}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            onChange={handleChange}
          />
        </label>
        {showFileNames && names.length > 0 && <span className={styles.names}>{names.join(", ")}</span>}
      </span>
    );
  },
);

InputFile.displayName = "InputFile";
