import type React from "react";
import { useEffect, useContext, useCallback } from "react";
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

  useEffect(() => {
    if (tourContext) {
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
    }
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
    (data: {
      action: string;
      index: number;
      type: string;
      status: string;
    }) => {
      const { action, index, type, status } = data;

      // tour ends when
      const shouldEndTour =
        (status === STATUS.SKIPPED && state.run) || action === ACTIONS.CLOSE || status === STATUS.FINISHED;

      if (shouldEndTour) {
        // mark tour as viewed and update onboarding state if it's the final step or the tour was skipped
        if (status === STATUS.SKIPPED || status === STATUS.FINISHED) {
          tourContext?.setTourViewed(name, status === STATUS.SKIPPED, { index, action, type, status });
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

  // Disable tours when running in Cypress tests
  const isCypressTest = typeof window !== "undefined" && !!(window as any).Cypress;
  const shouldRunTour = !isCypressTest && joyrideState.run;

  return state.steps.length > 0 ? (
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
          arrowColor: "var(--color-primary-surface)",
        },
      }}
      hideCloseButton={true}
    />
  ) : null;
};
