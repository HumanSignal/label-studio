/**
 * "Switch to the vertical annotations panel?" nudge (FIT-3345).
 *
 * Wraps the editor. The editor's carousel wrapper reads `useCarouselNavigationIntent()` and passes it to
 * `AnnotationsCarousel`; when the user repeatedly tries to page through the strip (chevrons / wheel, see
 * `navigation-intent.ts`) the product tour `annotations-vertical-layout` starts:
 *
 *   1. "Want to view annotations in a vertical panel?"  [Yes, switch] [No thanks]
 *   2. Highlights the Settings button: "You can change this any time in Settings."
 *
 * "Yes, switch" calls `onSwitchToVertical`, so the setting is applied before step 2 renders. State
 * (ready / completed / skipped) uses the regular per-user product-tour persistence, so it is shown at most
 * once. The editors render outside the app's `TourProvider` (own React root, or a sandboxed iframe), so
 * this component mounts its own provider on top of the `useAPI` it is given.
 *
 * The host decides eligibility via `enabled` (flag, `annotations:tabs`, role, horizontal layout). It only
 * gates *starting*: a running tour survives `enabled` turning false, which happens as soon as the layout
 * switches. Switching the layout also unmounts the top bar and its carousel (the vertical list moves to a
 * sidebar), so mount this above the whole layout-dependent tree, not around the carousel: the tour's second
 * step is still on screen when that happens.
 */

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { TooltipRenderProps } from "react-joyride";
import { Button } from "@humansignal/ui";
import { Tour, TourContext, TourProvider } from "../Tour";
import { createNavigationIntentDetector, type NavigationIntentSource } from "./navigation-intent";

/** Matches `annotations_vertical_layout.yml` in `label_studio/users/product_tours/configs`. */
export const VERTICAL_LAYOUT_TOUR_NAME = "annotations-vertical-layout";

/** Resolves once the browser has painted the frame after the current React work. */
const afterNextPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Step that offers the switch; leaving it with the primary button means "Yes, switch". */
const SWITCH_STEP_INDEX = 0;

const TESTID_PREFIX = "vertical-layout-tour";

// Joyride's floater animates `transform` for 0.2s. Popper settles the tooltip a beat after it mounts, so the default
// makes it glide in from the left edge to its anchor; fade only instead.
const FLOATER_PROPS = { styles: { floaterWithAnimation: { transition: "opacity 0.3s" } } };

type NavigationIntentReporter = (source: NavigationIntentSource) => void;

const NavigationIntentContext = createContext<NavigationIntentReporter | undefined>(undefined);

/** Reporter for the horizontal carousel's paging intent; `undefined` when no nudge is mounted above. */
export function useCarouselNavigationIntent() {
  return useContext(NavigationIntentContext);
}

/** Element that had focus when the prompt opened, so closing the prompt can put the keyboard user back. */
const ReturnFocusContext = createContext<RefObject<HTMLElement | null> | null>(null);

export interface VerticalLayoutNudgeProps {
  /** Whether a qualifying burst of intent may start the tour. */
  enabled: boolean;
  /** Applies the vertical layout. Called once, when the user accepts on the first step. */
  onSwitchToVertical: () => void;
  /** Product-tour API for this runtime (`getProductTour` / `updateProductTour`); must be referentially stable. */
  useAPI: () => { callApi: (apiName: string, params: Record<string, any>) => any };
  children: ReactNode;
}

export function VerticalLayoutNudge({ useAPI, ...props }: VerticalLayoutNudgeProps) {
  return (
    <TourProvider useAPI={useAPI}>
      <VerticalLayoutNudgeController {...props} />
    </TourProvider>
  );
}

function VerticalLayoutNudgeController({
  enabled,
  onSwitchToVertical,
  children,
}: Omit<VerticalLayoutNudgeProps, "useAPI">) {
  const tourContext = useContext(TourContext);
  const detector = useMemo(() => createNavigationIntentDetector(), []);

  // The provider's context value is rebuilt every render; read it (and the host callbacks) through refs
  // so the callbacks handed to the carousel stay stable.
  const tourContextRef = useRef(tourContext);
  tourContextRef.current = tourContext;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onSwitchRef = useRef(onSwitchToVertical);
  onSwitchRef.current = onSwitchToVertical;

  // One attempt per mount: users whose tour is already completed/skipped would otherwise re-fetch it on
  // every burst of paging.
  const attemptedRef = useRef(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const onNavigationIntent = useCallback(() => {
    if (!enabledRef.current || attemptedRef.current) return;
    if (!detector.record()) return;
    // This provider's one-tour-at-a-time lock does not know about the app's own tours (they live in another
    // provider on the same page): do not stack a prompt on top of one that is already open. Not an attempt,
    // so the next burst of paging can still start it.
    if (document.querySelector('[role="alertdialog"]')) return;

    attemptedRef.current = true;
    // Nothing focused means `body` is active: there is nothing to hand focus back to (and a late `body.focus()`
    // would blur whatever the user focused after dismissing the prompt).
    const active = document.activeElement as HTMLElement | null;
    returnFocusRef.current = active && active !== document.body && typeof active.focus === "function" ? active : null;
    void tourContextRef.current?.startTour(VERTICAL_LAYOUT_TOUR_NAME);
  }, [detector]);

  const onStepNext = useCallback(async (stepIndex: number) => {
    if (stepIndex !== SWITCH_STEP_INDEX) return;
    onSwitchRef.current();
    // Switching remounts the editor chrome (the Settings button is a new element afterwards). Joyride resolves a
    // step's target while rendering it, so advancing in the same batch would pin the tooltip to the old, detached
    // button and show nothing.
    await afterNextPaint();
  }, []);

  return (
    <NavigationIntentContext.Provider value={onNavigationIntent}>
      <ReturnFocusContext.Provider value={returnFocusRef}>
        {children}
        {/* scrollToFirstStep: Joyride only moves focus into the tooltip (and traps Tab there) when it may scroll to the step */}
        <Tour
          name={VERTICAL_LAYOUT_TOUR_NAME}
          tooltipComponent={NudgeTooltip}
          onStepNext={onStepNext}
          floaterProps={FLOATER_PROPS}
          scrollToFirstStep
        />
      </ReturnFocusContext.Provider>
    </NavigationIntentContext.Provider>
  );
}

/**
 * Joyride's stock tooltip tags its buttons `data-test-id`; this one uses the repo's `data-testid` and the
 * design-system Button. The `*Props` spreads keep Joyride's behavior: labels from step `locale`, click
 * handlers, and `data-action="primary"`, which Joyride focuses and traps Tab inside (keyboard operable).
 */
function NudgeTooltip({ step, isLastStep, primaryProps, skipProps, tooltipProps }: TooltipRenderProps) {
  const { title, content, showSkipButton } = step;
  const titleId = useId();
  const contentId = useId();
  const returnFocusRef = useContext(ReturnFocusContext);

  // The prompt moves focus into itself; when the user ends it (skip, close, "Got it") hand focus back to where
  // they were, if that element still exists. Accepting step 1 only moves to step 2, so it does not restore.
  const restoreFocus = () => {
    // Wait for the tooltip to be gone: until then Joyride keeps pulling focus back to its primary button.
    void afterNextPaint().then(() => {
      const previous = returnFocusRef?.current;
      if (previous?.isConnected) previous.focus();
    });
  };

  // Editors bind Enter at document level (the classic editor's keymaster `region:focus`), which swallows the
  // keydown and cancels the focused button's native click, leaving the buttons keyboard-inoperable. The tooltip
  // is portaled to `body`, so React sees the keydown before `document` does: keep Enter from getting out.
  // (Tab must still reach Joyride's focus trap and Escape its close handler, so only Enter is held back.)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") event.stopPropagation();
    if (event.key === "Escape") restoreFocus();
  };

  return (
    <div
      {...tooltipProps}
      onKeyDown={handleKeyDown}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={contentId}
      className="w-[360px] max-w-[90vw] rounded-small border border-neutral-border bg-neutral-background p-base text-neutral-content"
      data-testid={`${TESTID_PREFIX}-tooltip`}
    >
      {title && (
        <div id={titleId} className="mb-tight text-body-medium font-medium">
          {title}
        </div>
      )}
      <div id={contentId} className="text-body-small text-neutral-content-subtle">
        {content}
      </div>
      <div className="mt-base flex justify-end gap-tight">
        {showSkipButton && !isLastStep && (
          <Button
            {...skipProps}
            onClick={(event) => {
              skipProps.onClick(event);
              restoreFocus();
            }}
            size="small"
            look="outlined"
            variant="neutral"
            data-testid={`${TESTID_PREFIX}-skip`}
          >
            {skipProps.title}
          </Button>
        )}
        <Button
          {...primaryProps}
          onClick={(event) => {
            primaryProps.onClick(event);
            if (isLastStep) restoreFocus();
          }}
          size="small"
          data-testid={`${TESTID_PREFIX}-primary`}
        >
          {primaryProps.title}
        </Button>
      </div>
    </div>
  );
}
