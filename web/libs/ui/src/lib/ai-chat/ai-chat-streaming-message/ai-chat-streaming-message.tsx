/**
 * AI chat kit streaming message surface.
 *
 * Streaming answer pattern inspired by Beautiful UI Streaming Text
 * (https://beautiful-ui-five.vercel.app) — adapted for HumanSignal semantic tokens.
 * Presentation-only: content and stream status are props/slots from the consumer.
 */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../../utils/utils";
import { Typography } from "../../typography/typography";
import styles from "./ai-chat-streaming-message.module.css";

export type AiChatStreamingStatus = "idle" | "streaming" | "complete";

export interface AiChatStreamingMessageProps extends HTMLAttributes<HTMLDivElement> {
  /** Plain-text content when children are not provided. */
  content?: string;
  /** Rich message body. Takes precedence over `content`. */
  children?: ReactNode;
  status?: AiChatStreamingStatus;
  /** Force cursor visibility; defaults to true while `status="streaming"`. */
  showCursor?: boolean;
  /** Optional sources row (e.g. Badge / chips). */
  sources?: ReactNode;
  /** Optional action row (copy, regenerate, etc.). */
  actions?: ReactNode;
  /** Optional follow-up prompts slot. */
  followUps?: ReactNode;
}

export function AiChatStreamingMessage({
  content,
  children,
  status = "idle",
  showCursor,
  sources,
  actions,
  followUps,
  className,
  ...rest
}: AiChatStreamingMessageProps) {
  const cursorVisible = showCursor ?? status === "streaming";
  const body = children ?? content;

  return (
    <div className={cn(styles.root, className)} data-status={status} {...rest}>
      <div className={styles.body}>
        {typeof body === "string" ? (
          <Typography variant="body" size="medium" as="div" className={styles.text}>
            {body}
            {cursorVisible ? (
              <span className={styles.cursor} data-testid="ai-chat-streaming-cursor" aria-hidden />
            ) : null}
          </Typography>
        ) : (
          <div className={styles.text}>
            {body}
            {cursorVisible ? (
              <span className={styles.cursor} data-testid="ai-chat-streaming-cursor" aria-hidden />
            ) : null}
          </div>
        )}
      </div>

      {sources ? <div className={styles.sources}>{sources}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
      {followUps ? <div className={styles.followUps}>{followUps}</div> : null}
    </div>
  );
}
