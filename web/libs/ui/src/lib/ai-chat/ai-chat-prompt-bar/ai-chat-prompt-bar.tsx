/**
 * AI chat kit prompt / composer bar.
 *
 * Composer pattern inspired by Beautiful UI Prompt Bar
 * (https://beautiful-ui-five.vercel.app) — adapted for HumanSignal semantic tokens.
 * Presentation-only: attach / stop / plan toggle / model picker are slots — no LLM logic.
 */
import {
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useState,
} from "react";
import { cn } from "../../../utils/utils";
import { Button } from "../../button/button";
import styles from "./ai-chat-prompt-bar.module.css";

export type AiChatPromptBarStatus = "idle" | "submitting" | "streaming";
export type AiChatPromptBarShape = "rounded" | "pill";
/** `stacked` = textarea above tools (Beautiful UI / ChatGPT-style). `inline` = single row. */
export type AiChatPromptBarLayout = "stacked" | "inline";

export interface AiChatPromptBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSubmit" | "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with trimmed value when the user submits. */
  onSubmit?: (value: string) => void;
  /** Shown while `status="streaming"` (or `submitting` when stop is preferred). */
  onStop?: () => void;
  placeholder?: string;
  status?: AiChatPromptBarStatus;
  disabled?: boolean;
  /** Visual shell shape. */
  shape?: AiChatPromptBarShape;
  /** Composer layout. Defaults to stacked for Beautiful UI parity. */
  layout?: AiChatPromptBarLayout;
  /** Leading actions (e.g. attach / @ sources). */
  leadingSlot?: ReactNode;
  /** Trailing chrome (e.g. model picker, mic, send). */
  trailingSlot?: ReactNode;
  /** Plan-mode toggle — rendered in the trailing cluster (Replit: Plan, then mic/send). */
  planToggleSlot?: ReactNode;
  submitLabel?: string;
  stopLabel?: string;
  /** Hide the built-in send/stop control when the consumer provides its own. */
  showPrimaryAction?: boolean;
  textareaProps?: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "defaultValue" | "onChange" | "disabled" | "placeholder"
  >;
}

export function AiChatPromptBar({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onStop,
  placeholder = "Message…",
  status = "idle",
  disabled = false,
  shape = "rounded",
  layout = "stacked",
  leadingSlot,
  trailingSlot,
  planToggleSlot,
  submitLabel = "Send",
  stopLabel = "Stop",
  showPrimaryAction = true,
  textareaProps,
  className,
  ...rest
}: AiChatPromptBarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const isBusy = status === "streaming" || status === "submitting";
  const showStop = status === "streaming" && typeof onStop === "function";
  const hasLeading = Boolean(leadingSlot);

  const setValue = (next: string) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  const submit = () => {
    if (disabled || isBusy) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    textareaProps?.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const primaryAction = showPrimaryAction ? (
    showStop ? (
      <Button type="button" size="small" variant="neutral" look="outlined" onClick={onStop} disabled={disabled}>
        {stopLabel}
      </Button>
    ) : (
      <Button
        type="submit"
        size="small"
        variant="primary"
        disabled={disabled || isBusy || !value.trim()}
        waiting={status === "submitting"}
      >
        {submitLabel}
      </Button>
    )
  ) : null;

  return (
    <div className={cn(styles.root, className)} data-shape={shape} data-layout={layout} data-status={status} {...rest}>
      <form className={styles.form} onSubmit={onFormSubmit}>
        <textarea
          {...textareaProps}
          className={cn(styles.textarea, textareaProps?.className)}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          rows={textareaProps?.rows ?? 3}
          aria-label={textareaProps?.["aria-label"] ?? placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className={styles.actions}>
          {hasLeading ? <div className={styles.leading}>{leadingSlot}</div> : <div className={styles.leading} />}
          <div className={styles.trailing}>
            {planToggleSlot}
            {trailingSlot}
            {primaryAction}
          </div>
        </div>
      </form>
    </div>
  );
}
