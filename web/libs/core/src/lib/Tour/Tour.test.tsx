import { fireEvent, render, waitFor } from "@testing-library/react";
import { Tour } from "./Tour";
import { TourProvider } from "./TourProvider";

/**
 * FIT-1758 follow-up: the only existing automation short-circuit in `Tour` was a
 * `"Cypress" in window` check, with a comment that explicitly opted Selenium /
 * WebDriver INTO normal tour behavior. In practice the publish-state tour was
 * intermittent enough that selenium tests usually got lucky and clicked before
 * the joyride backdrop appeared — TC1700 was reported as a bug exactly because
 * that luck ran out. After making the tour reliably appear (target-wait fix),
 * TC1700 reproduced 100% of the time on the PR branch deploy, with the joyride
 * backdrop blocking the "Add Members" button on Project Settings → Members.
 *
 * Real WebDriver-controlled browsers (ChromeDriver / GeckoDriver / SafariDriver
 * / MSEdgeDriver / Selenium) set `navigator.webdriver = true` per the W3C
 * WebDriver spec. Treating that flag as another "skip tours in automation"
 * signal keeps the joyride overlay out of automation runs without changing
 * behavior for real users.
 *
 * We use `callApi("getProductTour")` as the side-effect probe because:
 *   - `Tour.tsx` returns null on `state.steps.length === 0` regardless of the
 *     automation gate, so the rendered subtree alone is not a reliable signal.
 *   - The automation gate short-circuits Tour's `useEffect` BEFORE
 *     `registerTour` + `startTour` run, so `callApi` is only invoked when the
 *     gate lets us through.
 */

describe("Tour > automation E2E short-circuit", () => {
  let originalWebdriverDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalWebdriverDescriptor = Object.getOwnPropertyDescriptor(navigator, "webdriver");
  });

  afterEach(() => {
    if (originalWebdriverDescriptor) {
      Object.defineProperty(navigator, "webdriver", originalWebdriverDescriptor);
    } else {
      try {
        delete (navigator as any).webdriver;
      } catch {
        Object.defineProperty(navigator, "webdriver", { configurable: true, value: undefined });
      }
    }
    delete (window as any).Cypress;
  });

  function setWebdriver(value: boolean | undefined) {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value });
  }

  function renderTourWithProbe() {
    const apiCalls: string[] = [];
    const useAPI = () => ({
      callApi: (apiName: string) => {
        apiCalls.push(apiName);
        return Promise.resolve({ $meta: { status: 200 }, steps: [], state: "ready" });
      },
    });
    render(
      <TourProvider useAPI={useAPI}>
        <Tour name="lse-published-publish-entry" autoStart />
      </TourProvider>,
    );
    return apiCalls;
  }

  it("skips registration / API fetch when navigator.webdriver === true (Selenium / WebDriver)", async () => {
    setWebdriver(true);
    const apiCalls = renderTourWithProbe();
    await new Promise((r) => setTimeout(r, 20));
    expect(apiCalls).not.toContain("getProductTour");
  });

  it("still skips when Cypress is present (preserves existing behavior)", async () => {
    (window as any).Cypress = {};
    const apiCalls = renderTourWithProbe();
    await new Promise((r) => setTimeout(r, 20));
    expect(apiCalls).not.toContain("getProductTour");
  });

  it("does not short-circuit for real users (navigator.webdriver falsy, no Cypress)", async () => {
    setWebdriver(false);
    const apiCalls = renderTourWithProbe();
    await new Promise((r) => setTimeout(r, 20));
    expect(apiCalls).toContain("getProductTour");
  });
});

describe("Tour > onStepNext", () => {
  function renderTwoStepTour(onStepNext: (index: number) => void | Promise<void>) {
    const updates: Array<Record<string, unknown>> = [];
    const useAPI = () => ({
      callApi: (apiName: string, options?: { body?: Record<string, unknown> }) => {
        if (apiName === "updateProductTour") {
          updates.push(options?.body ?? {});
          return Promise.resolve({ $meta: { status: 200 } });
        }
        return Promise.resolve({
          $meta: { status: 200 },
          state: "ready",
          steps: [
            { target: "#step-one", title: "One", content: "First", disableBeacon: true, disableOverlay: true },
            { target: "#step-two", title: "Two", content: "Second", disableBeacon: true, disableOverlay: true },
          ],
        });
      },
    });
    render(
      <>
        <div id="step-one" />
        <div id="step-two" />
        <TourProvider useAPI={useAPI}>
          <Tour name="two-step" autoStart onStepNext={onStepNext} showSkipButton />
        </TourProvider>
      </>,
    );
    return updates;
  }

  const primary = () => document.querySelector<HTMLElement>('[data-test-id="button-primary"]');
  const skip = () => document.querySelector<HTMLElement>('[data-test-id="button-skip"]');

  afterEach(() => {
    // Joyride leaves its portal container in <body>; a bloated body makes other files' failing `toBe(element)` assertions
    // print enormous DOM dumps (slow enough to time out) in the shared Bun process
    document.getElementById("react-joyride-portal")?.remove();
    delete (window as any).Cypress;
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
  });

  it("reports the index of the step the user advances from, via the primary button", async () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
    const onStepNext = mock();
    renderTwoStepTour(onStepNext);

    await waitFor(() => expect(primary()).not.toBeNull());
    expect(onStepNext).not.toHaveBeenCalled();

    fireEvent.click(primary()!);
    await waitFor(() => expect(onStepNext).toHaveBeenCalledTimes(1));
    expect(onStepNext).toHaveBeenLastCalledWith(0);

    // and the tour really moved on to the second step
    await waitFor(() => expect(document.body.textContent).toContain("Second"));
  });

  it("also reports the last step's primary button and marks the tour completed", async () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
    const onStepNext = mock();
    const updates = renderTwoStepTour(onStepNext);

    await waitFor(() => expect(primary()).not.toBeNull());
    fireEvent.click(primary()!);
    await waitFor(() => expect(document.body.textContent).toContain("Second"));
    fireEvent.click(primary()!);

    await waitFor(() => expect(onStepNext).toHaveBeenCalledTimes(2));
    expect(onStepNext.mock.calls.map(([index]) => index)).toEqual([0, 1]);
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].state).toBe("completed");
  });

  it("moves to the next step only after the promise returned by onStepNext settles", async () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
    let finish: () => void = () => {};
    const onStepNext = mock(() => new Promise<void>((resolve) => (finish = resolve)));
    renderTwoStepTour(onStepNext);

    await waitFor(() => expect(primary()).not.toBeNull());
    fireEvent.click(primary()!);
    await waitFor(() => expect(onStepNext).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.body.textContent).not.toContain("Second");

    finish();
    await waitFor(() => expect(document.body.textContent).toContain("Second"));
  });

  it("still advances when onStepNext fails", async () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
    const onStepNext = mock(() => Promise.reject(new Error("boom")));
    spyOn(console, "error").mockImplementation(() => {});
    renderTwoStepTour(onStepNext);

    await waitFor(() => expect(primary()).not.toBeNull());
    fireEvent.click(primary()!);

    await waitFor(() => expect(document.body.textContent).toContain("Second"));
  });

  it("does not report skipping the tour as advancing", async () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
    const onStepNext = mock();
    const updates = renderTwoStepTour(onStepNext);

    await waitFor(() => expect(skip()).not.toBeNull());
    fireEvent.click(skip()!);

    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].state).toBe("skipped");
    expect(onStepNext).not.toHaveBeenCalled();
  });
});
