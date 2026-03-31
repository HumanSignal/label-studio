import { IconCheck } from "@humansignal/icons";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { cnm } from "../../utils/utils";
import { Tooltip } from "../Tooltip/Tooltip";
import { Typography } from "../typography/typography";
import styles from "./stepper.module.css";

export interface StepperStep {
  id?: string;
  label: string;
  /**
   * When `true` and `onStepSelect` is provided, this step can be activated (click / keyboard).
   * When `false` or omitted, selection is blocked but the step is not shown as disabled — use `disabled` for that.
   */
  canNavigate?: boolean;
  /**
   * When `true`, the step uses native `disabled` and muted “disabled” styling. Does not imply anything about
   * `canNavigate`; combine both if you need a greyed-out, non-interactive step.
   */
  disabled?: boolean;
  /**
   * Badge content only: `true` shows the check icon; `false` or omitted shows the step number. Does not control
   * colors — primary vs neutral comes from `currentStepIndex` (active and earlier steps use the primary badge).
   * Connector lines follow `currentStepIndex` only.
   */
  completed?: boolean;
  /** Optional `data-testid` on the step button; default is `<Stepper data-testid>-step-<index>`. */
  "data-testid"?: string;
  /**
   * Optional tooltip for this step (e.g. explaining why a step is not navigable). Uses the shared `Tooltip`
   * component; native `disabled` steps still show tooltips via the tooltip’s disabled-button wrapper when needed.
   */
  tooltip?: ReactNode;
}

export interface StepperProps extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  steps: StepperStep[];
  /** 0-based index of the active step */
  currentStepIndex: number;
  /** Invoked when a navigable step is activated (`canNavigate: true`, not `disabled`, and this handler is set). */
  onStepSelect?: (index: number) => void;
  /** @default 'vertical' */
  variant?: "horizontal" | "vertical";
  className?: string;
  /** Accessible name for the progress navigation region */
  "aria-label"?: string;
  "data-testid"?: string;
}

/** Badge surface: primary for the active step and all steps before it; neutral for future steps. */
export type StepBadgeTone = "primary" | "neutral";

export function getStepPresentation(
  step: StepperStep,
  index: number,
  currentStepIndex: number,
): { badgeTone: StepBadgeTone; showCheck: boolean; labelActive: boolean } {
  const labelActive = index === currentStepIndex;
  const badgeTone: StepBadgeTone = index <= currentStepIndex ? "primary" : "neutral";
  const showCheck = step.completed === true;
  return { badgeTone, showCheck, labelActive };
}

function StepBadge({ index, badgeTone, showCheck }: { index: number; badgeTone: StepBadgeTone; showCheck: boolean }) {
  const n = index + 1;
  const prevShowCheckRef = useRef<boolean | null>(null);
  const [playCompleteEntry, setPlayCompleteEntry] = useState(false);

  useLayoutEffect(() => {
    if (prevShowCheckRef.current === null) {
      prevShowCheckRef.current = showCheck;
      return;
    }
    if (showCheck && prevShowCheckRef.current === false) {
      setPlayCompleteEntry(true);
    } else if (!showCheck) {
      setPlayCompleteEntry(false);
    }
    prevShowCheckRef.current = showCheck;
  }, [showCheck]);

  return (
    <>
      {playCompleteEntry && showCheck ? <span className={styles.badgeEntryRipple} aria-hidden /> : null}
      <span
        data-stepper-badge
        data-stepper-badge-tone={badgeTone}
        data-stepper-badge-check={showCheck ? "true" : undefined}
        className={cnm(
          styles.badge,
          badgeTone === "primary" && styles.badgePrimary,
          !showCheck && styles.badgeNumber,
          showCheck && styles.badgeCompletedStamp,
        )}
      >
        {showCheck ? (
          <>
            <span className={cnm(styles.badgeStamp, playCompleteEntry && styles.badgeStampEnter)} aria-hidden />
            <IconCheck className={cnm(styles.badgeIcon, playCompleteEntry && styles.badgeIconEnter)} aria-hidden />
          </>
        ) : (
          n
        )}
      </span>
    </>
  );
}

function StepConnectorSegment({ complete }: { complete: boolean }) {
  return (
    <div className={styles.connector} role="presentation" aria-hidden>
      <span className={styles.connectorTrack} />
      <span
        className={cnm(styles.connectorFill, complete ? styles.connectorFillComplete : styles.connectorFillIncomplete)}
      />
    </div>
  );
}

export function Stepper({
  steps,
  currentStepIndex,
  onStepSelect,
  variant = "vertical",
  className,
  "aria-label": ariaLabel = "Progress",
  "data-testid": dataTestId = "stepper",
  ...navProps
}: StepperProps) {
  if (steps.length === 0) {
    return null;
  }

  const isHorizontal = variant === "horizontal";

  return (
    <nav aria-label={ariaLabel} className={cnm("w-full z-1 flex-1", className)} data-testid={dataTestId} {...navProps}>
      <ul
        className={cnm(
          "m-0 flex list-none flex-row flex-wrap items-start p-0 relative justify-center",
          !isHorizontal && "w-full",
        )}
      >
        {steps.map((step, index) => {
          const { badgeTone, showCheck, labelActive } = getStepPresentation(step, index, currentStepIndex);
          const hasStepSelect = Boolean(onStepSelect);
          const stepDisabled = step.disabled === true;
          const navigable = step.canNavigate === true && hasStepSelect && !stepDisabled;
          const ariaDisabled = stepDisabled || (hasStepSelect && !navigable);
          const tabIndex = stepDisabled ? undefined : !hasStepSelect || !navigable ? -1 : undefined;

          const stepKey = step.id ?? `step-${index}`;
          const segmentComplete = currentStepIndex > index;
          const isLast = index === steps.length - 1;

          const stepBody = (
            <>
              <span className={styles.badgeWrap} data-stepper-badge-wrap-tone={badgeTone}>
                <StepBadge index={index} badgeTone={badgeTone} showCheck={showCheck} />
              </span>
              <Typography
                as="span"
                variant="label"
                size="small"
                data-stepper-label
                className={cnm(styles.label, labelActive && styles.labelActive)}
              >
                {step.label}
              </Typography>
            </>
          );

          const hasTooltip = step.tooltip != null && step.tooltip !== false;
          const stepButton = (
            <button
              type="button"
              disabled={stepDisabled}
              aria-disabled={ariaDisabled}
              tabIndex={tabIndex}
              className={cnm(
                styles.step,
                navigable && styles.stepNavigable,
                !navigable && !stepDisabled && styles.stepNonNavigable,
                isHorizontal ? styles.stepLayoutHorizontal : styles.stepLayoutVertical,
              )}
              aria-current={index === currentStepIndex ? "step" : undefined}
              data-testid={step["data-testid"] ?? `${dataTestId}-step-${index}`}
              onClick={() => {
                if (navigable) onStepSelect?.(index);
              }}
            >
              {stepBody}
            </button>
          );

          return (
            <li
              key={stepKey}
              className={cnm(
                "flex min-w-0 list-none flex-row relative",
                isHorizontal ? "shrink-0 items-center px-tight gap-base" : "flex-1 items-start",
              )}
            >
              <div className={cnm("flex min-w-0 justify-center", !isHorizontal && "flex-1")}>
                {hasTooltip ? <Tooltip title={step.tooltip}>{stepButton}</Tooltip> : stepButton}
              </div>
              {!isLast ? (
                <div
                  className={cnm(
                    "flex h-6 items-center",
                    isHorizontal ? "w-10 shrink-0" : cnm("min-w-2 flex-1", "absolute left-1/2 w-full mt-tight z-0"),
                  )}
                  role="presentation"
                  aria-hidden
                >
                  <StepConnectorSegment complete={segmentComplete} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
