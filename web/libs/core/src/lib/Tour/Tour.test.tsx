import { render } from "@testing-library/react";
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
