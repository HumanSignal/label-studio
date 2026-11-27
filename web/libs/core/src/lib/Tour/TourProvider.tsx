import type React from "react";
import { createContext, useRef, useCallback, useReducer } from "react";
import type { Step } from "react-joyride";

/**
 * TourProvider manages the state and actions for product tours in the application.
 * It provides the core mechanics for:
 * - Managing tour states (running, stopped, current step, etc.)
 * - Handling tour actions (start, stop, next step, etc.)
 * - Maintaining references to multiple tours that can be registered
 *
 * The actual UI implementation is handled by the <Tour> component which uses this provider
 * to manage its state and behavior. The Tour component wraps react-joyride to render
 * the actual tour UI elements.
 */

interface TourState {
  key: string;
  run: boolean;
  continuous: boolean;
  loading: boolean;
  stepIndex: number;
  steps: Step[];
}

export interface TourAction {
  type: "START" | "RESET" | "STOP" | "GOTO" | "NEXT" | "RESTART";
  payload?: any;
}

const reducer = (state: TourState, action: TourAction): TourState => {
  switch (action.type) {
    case "START":
      return { ...state, run: true };
    case "RESET":
      return { ...state, stepIndex: 0 };
    case "STOP":
      return { ...state, run: false };
    case "NEXT": {
      const nextIndex = state.stepIndex + 1;
      if (nextIndex < state.steps.length) return { ...state, stepIndex: nextIndex };
      console.log(`Tour ${state.key} has no more steps`);
      return state;
    }
    case "GOTO":
      return { ...state, ...action.payload };
    case "RESTART":
      return {
        ...state,
        stepIndex: 0,
        run: true,
        loading: false,
        key: new Date().toISOString(),
      };
    default:
      return state;
  }
};

export const userTourStateReducer = (): [TourState, React.Dispatch<TourAction>] =>
  useReducer(reducer, createInitialState([]));

const createInitialState = (steps: Step[]): TourState => ({
  key: new Date().toISOString(),
  run: false,
  continuous: true,
  loading: false,
  stepIndex: 0,
  steps: steps.map((step) => ({
    ...step,
    // TODO: although html is predefined by LSE assets, to avoid XSS, we should better sanitize it by allowing only simple html tags like <b>, <i>, <u> etc.
    title: typeof step.title === "string" ? <div dangerouslySetInnerHTML={{ __html: step.title }} /> : step.title,
    content:
      typeof step.content === "string" ? <div dangerouslySetInnerHTML={{ __html: step.content }} /> : step.content,
  })),
});

type ProductTourState = "ready" | "skipped" | "completed";

const updateProductTourState = async (
  api: any,
  name: string,
  state: ProductTourState,
  interactionData: Record<string, any> = {},
) => {
  return await api.callApi("updateProductTour", {
    params: {
      name,
    },
    body: {
      state,
      interaction_data: interactionData,
    },
  });
};

/**
 * Default ceiling for how long we'll wait for a step's CSS-selector target to appear
 * in the DOM before giving up. Long enough to cover slow-mounting pages
 * (e.g. DataManager's async bundle on a cold cache, label/review streams that lazy-mount
 * the breadcrumb chip during page settle) without holding the global tour lock forever
 * if the user has already navigated somewhere the target will never show.
 */
const DEFAULT_TARGET_WAIT_TIMEOUT_MS = 30000;

/**
 * Resolves once `selector` is found in the document (or once `signal` aborts).
 * Returns `true` on match, `false` on timeout/abort. Uses a `MutationObserver` so we
 * react to the first frame the target mounts — no polling, no extra event loop chatter.
 */
function waitForTargetInDOM(selector: string, timeoutMs: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  if (document.querySelector(selector)) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
    };

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        cleanup();
        resolve(true);
      }
    });
    observer.observe(document.body ?? document.documentElement, { childList: true, subtree: true });

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const onAbort = () => {
      cleanup();
      resolve(false);
    };
    signal.addEventListener("abort", onAbort);
  });
}

interface TourContextType {
  registerTour: (name: string, dispatch: React.Dispatch<TourAction>) => void;
  unregisterTour: (name: string) => void;
  startTour: (name: string) => Promise<void>;
  setTourViewed: (name: string, isSkipped: boolean, interactionData: Record<string, any>) => Promise<void>;
  restartTour: (name: string) => void;
  /** Marks current tour as closed and triggers next queued tour (if any). */
  onTourClosed: (name: string) => Promise<void>;
  /** Re-fetch tours that were blocked by `awaiting` (dependencies) after another tour completes. */
  retryAwaitingTours: () => Promise<void>;
}

export const TourContext = createContext<TourContextType | null>(null);

// TODO: once useAPI is unified and moved into core library we need to come back and clean this up as it will not be necessary to pass it in to the provider
export const TourProvider: React.FC<{
  children: React.ReactNode;
  useAPI: () => { callApi: (apiName: string, params: Record<string, any>) => any };
  /**
   * Optional override for the per-start "wait for the first step's target element" timeout.
   * Production code should leave this unset (defaults to 30s). Exposed primarily so unit tests
   * can drive the timeout-and-release path deterministically without hanging on a real 30s wait.
   */
  targetWaitTimeoutMs?: number;
}> = ({ children, useAPI, targetWaitTimeoutMs }) => {
  const api = useAPI();
  const toursRef = useRef<Record<string, React.Dispatch<TourAction>>>({});
  /** Tours whose last getProductTour returned `awaiting: true` (dependency not finished yet). */
  const awaitingToursRef = useRef<Set<string>>(new Set());
  /** Global lock: only one tour can fetch/start/run at a time. */
  const activeTourRef = useRef<string | null>(null);
  /** Abort the in-flight target wait if the same tour is restarted / the provider unmounts. */
  const targetWaitAbortersRef = useRef<Record<string, AbortController>>({});

  const registerTour = (name: string, dispatch: React.Dispatch<TourAction>) => {
    toursRef.current[name] = dispatch;
  };

  const startTour = useCallback(
    async (name: string) => {
      const activeTour = activeTourRef.current;

      // Keep a strict global queue to avoid overlapping joyride tooltips.
      if (activeTour && activeTour !== name) {
        awaitingToursRef.current.add(name);
        return;
      }

      if (activeTour === name) {
        return;
      }

      const dispatch = toursRef.current[name];
      if (!dispatch) {
        console.error("Dispatch for tour", name, "not found");
        return;
      }

      activeTourRef.current = name;

      const releaseLock = () => {
        if (activeTourRef.current === name) {
          activeTourRef.current = null;
        }
      };

      const response = await api.callApi("getProductTour", { params: { name } });

      if (response?.$meta?.status !== 200) {
        console.error("Error fetching tour data", response);
        releaseLock();
        return;
      }

      if (response.awaiting) {
        awaitingToursRef.current.add(name);
        console.info(`Tour "${name}" is awaiting other tours`);
        releaseLock();
        return;
      }

      awaitingToursRef.current.delete(name);

      if (!response.steps?.length) {
        console.info(`No steps found for tour "${name}"`);
        releaseLock();
        return;
      }

      if (response.state === "completed" || response.state === "skipped") {
        console.debug(`Tour "${name}" is already completed`);
        releaseLock();
        return;
      }

      // FIT-1758: wait for the first step's CSS-selector target to be in the DOM before
      // running joyride. Without this, on heavy pages (DataManager bundle, label/review
      // stream, async workspace fetch, redirect shuffle) the chip element can still be
      // pending at autoStart-fire time. Joyride then emits TARGET_NOT_FOUND, the Tour
      // callback advances past the only step, and the tour silently never shows — even
      // though the chip eventually mounts a few frames later. With the wait, the tour
      // reliably fires anywhere the chip eventually renders (DM, settings, dashboards,
      // quickview, label stream, review stream).
      const firstStep = response.steps[0];
      const targetSelector = typeof firstStep?.target === "string" ? firstStep.target : null;
      if (targetSelector && !document.querySelector(targetSelector)) {
        // Abort any prior wait for this tour name (e.g. user re-triggers via a new mount).
        targetWaitAbortersRef.current[name]?.abort();
        const aborter = new AbortController();
        targetWaitAbortersRef.current[name] = aborter;

        const found = await waitForTargetInDOM(
          targetSelector,
          targetWaitTimeoutMs ?? DEFAULT_TARGET_WAIT_TIMEOUT_MS,
          aborter.signal,
        );
        delete targetWaitAbortersRef.current[name];

        if (!found) {
          // Target never appeared. Leave BE state untouched (still "ready") and release the
          // global lock so a later startTour call — typically triggered by the user landing
          // on a page where the chip does mount — can fire normally.
          console.debug(`Tour "${name}" target "${targetSelector}" never appeared; releasing lock for retry`);
          releaseLock();
          return;
        }
      }

      const state = createInitialState(response.steps);
      dispatch({ type: "GOTO", payload: { ...state, run: true } });
    },
    [api, targetWaitTimeoutMs],
  );

  const retryAwaitingTours = useCallback(async () => {
    const pending = [...awaitingToursRef.current];
    for (const n of pending) {
      await startTour(n);
    }
    // PATCH for the completed tour may lag behind getProductTour; one short follow-up avoids stuck second tour.
    if (awaitingToursRef.current.size > 0) {
      await new Promise((r) => setTimeout(r, 450));
      const still = [...awaitingToursRef.current];
      for (const n of still) {
        await startTour(n);
      }
    }
  }, [startTour]);

  const setTourViewed = useCallback(
    async (name: string, isSkipped: boolean, interactionData: Record<string, any> = {}) => {
      // TODO: currently we don't have per-tour complete state, so we just update the global state
      await updateProductTourState(api, name, isSkipped ? "skipped" : "completed", interactionData);
      if (activeTourRef.current === name) {
        activeTourRef.current = null;
      }
    },
    [api],
  );

  const onTourClosed = useCallback(
    async (name: string) => {
      if (activeTourRef.current === name) {
        activeTourRef.current = null;
      }
      await retryAwaitingTours();
    },
    [retryAwaitingTours],
  );

  const restartTour = useCallback(
    (name: string) => {
      const dispatch = toursRef.current[name];
      if (!dispatch) {
        console.error("Dispatch for tour", name, "not found");
        return;
      }

      dispatch({ type: "RESTART" });

      updateProductTourState(api, name, "ready");
    },
    [api],
  );

  const unregisterTour = (name: string) => {
    delete toursRef.current[name];
    // If a target wait is still in flight for this tour (e.g. the host component unmounted
    // before the chip ever appeared), abort it so we don't leave a stale MutationObserver
    // attached to document.body.
    targetWaitAbortersRef.current[name]?.abort();
    delete targetWaitAbortersRef.current[name];
  };

  return (
    <TourContext.Provider
      value={{ registerTour, unregisterTour, startTour, setTourViewed, restartTour, onTourClosed, retryAwaitingTours }}
    >
      {children}
    </TourContext.Provider>
  );
};
