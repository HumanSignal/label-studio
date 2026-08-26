/**
 * AI chat kit thinking / reasoning panel.
 *
 * Expandable trace pattern inspired by Beautiful UI Thinking
 * (https://beautiful-ui-five.vercel.app) — adapted for HumanSignal semantic tokens.
 * Presentation-only: callers own LLM/session state via props.
 */
import { CaretDownIcon, IconSparkle } from "@humansignal/icons";
import { type HTMLAttributes, type ReactNode, useState } from "react";
import { cn } from "../../../utils/utils";
import { Typography } from "../../typography/typography";
import { AiChatLoadingIcon } from "../ai-chat-loading";
import styles from "./ai-chat-thinking.module.css";

export type AiChatThinkingStatus = "idle" | "loading" | "complete";

export interface AiChatThinkingStep {
  primary: string;
  secondary?: string;
  href?: string;
  mono?: boolean;
}

export interface AiChatThinkingProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Active / idle header label. */
  label?: string;
  /** Header label when `status="complete"`. */
  completedLabel?: string;
  status?: AiChatThinkingStatus;
  steps?: AiChatThinkingStep[];
  /** Uncontrolled initial expanded state. */
  defaultExpanded?: boolean;
  /** Controlled expanded state. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Optional body slot replacing the default step list. */
  children?: ReactNode;
}

export function AiChatThinking({
  label = "Thinking",
  completedLabel = "Thought complete",
  status = "idle",
  steps = [],
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  children,
  className,
  ...rest
}: AiChatThinkingProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  const isLoading = status === "loading";
  const headerLabel = status === "complete" ? completedLabel : label;

  const setExpanded = (next: boolean) => {
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  };

  return (
    <div className={cn(styles.root, className)} data-status={status} {...rest}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={isExpanded}
        onClick={() => setExpanded(!isExpanded)}
      >
        {isLoading ? (
          <AiChatLoadingIcon variant="dots" className={styles.loadingIcon} />
        ) : (
          <IconSparkle className={cn(styles.icon, status === "complete" && styles.iconActive)} aria-hidden />
        )}
        <Typography
          variant="label"
          size="small"
          as="span"
          className={cn(styles.label, isLoading && styles.labelShimmer)}
        >
          {headerLabel}
        </Typography>
        <CaretDownIcon
          size={14}
          weight="bold"
          className={cn(styles.chevron, isExpanded && styles.chevronOpen)}
          aria-hidden
        />
      </button>

      {isExpanded ? (
        <div className={styles.panel}>
          {children ?? (
            <ul className={styles.list}>
              {steps.map((step, index) => (
                <li key={`${step.primary}-${index}`} className={styles.step}>
                  <span className={styles.dot} aria-hidden />
                  <div className={styles.stepBody}>
                    {step.href ? (
                      <a href={step.href} className={styles.stepLink} target="_blank" rel="noreferrer">
                        <Typography
                          variant="body"
                          size="small"
                          as="span"
                          className={cn(styles.primary, step.mono && styles.mono)}
                        >
                          {step.primary}
                        </Typography>
                      </a>
                    ) : (
                      <Typography
                        variant="body"
                        size="small"
                        as="span"
                        className={cn(styles.primary, step.mono && styles.mono)}
                      >
                        {step.primary}
                      </Typography>
                    )}
                    {step.secondary ? (
                      <Typography
                        variant="label"
                        size="smaller"
                        as="span"
                        className={cn(styles.secondary, step.mono && styles.mono)}
                      >
                        {step.secondary}
                      </Typography>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
