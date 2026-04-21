import type React from "react";
import { useEffect, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import JoyRide, { ACTIONS, EVENTS, STATUS, type BaseProps } from "react-joyride";
import { TourContext, userTourStateReducer } from "./TourProvider";

interface TourProps extends BaseProps {
  /** Unique identifier for the tour. Should match the name of the tour in the product tour YAML file (note that my-tour-name can match my_tour_name.yml) */
  name: string;
  /** Whether to automatically start the tour when component mounts. Defaults to false */
  autoStart?: boolean;
  /** Delay in milliseconds before the tour starts when autoStart is true. Defaults to 0 */
  delay?: number;

  /* Check all other props here https://docs.react-joyride.com/props */
}

export const Tour: React.FC<TourProps> = ({ name, autoStart = false, delay = 0, ...props }) => {
  const tourContext = useContext(TourContext);
  if (!tourContext) {
    console.error("Tour context not found");
    return null;
  }
  const [state, dispatch] = userTourStateReducer();

  // Skip tours only in Cypress in-app E2E runs. Selenium/WebDriver should keep normal tour behavior.
  const isAutomationE2E = typeof window !== "undefined" && "Cypress" in window;

  useEffect(() => {
    // E2E: skip registration and product-tour fetch. Joyride still mounts a subtree when steps exist
    // even with run=false, which can block clicks and destabilize datamanager / labeling flows.
    if (isAutomationE2E) {
      return;
    }

    tourContext.registerTour(name, dispatch);

    let timeout = null;
    if (autoStart) {
      timeout = setTimeout(() => {
        tourContext.startTour(name);
      }, delay);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      tourContext.unregisterTour(name);
    };
  }, []);

  /**
   * Handles tour navigation and completion events
   * @param {Object} data Tour callback data
   * @param {string} data.action The action that triggered the callback
   *   Available actions:
   *   - ACTIONS.CLOSE: User closed the tour
   *   - ACTIONS.NEXT: User clicked next
   *   - ACTIONS.PREV: User clicked back
   *   - ACTIONS.RESET: Tour was reset
   *   - ACTIONS.SKIP: User skipped the tour
   *   - ACTIONS.START: Tour started
   *   - ACTIONS.STOP: Tour stopped
   * @param {number} data.index Current step index
   * @param {string} data.type Event type
   *   Available events:
   *   - EVENTS.STEP_AFTER: After a step is completed
   *   - EVENTS.STEP_BEFORE: Before a step starts
   *   - EVENTS.TARGET_NOT_FOUND: Step target element not found
   *   - EVENTS.TOUR_START: Tour started
   *   - EVENTS.TOUR_END: Tour ended
   * @param {string} data.status Tour status
   *   Available statuses:
   *   - STATUS.IDLE: Tour is idle/not started
   *   - STATUS.RUNNING: Tour is running
   *   - STATUS.PAUSED: Tour is paused
   *   - STATUS.SKIPPED: Tour was skipped
   *   - STATUS.FINISHED: Tour completed normally
   *   - STATUS.ERROR: Tour encountered an error
   *
   * This handler manages:
   * - Tour completion (close/skip/finish) by marking it viewed and stopping
   * - Step navigation (next/prev) by updating the step index
   *
   * Can be extended to support:
   * - Conditional step logic based on user interactions
   * - Saving progress/state between sessions
   * - Custom analytics tracking for each step
   * - Dynamic step content based on application state
   */
  const handleTourCallback = useCallback(
    (data: { action: string; index: number; type: string; status: string }) => {
      const { action, index, type, status } = data;

      // tour ends when
      const shouldEndTour =
        (status === STATUS.SKIPPED && state.run) || action === ACTIONS.CLOSE || status === STATUS.FINISHED;

      if (shouldEndTour) {
        // mark tour as viewed and update onboarding state if it's the final step or the tour was skipped
        if (status === STATUS.SKIPPED || status === STATUS.FINISHED) {
          void (async () => {
            await tourContext?.setTourViewed(name, status === STATUS.SKIPPED, { index, action, type, status });
            await tourContext?.retryAwaitingTours();
          })();
        }
        dispatch({ type: "STOP" });
        return;
      }

      const isStepChange = type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND;
      if (isStepChange) {
        const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        dispatch({
          type: "GOTO",
          payload: { stepIndex: nextIndex },
        });
      }
    },
    [name, state.run],
  );

  const { key, ...joyrideState } = state;

  const shouldRunTour = !isAutomationE2E && joyrideState.run;

  if (isAutomationE2E) {
    return null;
  }

  if (state.steps.length === 0) {
    return null;
  }

  // Joyride always mounts a root div.react-joyride (even when run=false), which breaks flex layouts
  // (e.g. breadcrumbs + gap) when Tour sits next to other controls. Portal keeps it out of the flow.
  const joyride = (
    <JoyRide
      key={key}
      {...joyrideState}
      run={shouldRunTour}
      {...props}
      callback={handleTourCallback}
      styles={{
        tooltip: {
          width: "468px",
        },
        options: {
          backgroundColor: "var(--color-neutral-background)",
          primaryColor: "var(--color-primary-surface)",
          textColor: "var(--color-neutral-content)",
          overlayColor: "rgba(var(--color-neutral-shadow-raw) / calc( 50% * var(--shadow-intensity)))",
          // Match tooltip card so the floater arrow is not a contrasting primary wedge
          arrowColor: "var(--color-neutral-background)",
        },
      }}
      hideCloseButton={true}
    />
  );

  return typeof document !== "undefined" && document.body ? createPortal(joyride, document.body) : joyride;
};
