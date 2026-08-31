import type React from "react";
import { useContext, useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { TourContext, TourProvider, type TourAction } from "./TourProvider";

type TourDispatch = React.Dispatch<TourAction>;

const makeTourResponse = (overrides: Partial<Record<string, any>> = {}) => ({
  $meta: { status: 200 },
  awaiting: false,
  state: "ready",
  steps: [
    {
      target: "body",
      content: "Step",
      title: "Title",
    },
  ],
  ...overrides,
});

/** Renders TourProvider, hands the context back via callback so each test can drive it directly. */
function renderProvider({
  callApi,
  onContext,
  targetWaitTimeoutMs,
}: {
  callApi: (apiName: string, params: Record<string, any>) => any;
  onContext: (ctx: React.ContextType<typeof TourContext>) => void;
  targetWaitTimeoutMs?: number;
}) {
  const Harness = () => {
    const context = useContext(TourContext);
    useEffect(() => {
      if (!context) return;
      onContext(context);
    }, [context]);
    return null;
  };

  return render(
    <TourProvider useAPI={() => ({ callApi })} targetWaitTimeoutMs={targetWaitTimeoutMs}>
      <Harness />
    </TourProvider>,
  );
}

describe("TourProvider", () => {
  it("queues second tour until active one closes", async () => {
    const callApi = mock((apiName: string, params: Record<string, any>) => {
      if (apiName === "getProductTour") {
        const name = params?.params?.name;
        return Promise.resolve({ ...makeTourResponse(), name });
      }
      return Promise.resolve({ $meta: { status: 200 } });
    });

    const dispatchA = mock() as unknown as TourDispatch;
    const dispatchB = mock() as unknown as TourDispatch;
    let ctx: React.ContextType<typeof TourContext> = null;

    const Harness = () => {
      const context = useContext(TourContext);

      useEffect(() => {
        if (!context) return;
        ctx = context;
        context.registerTour("tour-a", dispatchA);
        context.registerTour("tour-b", dispatchB);
        return () => {
          context.unregisterTour("tour-a");
          context.unregisterTour("tour-b");
        };
      }, [context]);

      return null;
    };

    render(
      <TourProvider useAPI={() => ({ callApi })}>
        <Harness />
      </TourProvider>,
    );

    await waitFor(() => expect(ctx).not.toBeNull());

    const provider = ctx!;
    await Promise.all([provider.startTour("tour-a"), provider.startTour("tour-b")]);

    expect(callApi).toHaveBeenCalledTimes(1);
    expect(callApi).toHaveBeenLastCalledWith("getProductTour", { params: { name: "tour-a" } });
    expect(dispatchA).toHaveBeenCalledTimes(1);
    expect(dispatchB).toHaveBeenCalledTimes(0);

    await provider.onTourClosed("tour-a");

    await waitFor(() => {
      expect(callApi).toHaveBeenCalledTimes(2);
      expect(callApi).toHaveBeenLastCalledWith("getProductTour", { params: { name: "tour-b" } });
      expect(dispatchB).toHaveBeenCalledTimes(1);
    });
  });

  describe("target-wait (FIT-1758)", () => {
    /*
     * Background — FIT-1758: the `lse-published-publish-entry` tour was firing
     * inconsistently across project pages (Settings: yes; DM / quickview /
     * label stream / review stream / dashboards: usually no), even though the
     * `[data-testid="project-publish-state-chip"]` target lives in
     * `ProjectTitleExtra` (the breadcrumb extra slot rendered on every project
     * sub-route). Root cause: `Tour.tsx` autoStart fires a single 500ms
     * timeout → `startTour` → `dispatch(run: true)`. On heavier pages
     * (DataManager async bundle, `useApiGetWorkspace` still pending, redirect
     * shuffle) the chip is not yet in the DOM at t=500ms, joyride emits
     * `TARGET_NOT_FOUND`, and the tour silently dies without ever retrying.
     *
     * The fix is to make `startTour` wait for the first step's CSS-selector
     * target to be in the DOM before dispatching, so the tour reliably fires
     * everywhere the chip eventually mounts. Per-user "skipped/completed"
     * state on the BE still short-circuits subsequent starts — i.e. "once
     * dismissed, never again".
     */
    const SELECTOR = '[data-testid="publish-chip-fixture"]';

    afterEach(() => {
      document.querySelectorAll(SELECTOR).forEach((node) => node.remove());
    });

    it("does not dispatch until the first step's target element appears in the DOM", async () => {
      const callApi = mock(() => Promise.resolve(makeTourResponse({ steps: [{ target: SELECTOR }] })));
      const dispatch = mock() as unknown as TourDispatch;
      let provider: NonNullable<React.ContextType<typeof TourContext>> | null = null;

      renderProvider({
        callApi,
        onContext: (ctx) => {
          provider = ctx;
          ctx?.registerTour("publish-tour", dispatch);
        },
      });
      await waitFor(() => expect(provider).not.toBeNull());

      const startPromise = provider!.startTour("publish-tour");

      // Even after the API resolves the tour, dispatch must wait until the chip is mounted.
      await waitFor(() => expect(callApi).toHaveBeenCalledTimes(1));
      expect(dispatch).not.toHaveBeenCalled();

      // Mount the target — observer should pick it up and dispatch `run: true`.
      const chip = document.createElement("div");
      chip.setAttribute("data-testid", "publish-chip-fixture");
      document.body.appendChild(chip);

      await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
      const lastArg = (dispatch as any).mock.calls[0][0];
      expect(lastArg.type).toBe("GOTO");
      expect(lastArg.payload).toMatchObject({ run: true });

      await startPromise;
    });

    it("dispatches immediately when the target is already in the DOM (no regression for fast-mounting pages)", async () => {
      const chip = document.createElement("div");
      chip.setAttribute("data-testid", "publish-chip-fixture");
      document.body.appendChild(chip);

      const callApi = mock(() => Promise.resolve(makeTourResponse({ steps: [{ target: SELECTOR }] })));
      const dispatch = mock() as unknown as TourDispatch;
      let provider: NonNullable<React.ContextType<typeof TourContext>> | null = null;

      renderProvider({
        callApi,
        onContext: (ctx) => {
          provider = ctx;
          ctx?.registerTour("publish-tour", dispatch);
        },
      });
      await waitFor(() => expect(provider).not.toBeNull());

      await provider!.startTour("publish-tour");

      expect(dispatch).toHaveBeenCalledTimes(1);
      const lastArg = (dispatch as any).mock.calls[0][0];
      expect(lastArg.type).toBe("GOTO");
      expect(lastArg.payload).toMatchObject({ run: true });
    });

    it("releases the active-tour lock when the target never appears, so a later attempt can retry", async () => {
      const callApi = mock(() => Promise.resolve(makeTourResponse({ steps: [{ target: SELECTOR }] })));
      const dispatch = mock() as unknown as TourDispatch;
      let provider: NonNullable<React.ContextType<typeof TourContext>> | null = null;

      renderProvider({
        callApi,
        targetWaitTimeoutMs: 200,
        onContext: (ctx) => {
          provider = ctx;
          ctx?.registerTour("publish-tour", dispatch);
        },
      });
      await waitFor(() => expect(provider).not.toBeNull());

      // First start: target never mounts → after `targetWaitTimeoutMs`, the helper gives up
      // WITHOUT dispatching and releases the active-tour lock. BE tour state is never patched
      // to skipped/completed, so the next attempt is free to retry from scratch.
      await provider!.startTour("publish-tour");
      expect(dispatch).not.toHaveBeenCalled();
      expect(callApi).toHaveBeenCalledTimes(1);

      // Mount the target now and retry — this represents the user navigating to a page where
      // the chip *does* render. The lock must be free so the second start can acquire it and fire.
      const chip = document.createElement("div");
      chip.setAttribute("data-testid", "publish-chip-fixture");
      document.body.appendChild(chip);

      await provider!.startTour("publish-tour");

      await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
      expect(callApi).toHaveBeenCalledTimes(2);
    });

    it("dispatches without any target wait when the step target is not a CSS selector (e.g. an HTMLElement)", async () => {
      // Joyride supports passing a raw HTMLElement as `step.target`. In that case the wait helper
      // has nothing to query, so it must short-circuit and dispatch immediately. Keeps non-selector
      // tours (e.g. Element-targeted) working unchanged.
      const targetEl = document.createElement("div");
      const callApi = mock(() => Promise.resolve(makeTourResponse({ steps: [{ target: targetEl }] })));
      const dispatch = mock() as unknown as TourDispatch;
      let provider: NonNullable<React.ContextType<typeof TourContext>> | null = null;

      renderProvider({
        callApi,
        onContext: (ctx) => {
          provider = ctx;
          ctx?.registerTour("element-tour", dispatch);
        },
      });
      await waitFor(() => expect(provider).not.toBeNull());

      await provider!.startTour("element-tour");

      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });
});
