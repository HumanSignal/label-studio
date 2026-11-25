/**
 * FIT-3345: the classic editor binds the vertical-layout nudge to the MST settings. The intent detector, tour
 * mechanics and tooltip are covered in `libs/core/src/lib/topbar/__tests__`; these tests pin what only the editor
 * knows: who is eligible, what "Yes, switch" does to the settings, and that the tour outlives the layout switch
 * (which removes the TopBar from the tree, as `App.jsx` does).
 *
 * Kept free of layout mocks and global stubs on purpose: Joyride and `window.APP_SETTINGS` are shared with every
 * other file in the (single-process) Bun run.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import * as coreModule from "@humansignal/core";
import { ClassicVerticalLayoutNudge } from "../ClassicVerticalLayoutNudge";
import * as productTourApiModule from "../product-tour-api";

const FF_VERTICAL_LAYOUT = "fflag_feat_front_fit_annotations_vertical_layout_short";
const originalAppSettings = window.APP_SETTINGS;

function createStore({
  layout = "horizontal",
  tabs = true,
}: {
  layout?: "horizontal" | "vertical";
  tabs?: boolean;
} = {}) {
  const settings = observable({ annotationsListLayout: layout });
  return {
    hasInterface: (name: string) => tabs && name === "annotations:tabs",
    settings: {
      get annotationsListLayout() {
        return settings.annotationsListLayout;
      },
      setAnnotationsListLayout: mock((value: "horizontal" | "vertical") => {
        runInAction(() => {
          settings.annotationsListLayout = value;
        });
      }),
    },
  };
}

type FakeStore = ReturnType<typeof createStore>;

/** Stands in for the carousel: reports paging intent through the context hook, like the editor's carousel wrapper. */
function IntentProbe() {
  const onNavigationIntent = coreModule.useCarouselNavigationIntent();
  return <button type="button" data-testid="probe" onClick={() => onNavigationIntent?.("chevron")} />;
}

/** What `App.jsx` does: the TopBar (and its carousel) is not rendered at all once the vertical sidebar takes over. */
const EditorLayout = observer(({ store }: { store: FakeStore }) =>
  store.settings.annotationsListLayout === "vertical" ? <div data-testid="vertical-sidebar" /> : <IntentProbe />,
);

function createTourApi() {
  const calls: string[] = [];
  const callApi = (method: string) => {
    calls.push(method);
    if (method === "getProductTour") {
      return Promise.resolve({
        $meta: { status: 200 },
        state: "ready",
        steps: [
          {
            target: "body",
            title: "Switch?",
            content: "Step one",
            disableBeacon: true,
            disableOverlay: true,
            showSkipButton: true,
          },
          { target: "body", title: "Settings", content: "Step two", disableBeacon: true, disableOverlay: true },
        ],
      });
    }
    return Promise.resolve({ $meta: { status: 200 } });
  };
  return { calls, api: { callApi } };
}

function renderEditor(store: FakeStore) {
  return render(
    <ClassicVerticalLayoutNudge store={store}>
      <EditorLayout store={store} />
    </ClassicVerticalLayoutNudge>,
  );
}

/**
 * Joyride keeps polling (every frame) until its primary button has focus. Clicking before that lets the tooltip
 * unmount with the poll still running, and in the shared Bun process it then keeps stealing focus from later files.
 */
const focusSettledOnPrimary = () =>
  waitFor(() => expect(document.activeElement?.getAttribute("data-testid")).toBe("vertical-layout-tour-primary"));

const pageTwice = () => {
  fireEvent.click(screen.getByTestId("probe"));
  fireEvent.click(screen.getByTestId("probe"));
};

describe("ClassicVerticalLayoutNudge", () => {
  let flags: Record<string, boolean>;
  let tour: { calls: string[]; api: { callApi: (method: string) => Promise<Record<string, unknown>> } };

  beforeEach(() => {
    flags = { [FF_VERTICAL_LAYOUT]: true };
    spyOn(coreModule.ff, "isActive").mockImplementation((flag: string) => Boolean(flags[flag]));
    window.APP_SETTINGS = { ...(window.APP_SETTINGS ?? {}), user: { role: "OW" } } as typeof window.APP_SETTINGS;
    tour = createTourApi();
    spyOn(productTourApiModule, "useProductTourApi").mockReturnValue(tour.api);
  });

  afterEach(() => {
    // Joyride leaves its portal container in <body>; a bloated body makes other files' failing `toBe(element)` assertions
    // print enormous DOM dumps (slow enough to time out) in the shared Bun process
    document.getElementById("react-joyride-portal")?.remove();
    window.APP_SETTINGS = originalAppSettings;
  });

  it("starts the tour after repeated paging intent for an eligible user", async () => {
    renderEditor(createStore());

    fireEvent.click(screen.getByTestId("probe"));
    await act(async () => {});
    expect(tour.calls).toEqual([]);

    fireEvent.click(screen.getByTestId("probe"));
    await waitFor(() => expect(tour.calls).toContain("getProductTour"));
    // end the tour inside the test: Joyride keeps a focus loop alive while a tooltip is open
    await focusSettledOnPrimary();
    fireEvent.click(screen.getByTestId("vertical-layout-tour-skip"));
    await waitFor(() => expect(screen.queryByTestId("vertical-layout-tour-tooltip")).toBeNull());
  });

  it.each([
    ["the vertical layout flag is off", () => (flags[FF_VERTICAL_LAYOUT] = false), {}],
    [
      "the user is an annotator (the Settings toggle is hidden from them)",
      () => (window.APP_SETTINGS = { ...window.APP_SETTINGS, user: { role: "AN" } } as typeof window.APP_SETTINGS),
      {},
    ],
    ["the layout is already vertical", () => {}, { layout: "vertical" as const }],
    ["the carousel tabs interface is off (no Settings toggle to point at)", () => {}, { tabs: false }],
  ])("never starts when %s", async (_label, arrange, storeOptions) => {
    arrange();
    const store = createStore(storeOptions);
    render(
      <ClassicVerticalLayoutNudge store={store}>
        <IntentProbe />
      </ClassicVerticalLayoutNudge>,
    );

    pageTwice();
    pageTwice();
    await act(async () => {});

    expect(tour.calls).toEqual([]);
  });

  it("accepting applies the vertical layout and the tour's Settings step survives the carousel unmounting", async () => {
    const store = createStore();
    renderEditor(store);
    pageTwice();

    await screen.findByTestId("vertical-layout-tour-primary");
    await focusSettledOnPrimary();
    fireEvent.click(screen.getByTestId("vertical-layout-tour-primary"));

    await waitFor(() => expect(store.settings.setAnnotationsListLayout).toHaveBeenCalledWith("vertical"));
    expect(screen.queryByTestId("probe")).toBeNull();
    expect(screen.getByTestId("vertical-sidebar")).toBeTruthy();
    // the carousel is gone, yet the second step is up
    await waitFor(() => expect(screen.getByText("Step two")).toBeTruthy());

    // end the tour inside the test: Joyride keeps a focus loop alive while a tooltip is open
    await focusSettledOnPrimary();
    fireEvent.click(screen.getByTestId("vertical-layout-tour-primary"));
    await waitFor(() => expect(screen.queryByTestId("vertical-layout-tour-tooltip")).toBeNull());
  });
});
