import { act, render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import type { FC } from "react";
import { Host } from "../../DetailsPanel/DetailsPanel";
import { SideTabsPanels } from "../SideTabsPanels";
import { type HostPanelConfig, type PanelBBox, Side } from "../types";
import { HOST_VIEW_NAME, panelComponents, partialEmptyBaseProps } from "../utils";

/**
 * UTC-1446: the side panels' end of the generic host tab — a tab some host app fills through a portal.
 *
 * The host never sees the layout: it registers, says whether the tab is shown, asks for it to be brought forward,
 * and is handed the tab's body element. These tests hold the editor to that: the tab comes and goes while the editor
 * stays open, the host learns where it can render (and only from the real tab body, never from the drag ghost's
 * copy), and it is told when the side panels cannot show the tab at all.
 */

const NATIVE_TABS = ["regions", "relations", "info", "comments", "history"];
const realComponents = { ...panelComponents };

/** Native tabs as plain stubs: these tests are about the host tab, not about what the others render. */
const stub = (name: string): FC => {
  const Stub: FC = () => <div data-testid={`body-${name}`} />;
  return Stub;
};

const view = (name: string, active = false) => ({ name, title: name, component: () => null, active });
const panel = (panelViews: ReturnType<typeof view>[], overrides: Partial<PanelBBox> = {}): PanelBBox => ({
  order: 1,
  top: 0,
  left: 0,
  relativeLeft: 0,
  relativeTop: 0,
  zIndex: 10,
  width: 320,
  height: 400,
  visible: true,
  detached: false,
  alignment: Side.right,
  maxHeight: 800,
  panelViews,
  ...overrides,
});

/** The enterprise default the user last left: Info active, next to Comments and History. */
const saveLayout = () =>
  window.localStorage.setItem(
    "panelState",
    JSON.stringify({
      panelData: {
        "info-comments-history": panel([view("info", true), view("comments"), view("history")]),
        "regions-relations": panel([view("regions", true), view("relations")], { order: 2 }),
      },
      collapsedSide: { left: false, right: false },
    }),
  );

let width = 1400;
const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");

const currentEntity = { id: 1, regionStore: { selection: {} }, store: { settings: {} } };

const registration = (overrides: Partial<HostPanelConfig> = {}): HostPanelConfig => ({
  title: "Helper",
  shown: false,
  onElement: mock(),
  onAvailability: mock(),
  ...overrides,
});

/** The editor store as the host tab's body sees it: it reads the registration's onElement from there. */
const editorStore: { hostPanel: HostPanelConfig | null } = { hostPanel: null };

const renderPanels = (hostPanel: HostPanelConfig | null, extra: { focus?: number; panelsHidden?: boolean } = {}) => {
  editorStore.hostPanel = hostPanel;
  return (
    <Provider store={editorStore}>
      <SideTabsPanels
        panelsHidden={extra.panelsHidden ?? false}
        store={editorStore}
        currentEntity={currentEntity}
        showComments={true}
        showCustomTab={false}
        focusTab={null}
        hostPanel={hostPanel}
        hostPanelFocusRequest={extra.focus ?? 0}
      >
        <div />
      </SideTabsPanels>
    </Provider>
  );
};

/** The label of a tab, by its title. */
const tabLabel = (title: string) => document.getElementById(`${title}-draggable`)?.firstElementChild ?? null;
const isActive = (title: string) => !!tabLabel(title)?.className.includes("_active");

describe("host tab in the side panels", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 800 });
  });

  afterAll(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
  });

  beforeEach(() => {
    width = 1400;
    for (const name of NATIVE_TABS) panelComponents[name] = stub(name) as any;
    saveLayout();
  });

  afterEach(() => {
    Object.assign(panelComponents, realComponents);
    window.localStorage.removeItem("panelState");
  });

  it("adds the tab while the editor stays open, and removes it again", () => {
    const config = registration();
    const view = render(renderPanels(config));

    expect(tabLabel("Helper")).toBeNull();

    const shown = { ...config, shown: true };
    view.rerender(renderPanels(shown));
    // Next to Info, and the person's own tab stays the one on screen.
    expect(tabLabel("Helper")).not.toBeNull();
    expect(isActive("info")).toBe(true);
    expect(isActive("Helper")).toBe(false);
    expect(config.onElement).not.toHaveBeenCalled();

    view.rerender(renderPanels({ ...config, shown: false }));
    expect(tabLabel("Helper")).toBeNull();
    expect(isActive("info")).toBe(true);
  });

  it("brings the tab forward when asked together with showing it, and hands the host its body element", () => {
    const config = registration();
    const view = render(renderPanels(config));

    view.rerender(renderPanels({ ...config, shown: true }, { focus: 1 }));

    expect(isActive("Helper")).toBe(true);
    expect(screen.queryByTestId("body-info")).toBeNull();
    const element = (config.onElement as ReturnType<typeof mock>).mock.calls.at(-1)?.[0] as HTMLElement;
    expect(element instanceof HTMLElement).toBe(true);
    expect(element.isConnected).toBe(true);

    // Switching to another tab takes the element away; the host is told so.
    view.rerender(renderPanels({ ...config, shown: false }, { focus: 1 }));
    expect((config.onElement as ReturnType<typeof mock>).mock.calls.at(-1)?.[0]).toBeNull();
  });

  it("brings an already shown tab forward on each new request", () => {
    const config = registration({ shown: true });
    const view = render(renderPanels(config));
    expect(isActive("Helper")).toBe(false);

    view.rerender(renderPanels(config, { focus: 1 }));
    expect(isActive("Helper")).toBe(true);
  });

  it("puts a dot on the tab's label only while the host asks for one", () => {
    const config = registration({ shown: true });
    const view = render(renderPanels(config));
    const hasDot = (title: string) => !!tabLabel(title)?.querySelector('[class*="panel-tabs__badge"]');

    expect(hasDot("Helper")).toBe(false);

    view.rerender(renderPanels({ ...config, badge: true }));
    expect(hasDot("Helper")).toBe(true);
    for (const title of ["info", "comments", "history", "regions", "relations"]) expect(hasDot(title)).toBe(false);

    view.rerender(renderPanels({ ...config, badge: false }));
    expect(hasDot("Helper")).toBe(false);
  });

  it("tightens a strip once it holds four tabs, so every title fits the default panel; three keep their look", () => {
    const config = registration();
    const view = render(renderPanels(config));
    const isCrowded = (title: string) =>
      !!tabLabel(title)?.closest('[class*="tabs__tabs-row"]')?.className.includes("tabs__tabs-row_crowded");

    expect(isCrowded("info")).toBe(false);

    view.rerender(renderPanels({ ...config, shown: true }));
    expect(isCrowded("info")).toBe(true);
    expect(isCrowded("regions")).toBe(false);

    view.rerender(renderPanels({ ...config, shown: false }));
    expect(isCrowded("info")).toBe(false);
  });

  it("leaves a strip of four native tabs as it is: only a strip with the host's tab is tightened", () => {
    window.localStorage.setItem(
      "panelState",
      JSON.stringify({
        panelData: {
          "info-comments-history-relations": panel([
            view("info", true),
            view("comments"),
            view("history"),
            view("relations"),
          ]),
          regions: panel([view("regions", true)], { order: 2 }),
        },
        collapsedSide: { left: false, right: false },
      }),
    );
    render(renderPanels(registration()));
    const isCrowded = (title: string) =>
      !!tabLabel(title)?.closest('[class*="tabs__tabs-row"]')?.className.includes("tabs__tabs-row_crowded");

    expect(tabLabel("relations")?.closest('[class*="tabs__tabs-row"]')).toBe(
      tabLabel("info")?.closest('[class*="tabs__tabs-row"]'),
    );
    expect(isCrowded("info")).toBe(false);
  });

  it("tells the host when the tab can be on screen: columns yes, Compare All and unmount no", () => {
    const config = registration();
    const view = render(renderPanels(config));
    const reports = () => (config.onAvailability as ReturnType<typeof mock>).mock.calls.map((call) => call[0]);

    expect(reports().at(-1)).toBe(true);

    view.rerender(renderPanels(config, { panelsHidden: true }));
    expect(reports().at(-1)).toBe(false);

    view.rerender(renderPanels(config));
    expect(reports().at(-1)).toBe(true);

    view.unmount();
    expect(reports().at(-1)).toBe(false);
  });

  it("never reports a narrow editor as available: its bottom panel has no host tab", () => {
    width = 900;
    // The bottom panel's fixed list holds the real native tabs; stub them for this render only.
    const bottomViews = partialEmptyBaseProps.panelViews;
    const realBottom = bottomViews.map((bottomView) => bottomView.component);
    bottomViews.forEach((bottomView) => {
      bottomView.component = stub(bottomView.name) as any;
    });
    const config = registration({ shown: true });
    try {
      render(renderPanels(config));
    } finally {
      bottomViews.forEach((bottomView, index) => {
        bottomView.component = realBottom[index];
      });
    }

    expect((config.onAvailability as ReturnType<typeof mock>).mock.calls.some((call) => call[0] === true)).toBe(false);
    expect(tabLabel("Helper")).toBeNull();
  });
});

describe("host tab body", () => {
  it("is handed to the host only by the real tab, never by the drag ghost's inactive copy", () => {
    const onElement = mock();
    const store = { hostPanel: { title: "Helper", shown: true, onElement } };

    const ghost = render(<Host store={store} isActive={false} />);
    expect(onElement).not.toHaveBeenCalled();

    const real = render(<Host store={store} isActive={true} />);
    expect(onElement).toHaveBeenCalledTimes(1);
    const element = onElement.mock.calls[0][0] as HTMLElement;
    expect(element === real.container.firstElementChild).toBe(true);

    // The ghost going away (the drag ends) must not take the real element from the host.
    ghost.unmount();
    expect(onElement).toHaveBeenCalledTimes(1);

    real.unmount();
    expect(onElement).toHaveBeenCalledTimes(2);
    expect(onElement.mock.calls[1][0]).toBeNull();
  });

  it("tells the callback it reported to that the element is gone, even after the host re-registered", () => {
    const first = mock();
    const second = mock();
    const store: { hostPanel: { title: string; shown: boolean; onElement: typeof first } | null } = {
      hostPanel: { title: "Helper", shown: true, onElement: first },
    };

    const real = render(<Host store={store} isActive={true} />);
    store.hostPanel = null;
    act(() => real.unmount());

    expect(first.mock.calls.map((call) => call[0] === null)).toEqual([false, true]);
    expect(second).not.toHaveBeenCalled();
  });
});

it("registers the host tab body permanently under one reserved view name", () => {
  expect(panelComponents[HOST_VIEW_NAME] === Host).toBe(true);
});
