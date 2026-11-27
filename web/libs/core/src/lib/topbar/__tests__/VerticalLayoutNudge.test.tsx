import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NAVIGATION_INTENT_WINDOW_MS } from "../navigation-intent";
import { VerticalLayoutNudge, VERTICAL_LAYOUT_TOUR_NAME, useCarouselNavigationIntent } from "../VerticalLayoutNudge";

const originalWebdriver = Object.getOwnPropertyDescriptor(navigator, "webdriver");

/** Fake product-tour API: serves a two-step tour and records every call. */
function createApi(tourState: "ready" | "completed" | "skipped" = "ready") {
  const calls: Array<{ method: string; params?: Record<string, unknown>; body?: Record<string, unknown> }> = [];
  const callApi = (
    method: string,
    options: { params?: Record<string, unknown>; body?: Record<string, unknown> } = {},
  ) => {
    calls.push({ method, ...options });
    if (method === "getProductTour") {
      return Promise.resolve({
        $meta: { status: 200 },
        state: tourState,
        steps: [
          {
            target: "#carousel-target",
            title: "Want to view annotations in a vertical panel?",
            content: "Step one body",
            disableBeacon: true,
            disableOverlay: true,
            showSkipButton: true,
            locale: { next: "Yes, switch", skip: "No thanks" },
          },
          {
            target: "#settings-target",
            title: "Change it any time",
            content: "Step two body",
            disableBeacon: true,
            disableOverlay: true,
            locale: { last: "Got it" },
          },
        ],
      });
    }
    return Promise.resolve({ $meta: { status: 200 } });
  };
  const useAPI = () => ({ callApi });
  return { calls, useAPI, ofMethod: (m: string) => calls.filter((c) => c.method === m) };
}

/** Stands in for the editor's carousel wrapper: reports paging intent through the context hook. */
function Carousel() {
  const onNavigationIntent = useCarouselNavigationIntent();
  return (
    <div>
      <div id="carousel-target" />
      <div id="settings-target" />
      <button type="button" data-testid="chevron" onClick={() => onNavigationIntent?.("chevron")} />
    </div>
  );
}

function setup({
  enabled = true,
  tourState,
  onSwitchToVertical = mock(),
}: {
  enabled?: boolean;
  tourState?: "ready" | "completed" | "skipped";
  onSwitchToVertical?: () => void;
} = {}) {
  const api = createApi(tourState);
  const ui = (isEnabled: boolean) => (
    <VerticalLayoutNudge enabled={isEnabled} onSwitchToVertical={onSwitchToVertical} useAPI={api.useAPI}>
      <Carousel />
    </VerticalLayoutNudge>
  );
  const view = render(ui(enabled));
  return {
    api,
    onSwitchToVertical,
    setEnabled: (value: boolean) => view.rerender(ui(value)),
    intent: () => fireEvent.click(screen.getByTestId("chevron")),
  };
}

/**
 * Joyride polls every frame until its primary button has focus. Clicking before that lets the tooltip unmount with the
 * poll still running, and in the shared Bun process it then keeps stealing focus from later test files.
 */
async function clickWhenFocusSettled(button: HTMLElement) {
  await waitFor(() => expect(document.activeElement?.getAttribute("data-testid")).toBe("vertical-layout-tour-primary"));
  fireEvent.click(button);
}

const primaryButton = () => screen.queryByTestId("vertical-layout-tour-primary");
const skipButton = () => screen.queryByTestId("vertical-layout-tour-skip");

describe("VerticalLayoutNudge", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
    setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    // Joyride leaves its portal container in <body>; a bloated body makes other files' failing `toBe(element)` assertions
    // print enormous DOM dumps (slow enough to time out) in the shared Bun process
    document.getElementById("react-joyride-portal")?.remove();
    if (originalWebdriver) Object.defineProperty(navigator, "webdriver", originalWebdriver);
    else Object.defineProperty(navigator, "webdriver", { configurable: true, value: undefined });
    setSystemTime();
  });

  it("starts the annotations-vertical-layout tour on repeated intent inside the window", async () => {
    const { api, intent } = setup();

    intent();
    await act(async () => {});
    expect(api.ofMethod("getProductTour")).toHaveLength(0);

    intent();
    await waitFor(() => expect(primaryButton()).not.toBeNull());
    expect(api.ofMethod("getProductTour")).toHaveLength(1);
    expect(api.ofMethod("getProductTour")[0].params).toEqual({ name: VERTICAL_LAYOUT_TOUR_NAME });
    expect(VERTICAL_LAYOUT_TOUR_NAME).toBe("annotations-vertical-layout");
    expect(screen.getByText("Want to view annotations in a vertical panel?")).toBeTruthy();
    // The tooltip fades in place; a transform transition would make it glide in from the left edge
    expect(document.querySelector<HTMLElement>(".__floater")?.style.transition).not.toContain("transform");
  });

  it("does not start the tour when the intents are further apart than the window", async () => {
    const { api, intent } = setup();

    intent();
    setSystemTime(new Date(Date.now() + NAVIGATION_INTENT_WINDOW_MS + 1));
    intent();
    await act(async () => {});

    expect(api.ofMethod("getProductTour")).toHaveLength(0);
  });

  it("does nothing while disabled (flag off, annotator, vertical layout already active, ...)", async () => {
    const { api, intent } = setup({ enabled: false });

    for (let i = 0; i < 5; i++) intent();
    await act(async () => {});

    expect(api.ofMethod("getProductTour")).toHaveLength(0);
  });

  it("applies the vertical layout on 'Yes, switch', then shows the Settings step", async () => {
    const { intent, onSwitchToVertical } = setup();
    intent();
    intent();
    await waitFor(() => expect(primaryButton()).not.toBeNull());

    expect(primaryButton()!.textContent).toBe("Yes, switch");
    expect(skipButton()!.textContent).toBe("No thanks");
    expect(onSwitchToVertical).not.toHaveBeenCalled();

    await clickWhenFocusSettled(primaryButton()!);

    await waitFor(() => expect(screen.getByText("Step two body")).toBeTruthy());
    expect(onSwitchToVertical).toHaveBeenCalledTimes(1);
    // The Settings step is informational: nothing left to decline
    expect(skipButton()).toBeNull();
    expect(primaryButton()!.textContent).toBe("Got it");
  });

  it("keeps the Settings step up after the host disables the nudge because the layout became vertical", async () => {
    const { intent, setEnabled } = setup();
    intent();
    intent();
    await waitFor(() => expect(primaryButton()).not.toBeNull());

    await clickWhenFocusSettled(primaryButton()!);
    setEnabled(false);

    await waitFor(() => expect(screen.getByText("Step two body")).toBeTruthy());
  });

  it("marks the tour completed once the Settings step is acknowledged, without switching twice", async () => {
    const { api, intent, onSwitchToVertical } = setup();
    intent();
    intent();
    await waitFor(() => expect(primaryButton()).not.toBeNull());
    await clickWhenFocusSettled(primaryButton()!);
    await waitFor(() => expect(screen.getByText("Step two body")).toBeTruthy());

    await clickWhenFocusSettled(primaryButton()!);

    await waitFor(() => expect(api.ofMethod("updateProductTour")).toHaveLength(1));
    expect(api.ofMethod("updateProductTour")[0].body?.state).toBe("completed");
    expect(onSwitchToVertical).toHaveBeenCalledTimes(1);
  });

  it("'No thanks' leaves the layout alone and persists the tour as skipped", async () => {
    const { api, intent, onSwitchToVertical } = setup();
    intent();
    intent();
    await waitFor(() => expect(skipButton()).not.toBeNull());

    await clickWhenFocusSettled(skipButton()!);

    await waitFor(() => expect(api.ofMethod("updateProductTour")).toHaveLength(1));
    expect(api.ofMethod("updateProductTour")[0].body?.state).toBe("skipped");
    expect(onSwitchToVertical).not.toHaveBeenCalled();
    await waitFor(() => expect(primaryButton()).toBeNull());
  });

  it.each(["completed", "skipped"] as const)("stays quiet for a user whose tour is already %s", async (tourState) => {
    const { api, intent } = setup({ tourState });

    intent();
    intent();
    await waitFor(() => expect(api.ofMethod("getProductTour")).toHaveLength(1));
    await act(async () => {});
    expect(primaryButton()).toBeNull();

    // further bursts must not keep hitting the API
    intent();
    intent();
    await act(async () => {});
    expect(api.ofMethod("getProductTour")).toHaveLength(1);
  });

  it("moves keyboard focus onto the primary button when the prompt opens", async () => {
    const { intent } = setup();
    intent();
    intent();
    await waitFor(() => expect(primaryButton()).not.toBeNull());

    // compare test ids, not elements: a mismatch makes `toBe` pretty-print both DOM nodes, which is slow enough to
    // blow the test timeout on a loaded CI runner
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-testid")).toBe("vertical-layout-tour-primary"),
    );
  });

  it("names the dialog after its title for assistive technology", async () => {
    const { intent } = setup();
    intent();
    intent();

    expect(
      await screen.findByRole("alertdialog", { name: "Want to view annotations in a vertical panel?" }),
    ).toBeTruthy();
  });

  it("hands keyboard focus back to where the user was once the prompt is dismissed", async () => {
    const { intent } = setup();
    const chevron = screen.getByTestId("chevron");
    chevron.focus();
    intent();
    intent();
    const focused = () => document.activeElement?.getAttribute("data-testid");
    await waitFor(() => expect(focused()).toBe("vertical-layout-tour-primary"));

    await clickWhenFocusSettled(skipButton()!);

    await waitFor(() => expect(focused()).toBe("chevron"));
  });

  it("does not stack the prompt on another open tour, and still starts on a later burst", async () => {
    const { api, intent } = setup();
    const otherTour = document.createElement("div");
    otherTour.setAttribute("role", "alertdialog");
    document.body.appendChild(otherTour);
    try {
      intent();
      intent();
      await act(async () => {});
      expect(api.ofMethod("getProductTour")).toHaveLength(0);
    } finally {
      otherTour.remove();
    }

    intent();
    await waitFor(() => expect(primaryButton()).not.toBeNull());
  });

  it("keeps Enter inside the tooltip so editor-level Enter hotkeys cannot cancel the focused button's click", async () => {
    const { intent } = setup();
    intent();
    intent();
    await waitFor(() => expect(primaryButton()).not.toBeNull());

    const documentKeydown = mock();
    document.addEventListener("keydown", documentKeydown);
    try {
      fireEvent.keyDown(primaryButton()!, { key: "Enter" });
      expect(documentKeydown).not.toHaveBeenCalled();

      // everything else keeps bubbling: Tab belongs to Joyride's focus trap, Escape to its close handler
      fireEvent.keyDown(primaryButton()!, { key: "Tab" });
      expect(documentKeydown).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener("keydown", documentKeydown);
    }
  });

  it("never starts during automation (WebDriver)", async () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: true });
    const { api, intent } = setup();

    intent();
    intent();
    await act(async () => {});

    expect(api.ofMethod("getProductTour")).toHaveLength(0);
  });
});
