/**
 * AI chat kit approval card.
 *
 * Human-in-the-loop choice pattern inspired by Beautiful UI Approval Card
 * (https://beautiful-ui-five.vercel.app) — adapted for HumanSignal semantic tokens.
 * Presentation-only: selection and confirm are props/callbacks; no agent logic.
 */
import { type HTMLAttributes, type ReactNode, useState } from "react";
import { cn } from "../../../utils/utils";
import { Button } from "../../button/button";
import { Typography } from "../../typography/typography";
import styles from "./ai-chat-approval-card.module.css";

export interface AiChatApprovalOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface AiChatApprovalCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Primary question the agent is asking. */
  question: string;
  /** Optional supporting copy under the question. */
  description?: string;
  /** Optional badge / status chip row (e.g. Badge). */
  badge?: ReactNode;
  options?: AiChatApprovalOption[];
  /** Controlled selected option id. */
  selectedId?: string;
  /** Uncontrolled initial selection. */
  defaultSelectedId?: string;
  onSelect?: (id: string) => void;
  /** Shown when a selection exists (or always when provided with selectedId). */
  confirmLabel?: string;
  onConfirm?: (id: string) => void;
  /** Custom footer actions replacing the default confirm button. */
  actions?: ReactNode;
  /** Custom body replacing the default option list. */
  children?: ReactNode;
}

export function AiChatApprovalCard({
  question,
  description,
  badge,
  options = [],
  selectedId: controlledSelectedId,
  defaultSelectedId,
  onSelect,
  confirmLabel = "Confirm",
  onConfirm,
  actions,
  children,
  className,
  ...rest
}: AiChatApprovalCardProps) {
  const [internalSelectedId, setInternalSelectedId] = useState(defaultSelectedId);
  const isControlled = controlledSelectedId !== undefined;
  const selectedId = isControlled ? controlledSelectedId : internalSelectedId;

  const selectOption = (id: string) => {
    if (!isControlled) {
      setInternalSelectedId(id);
    }
    onSelect?.(id);
  };

  const footer =
    actions ??
    (onConfirm && selectedId ? (
      <Button type="button" size="small" variant="primary" onClick={() => onConfirm(selectedId)}>
        {confirmLabel}
      </Button>
    ) : null);

  return (
    <div className={cn(styles.root, className)} role="group" aria-label={question} {...rest}>
      {badge ? <div className={styles.badge}>{badge}</div> : null}

      <div className={styles.header}>
        <Typography variant="body" size="medium" as="h3" className={styles.question}>
          {question}
        </Typography>
        {description ? (
          <Typography variant="label" size="small" as="p" className={styles.description}>
            {description}
          </Typography>
        ) : null}
      </div>

      {children ?? (
        <ul className={styles.options}>
          {options.map((option) => {
            const isSelected = selectedId === option.id;
            return (
              <li key={option.id} className={styles.optionItem}>
                <button
                  type="button"
                  className={cn(styles.option, isSelected && styles.optionSelected)}
                  aria-pressed={isSelected}
                  disabled={option.disabled}
                  onClick={() => selectOption(option.id)}
                  data-testid={`ai-chat-approval-option-${option.id}`}
                >
                  <Typography variant="label" size="small" as="span" className={styles.optionLabel}>
                    {option.label}
                  </Typography>
                  {option.description ? (
                    <Typography variant="label" size="smaller" as="span" className={styles.optionDescription}>
                      {option.description}
                    </Typography>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {footer ? <div className={styles.actions}>{footer}</div> : null}
    </div>
  );
}
