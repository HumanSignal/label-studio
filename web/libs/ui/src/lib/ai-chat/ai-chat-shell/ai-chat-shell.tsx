/**
 * AI chat kit shell composition.
 *
 * Tabbed chat panel layout inspired by Beautiful UI Chat
 * (https://beautiful-ui-five.vercel.app) — adapted for HumanSignal semantic tokens.
 * Presentation-only scaffold: header / body / footer are slots for kit primitives.
 */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../../utils/utils";
import styles from "./ai-chat-shell.module.css";

export interface AiChatShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Top chrome (tabs, title, session controls). */
  header?: ReactNode;
  /** Message / activity stream. */
  children?: ReactNode;
  /** Composer / prompt bar region. */
  footer?: ReactNode;
  /** Shown when `children` is empty / null / undefined. */
  emptyState?: ReactNode;
}

export function AiChatShell({ header, children, footer, emptyState, className, ...rest }: AiChatShellProps) {
  const hasBody = children != null && children !== false;
  const body = hasBody ? children : emptyState;

  return (
    <div className={cn(styles.root, className)} {...rest}>
      {header ? <div className={styles.header}>{header}</div> : null}
      <div className={styles.body}>{body}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
