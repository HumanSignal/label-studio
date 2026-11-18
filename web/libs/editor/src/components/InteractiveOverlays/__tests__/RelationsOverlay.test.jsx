/**
 * Unit tests for RelationsOverlay (components/InteractiveOverlays/RelationsOverlay.jsx)
 *
 * The overlay builds a "connection" per relation, and every connection owns two
 * watchers (a MutationObserver, or a set of MobX observers on the region and its
 * parent tag). These tests pin down that a connection is built once per pair of
 * nodes and released on unmount - building one per render leaked observers for
 * the lifetime of the page and made the editor slower the longer it was used.
 */
import { act, render } from "@testing-library/react";
import NodesConnector from "../NodesConnector";
import { RelationsOverlayView } from "../RelationsOverlay";

mockModule("react-virtualized-auto-sizer", () => ({
  __esModule: true,
  // jsdom measures every box as 0x0 and AutoSizer skips its children at that
  // size, so give it a viewport.
  default: ({ children }) => children({ width: 800, height: 600 }),
}));

mockModule("../NodesConnector", () => ({
  __esModule: true,
  default: {
    connect: mock(({ id }) => ({
      id,
      color: "#fa541c",
      start: {},
      end: {},
      onChange: mock(),
      destroy: mock(),
    })),
    getNodesBBox: mock(() => ({
      start: { x: 0, y: 0, width: 10, height: 10 },
      end: { x: 50, y: 50, width: 10, height: 10 },
    })),
    calculatePath: mock(() => ["M 0 0 L 50 50", [25, 25]]),
  },
}));

const makeNode = () => ({ hidden: false });

const makeRelation = (id, overrides = {}) => ({
  id,
  direction: "right",
  visible: true,
  shouldRender: true,
  selectedValues: [],
  node1: makeNode(),
  node2: makeNode(),
  ...overrides,
});

const connectionsMade = () => NodesConnector.connect.mock.results.map((result) => result.value);

const renderOverlay = (relations, props = {}) => {
  const ref = { current: null };
  const view = <RelationsOverlayView ref={ref} relations={relations} visible={true} highlighted={null} {...props} />;
  const result = render(view);

  return { ...result, ref, view };
};

describe("RelationsOverlay", () => {
  beforeAll(() => {
    // jsdom has no SVG layout engine; RelationLabel measures its text with it.
    if (!SVGElement.prototype.getBBox) {
      SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 20, height: 10 });
    }
  });

  beforeEach(() => {
    NodesConnector.connect.mockClear();
    NodesConnector.getNodesBBox.mockClear();
    NodesConnector.calculatePath.mockClear();
  });

  it("draws every relation on first mount", () => {
    const { container } = renderOverlay([makeRelation("r1"), makeRelation("r2")]);

    expect(container.querySelector("#r1")).not.toBeNull();
    expect(container.querySelector("#r2")).not.toBeNull();
  });

  it("builds one connection per relation", () => {
    renderOverlay([makeRelation("r1"), makeRelation("r2"), makeRelation("r3")]);

    expect(NodesConnector.connect).toHaveBeenCalledTimes(3);
  });

  it("does not rebuild connections when re-rendered", () => {
    const relations = [makeRelation("r1"), makeRelation("r2"), makeRelation("r3")];
    const { rerender, view, ref } = renderOverlay(relations);

    expect(NodesConnector.connect).toHaveBeenCalledTimes(3);

    // The signals that force the overlay to recompute its geometry: a scroll or
    // resize, and a change of the highlighted relation.
    act(() => ref.current.onResize());
    act(() => ref.current.onResize());
    rerender(view);
    rerender(<RelationsOverlayView ref={ref} relations={relations} visible={true} highlighted={relations[0]} />);

    expect(NodesConnector.connect).toHaveBeenCalledTimes(3);
    // Geometry is still recomputed, which is what keeps the arrows in place.
    expect(NodesConnector.getNodesBBox.mock.calls.length).toBeGreaterThan(3);
  });

  it("releases every connection it built on unmount", () => {
    const relations = [makeRelation("r1"), makeRelation("r2")];
    const { rerender, view, unmount, ref } = renderOverlay(relations);

    // Re-render a few times the way a real session does, then check that nothing
    // was left behind: as many connections built as released.
    act(() => ref.current.onResize());
    rerender(view);
    act(() => ref.current.onResize());
    rerender(<RelationsOverlayView ref={ref} relations={relations} visible={true} highlighted={relations[1]} />);

    const connections = connectionsMade();

    unmount();

    expect(connections).toHaveLength(2);
    connections.forEach((connection) => {
      expect(connection.destroy).toHaveBeenCalledTimes(1);
    });
  });

  it("rebuilds the connection when a relation points at a different node", () => {
    const relation = makeRelation("r1");
    const { rerender, ref } = renderOverlay([relation]);
    const [first] = connectionsMade();

    const moved = { ...relation, node2: makeNode() };

    rerender(<RelationsOverlayView ref={ref} relations={[moved]} visible={true} highlighted={null} />);

    expect(NodesConnector.connect).toHaveBeenCalledTimes(2);
    expect(first.destroy).toHaveBeenCalledTimes(1);
  });

  it("updates labels and direction without rebuilding the connection", () => {
    const relation = makeRelation("r1", { selectedValues: ["origin"] });
    const { rerender, ref, container } = renderOverlay([relation]);

    expect(container.querySelector("text").textContent).toBe("origin");

    const relabelled = { ...relation, selectedValues: ["renamed"], direction: "left" };

    rerender(<RelationsOverlayView ref={ref} relations={[relabelled]} visible={true} highlighted={null} />);

    expect(container.querySelector("text").textContent).toBe("renamed");
    expect(NodesConnector.connect).toHaveBeenCalledTimes(1);
  });
});
