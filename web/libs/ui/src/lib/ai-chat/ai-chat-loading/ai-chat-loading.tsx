/**
 * AI chat kit loading indicator.
 *
 * Visual pattern inspired by Beautiful UI Loading State
 * (https://beautiful-ui-five.vercel.app) — adapted for HumanSignal semantic tokens.
 * No Beautiful UI source was copied; colors and spacing use HS design tokens only.
 */
import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "../../../utils/utils";
import { Typography } from "../../typography/typography";
import styles from "./ai-chat-loading.module.css";

export type AiChatLoadingVariant = "drive" | "dots" | "orbit";

export interface AiChatLoadingIconProps extends HTMLAttributes<HTMLSpanElement> {
  /** Pixel animation pattern. Defaults to `"dots"` for highwater rows. */
  variant?: AiChatLoadingVariant;
}

export interface AiChatLoadingProps extends HTMLAttributes<HTMLDivElement> {
  /** Status label shown beside the pixel grid. */
  label?: string;
  /** Pixel animation pattern. */
  variant?: AiChatLoadingVariant;
  /** Controlled elapsed label (e.g. `"1.2s"`). Prefer controlled props over internal timers. */
  elapsed?: string;
  /** When true and `elapsed` is set, show the elapsed label. Defaults to true when `elapsed` is provided. */
  showElapsed?: boolean;
}

const DRIVE_DELAYS = [0, 90, 180, 90, 180, 270, 180, 270, 360];
const DOTS_DELAYS = DRIVE_DELAYS;
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const ORBIT_DELAYS = Array.from({ length: 9 }, (_, index) => {
  const order = ORBIT_ORDER.indexOf(index);
  return order === -1 ? null : order * 110;
});

const VARIANT_CONFIG: Record<
  AiChatLoadingVariant,
  { delays: Array<number | null>; durationMs: number; round: boolean }
> = {
  drive: { delays: DRIVE_DELAYS, durationMs: 650, round: false },
  dots: { delays: DOTS_DELAYS, durationMs: 650, round: true },
  orbit: { delays: ORBIT_DELAYS, durationMs: 950, round: false },
};

/**
 * Compact pixel-grid loading icon for highwater / in-progress chat rows
 * (Replit/Lovable-style “work is happening” affordance).
 */
export function AiChatLoadingIcon({ variant = "dots", className, ...rest }: AiChatLoadingIconProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <span
      className={cn(styles.grid, className)}
      data-variant={variant}
      data-testid="ai-chat-loading-icon"
      aria-hidden="true"
      {...rest}
    >
      {config.delays.map((delay, index) => (
        <span
          key={`${variant}-${index}`}
          className={cn(
            styles.pixel,
            config.round && styles.pixelRound,
            delay === null ? styles.pixelIdle : styles.pixelAnimated,
          )}
          style={
            delay === null
              ? undefined
              : ({
                  "--ai-chat-pixel-duration": `${config.durationMs}ms`,
                  "--ai-chat-pixel-delay": `${delay}ms`,
                } as CSSProperties)
          }
        />
      ))}
    </span>
  );
}

export function AiChatLoading({
  label = "Loading",
  variant = "drive",
  elapsed,
  showElapsed,
  className,
  ...rest
}: AiChatLoadingProps) {
  const shouldShowElapsed = showElapsed ?? elapsed != null;
  const accessibleName = shouldShowElapsed && elapsed ? `${label}, ${elapsed}` : label;

  return (
    <div role="status" aria-label={accessibleName} className={cn(styles.root, className)} {...rest}>
      <AiChatLoadingIcon variant={variant} />
      <Typography variant="label" size="small" as="span" className={styles.label} aria-hidden="true">
        {label}
      </Typography>
      {shouldShowElapsed && elapsed != null ? (
        <Typography variant="label" size="smaller" as="span" className={styles.elapsed}>
          {elapsed}
        </Typography>
      ) : null}
    </div>
  );
}
