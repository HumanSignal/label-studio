import { CheckIcon } from "@humansignal/icons";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { cnm } from "../../utils/utils";
import { Tooltip } from "../Tooltip/Tooltip";
import { Typography } from "../typography/typography";
import styles from "./stepper.module.css";

export interface StepperStep {
  id?: string;
  label: string;
  /** Optional secondary line below the label (e.g. page summary). */
  description?: ReactNode;
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
  /** Step list direction. @default 'horizontal' */
  variant?: "horizontal" | "vertical";
  /** Per-step badge/label density. Vertical lists always use compact layout. @default 'default' */
  size?: "default" | "compact";
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
            <CheckIcon className={cnm(styles.badgeIcon, playCompleteEntry && styles.badgeIconEnter)} aria-hidden />
          </>
        ) : (
          n
        )}
      </span>
    </>
  );
}

function StepConnectorSegment({ complete, vertical }: { complete: boolean; vertical?: boolean }) {
  return (
    <div className={cnm(styles.connector, vertical && styles.connectorVertical)} role="presentation" aria-hidden>
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
  variant = "horizontal",
  size = "default",
  className,
  "aria-label": ariaLabel = "Progress",
  "data-testid": dataTestId = "stepper",
  ...navProps
}: StepperProps) {
  if (steps.length === 0) {
    return null;
  }

  const isStacked = variant === "vertical";
  const isCompact = isStacked || size === "compact";
  const isHorizontalCompact = !isStacked && isCompact;

  return (
    <nav
      aria-label={ariaLabel}
      className={cnm(styles.stepperRoot, "w-full z-1 flex-1", className)}
      data-testid={dataTestId}
      {...navProps}
    >
      <ul
        className={cnm(
          "m-0 flex list-none p-0 relative",
          isStacked
            ? cnm("flex-col items-stretch", styles.stepperListStacked)
            : "flex-row flex-wrap items-start justify-center w-full",
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
          const hasDescription = step.description != null && step.description !== false && step.description !== "";

          const descriptionText = typeof step.description === "string" ? step.description : undefined;

          const labelNode = (
            <Typography
              as="span"
              variant="label"
              size="small"
              data-stepper-label
              className={cnm(styles.label, labelActive && styles.labelActive, isStacked && "truncate font-medium")}
              title={isStacked || hasDescription ? step.label : undefined}
            >
              {step.label}
            </Typography>
          );

          const descriptionNode =
            hasDescription && step.description ? (
              <Typography
                as="span"
                variant="body"
                size="small"
                data-stepper-description
                className={styles.description}
                title={descriptionText}
              >
                {step.description}
              </Typography>
            ) : null;

          const badgeNode = (
            <span className={styles.badgeWrap} data-stepper-badge-wrap-tone={badgeTone}>
              <StepBadge index={index} badgeTone={badgeTone} showCheck={showCheck} />
            </span>
          );

          const textBlockNode = (
            <span className={styles.stepTextBlock}>
              {labelNode}
              {descriptionNode}
            </span>
          );

          const stepBody = isStacked ? (
            <>
              <span className={styles.stackedBadgeCell}>
                {badgeNode}
                {!isLast ? (
                  <span className={styles.stackedConnectorCell} role="presentation" aria-hidden>
                    <StepConnectorSegment complete={segmentComplete} vertical />
                  </span>
                ) : null}
              </span>
              <span className={styles.stackedTextCell}>{textBlockNode}</span>
            </>
          ) : isCompact ? (
            <>
              {badgeNode}
              {textBlockNode}
            </>
          ) : (
            <>
              {badgeNode}
              {labelNode}
              {descriptionNode}
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
                isStacked ? styles.stepStackedButton : isCompact ? styles.stepLayoutCompact : styles.stepLayoutDefault,
                hasDescription && styles.stepHasDescription,
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

          const stepControl = hasTooltip ? <Tooltip title={step.tooltip}>{stepButton}</Tooltip> : stepButton;

          return (
            <li
              key={stepKey}
              className={cnm(
                "min-w-0 list-none relative",
                isStacked
                  ? styles.stepItemStacked
                  : cnm(
                      "flex",
                      isHorizontalCompact
                        ? "shrink-0 flex-row items-center px-tight gap-base"
                        : "flex-1 flex-row items-start",
                    ),
              )}
            >
              {isStacked ? (
                stepControl
              ) : (
                <div className={cnm("flex min-w-0 justify-center", !isHorizontalCompact && "flex-1")}>
                  {stepControl}
                </div>
              )}
              {!isLast && !isStacked ? (
                <div
                  className={cnm(
                    "flex h-6 items-center",
                    isHorizontalCompact
                      ? "w-10 shrink-0"
                      : cnm("min-w-2 flex-1", "absolute left-1/2 w-full mt-tight z-0"),
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
