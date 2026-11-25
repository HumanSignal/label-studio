import { fireEvent, render, screen } from "@testing-library/react";
import { AnnotationsCarousel } from "../AnnotationsCarousel";
import type { AnnotationActionHandlers, AnnotationCapabilities, SharedAnnotation } from "../types";

mockModule("react-virtualized-auto-sizer", () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => unknown }) =>
    children({ width: 400, height: 300 }),
}));

const fullCapabilities: AnnotationCapabilities = {
  groundTruthEnabled: true,
  enableCreateAnnotation: true,
  enableAnnotationDelete: true,
  enableAnnotations: true,
  enablePredictions: true,
  enableCopyLink: false,
  showUserInfo: true,
};

function makeAnnotation(id: string, overrides: Partial<SharedAnnotation> = {}): SharedAnnotation {
  return {
    id,
    pk: id,
    type: "annotation",
    selected: false,
    createdBy: `user-${id}`,
    createdDate: new Date("2024-01-15T10:00:00Z").toISOString(),
    user: null,
    groundTruth: false,
    skipped: false,
    draftId: 0,
    score: null,
    commentCount: 0,
    unresolvedCommentCount: 0,
    acceptedState: null,
    ...overrides,
  };
}

function makeHandlers(): AnnotationActionHandlers {
  return {
    onSelect: mock(),
    onSetGroundTruth: mock(),
    onDuplicate: mock(),
    onDelete: mock(),
    onShowOtherAnnotations: mock(),
  };
}

describe("shared AnnotationsCarousel", () => {
  it("renders nothing when capabilities disable both annotations and predictions and create", () => {
    const { container } = render(
      <AnnotationsCarousel
        entities={[makeAnnotation("a")]}
        selectedId={null}
        capabilities={{
          ...fullCapabilities,
          enableAnnotations: false,
          enablePredictions: false,
          enableCreateAnnotation: false,
        }}
        handlers={makeHandlers()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders one tab per entity in the supplied order (no internal sort)", () => {
    const entities = [
      makeAnnotation("c", { createdDate: "2024-01-15T12:00:00Z" }),
      makeAnnotation("b", { createdDate: "2024-01-15T10:00:00Z" }),
      makeAnnotation("a", { createdDate: "2024-01-15T11:00:00Z" }),
    ];
    const { container } = render(
      <AnnotationsCarousel
        entities={entities}
        selectedId={null}
        capabilities={fullCapabilities}
        handlers={makeHandlers()}
      />,
    );
    const buttons = Array.from(container.querySelectorAll("[data-annotation-id]"));
    expect(buttons.map((el) => el.getAttribute("data-annotation-id"))).toEqual(["c", "b", "a"]);
  });

  it("uses the BEM block class on the carousel root and container element", () => {
    const { container } = render(
      <AnnotationsCarousel
        entities={[makeAnnotation("a")]}
        selectedId={null}
        capabilities={fullCapabilities}
        handlers={makeHandlers()}
      />,
    );
    expect(container.querySelector(".ls-annotations-carousel")).not.toBeNull();
    expect(container.querySelector(".ls-annotations-carousel__container")).not.toBeNull();
  });

  it("uses the virtualized branch when virtualizationEnabled is true and over the threshold", () => {
    const entities = Array.from({ length: 60 }, (_, i) => makeAnnotation(`a-${i}`));
    const { container } = render(
      <AnnotationsCarousel
        entities={entities}
        selectedId={null}
        capabilities={fullCapabilities}
        handlers={makeHandlers()}
        virtualizationEnabled
      />,
    );
    // Branch signal is the BEM modifier. The react-window List (`__scroll`) mounts
    // inside AutoSizer and may not render in jsdom without layout measurements.
    expect(container.querySelector(".ls-annotations-carousel_virtualized")).not.toBeNull();
  });

  it("puts annotation rows in a dedicated scroll region for non-virtualized vertical layout", () => {
    const onAddNew = mock();
    const { container } = render(
      <AnnotationsCarousel
        entities={[makeAnnotation("a"), makeAnnotation("b")]}
        selectedId={null}
        capabilities={fullCapabilities}
        handlers={makeHandlers()}
        layout="vertical"
        showAddNew
        onAddNew={onAddNew}
        emptyState={<div data-testid="carousel-empty-state">No matching results</div>}
      />,
    );

    const listContainer = container.querySelector(".ls-annotations-carousel__container");
    const scrollRegion = container.querySelector(".ls-annotations-carousel__listScroll");
    const addNewRow = screen.getByTestId("annotations-sidebar-add-new");
    const emptyState = screen.getByTestId("carousel-empty-state");
    const rows = Array.from(container.querySelectorAll("[data-annotation-id]"));

    expect(listContainer).not.toBeNull();
    expect(scrollRegion).not.toBeNull();
    expect(listContainer?.classList.contains("ls-annotations-carousel__scroll")).toBe(false);
    expect(scrollRegion?.classList.contains("ls-annotations-carousel__scroll")).toBe(true);

    expect(listContainer?.contains(addNewRow)).toBe(true);
    expect(scrollRegion?.contains(addNewRow)).toBe(false);

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(scrollRegion?.contains(row)).toBe(true);
    }
    expect(scrollRegion?.contains(emptyState)).toBe(true);
  });

  it("does NOT use the virtualized branch when virtualizationEnabled is false even with many items", () => {
    const entities = Array.from({ length: 60 }, (_, i) => makeAnnotation(`a-${i}`));
    const { container } = render(
      <AnnotationsCarousel
        entities={entities}
        selectedId={null}
        capabilities={fullCapabilities}
        handlers={makeHandlers()}
        virtualizationEnabled={false}
      />,
    );
    expect(container.querySelector(".ls-annotations-carousel_virtualized")).toBeNull();
    // The classic-typo carousel-track element name is preserved for selector parity.
    expect(container.querySelector(".ls-annotations-carousel__carosel")).not.toBeNull();
  });

  it("filters out annotations when capabilities.enableAnnotations is false", () => {
    const entities = [makeAnnotation("a"), makeAnnotation("p", { type: "prediction" })];
    const { container } = render(
      <AnnotationsCarousel
        entities={entities}
        selectedId={null}
        capabilities={{ ...fullCapabilities, enableAnnotations: false }}
        handlers={makeHandlers()}
      />,
    );
    expect(container.querySelector('[data-annotation-id="a"]')).toBeNull();
    expect(container.querySelector('[data-annotation-id="p"]')).not.toBeNull();
  });

  it("filters out predictions when capabilities.enablePredictions is false", () => {
    const entities = [makeAnnotation("a"), makeAnnotation("p", { type: "prediction" })];
    const { container } = render(
      <AnnotationsCarousel
        entities={entities}
        selectedId={null}
        capabilities={{ ...fullCapabilities, enablePredictions: false }}
        handlers={makeHandlers()}
      />,
    );
    expect(container.querySelector('[data-annotation-id="a"]')).not.toBeNull();
    expect(container.querySelector('[data-annotation-id="p"]')).toBeNull();
  });
});

describe("shared AnnotationsCarousel navigation intent", () => {
  const manyEntities = Array.from({ length: 60 }, (_, i) => makeAnnotation(`a-${i}`));
  const fewEntities = Array.from({ length: 5 }, (_, i) => makeAnnotation(`a-${i}`));

  // jsdom has no layout, so the non-virtualized strip never overflows. Give the strip and its
  // container widths so the chevrons render.
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  function stubOverflowingStrip() {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains("ls-annotations-carousel__carosel") ? 1000 : 300;
      },
    });
  }
  afterEach(() => {
    // jsdom defines clientWidth on Element.prototype, so there is usually no own descriptor to put back: remove the stub
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
    else Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  });

  function renderCarousel(
    entities: SharedAnnotation[],
    props: Partial<React.ComponentProps<typeof AnnotationsCarousel>> = {},
  ) {
    return render(
      <AnnotationsCarousel
        entities={entities}
        selectedId={null}
        capabilities={fullCapabilities}
        handlers={makeHandlers()}
        {...props}
      />,
    );
  }

  it("reports a chevron intent for each click on the virtualized list", () => {
    const onNavigationIntent = mock();
    renderCarousel(manyEntities, { virtualizationEnabled: true, onNavigationIntent });

    fireEvent.click(screen.getByLabelText("Carousel right"));
    expect(onNavigationIntent).toHaveBeenCalledTimes(1);
    expect(onNavigationIntent).toHaveBeenLastCalledWith("chevron");
  });

  it("reports a chevron intent for each click on the non-virtualized list", () => {
    stubOverflowingStrip();
    const onNavigationIntent = mock();
    renderCarousel(fewEntities, { onNavigationIntent });

    fireEvent.click(screen.getByLabelText("Carousel right"));
    expect(onNavigationIntent).toHaveBeenCalledTimes(1);
    expect(onNavigationIntent).toHaveBeenLastCalledWith("chevron");
  });

  it("does not report an intent for a disabled chevron", () => {
    const onNavigationIntent = mock();
    renderCarousel(manyEntities, { virtualizationEnabled: true, onNavigationIntent });

    // Strip starts at offset 0, so "left" is disabled
    fireEvent.click(screen.getByLabelText("Carousel left"));
    expect(onNavigationIntent).not.toHaveBeenCalled();
  });

  it("reports a wheel intent over the virtualized list (vertical wheel included)", () => {
    const onNavigationIntent = mock();
    const { container } = renderCarousel(manyEntities, { virtualizationEnabled: true, onNavigationIntent });

    fireEvent.wheel(container.querySelector(".ls-annotations-carousel__container")!, { deltaY: 100 });
    expect(onNavigationIntent).toHaveBeenCalledTimes(1);
    expect(onNavigationIntent).toHaveBeenLastCalledWith("wheel");
  });

  it("reports a wheel intent over the non-virtualized list, where wheel does not scroll", () => {
    stubOverflowingStrip();
    const onNavigationIntent = mock();
    const { container } = renderCarousel(fewEntities, { onNavigationIntent });

    fireEvent.wheel(container.querySelector(".ls-annotations-carousel__container")!, { deltaX: 120 });
    expect(onNavigationIntent).toHaveBeenCalledTimes(1);
    expect(onNavigationIntent).toHaveBeenLastCalledWith("wheel");
  });

  it("does not report wheel intent over a strip that fits (nothing to page)", () => {
    const onNavigationIntent = mock();
    const { container } = renderCarousel(fewEntities.slice(0, 2), { onNavigationIntent });

    expect(screen.queryByLabelText("Carousel right")).toBeNull();
    fireEvent.wheel(container.querySelector(".ls-annotations-carousel__container")!, { deltaY: 200 });
    expect(onNavigationIntent).not.toHaveBeenCalled();
  });

  it("reports one wheel intent for a whole trackpad gesture", () => {
    stubOverflowingStrip();
    const onNavigationIntent = mock();
    const { container } = renderCarousel(fewEntities, { onNavigationIntent });
    const target = container.querySelector(".ls-annotations-carousel__container")!;

    for (let i = 0; i < 30; i++) fireEvent.wheel(target, { deltaX: 12 });
    expect(onNavigationIntent).toHaveBeenCalledTimes(1);
  });

  it("ignores a barely-there wheel nudge", () => {
    const onNavigationIntent = mock();
    const { container } = renderCarousel(fewEntities, { onNavigationIntent });

    fireEvent.wheel(container.querySelector(".ls-annotations-carousel__container")!, { deltaY: 3 });
    expect(onNavigationIntent).not.toHaveBeenCalled();
  });

  it("never reports scroll events as intent (they also fire for programmatic scrolling)", () => {
    const onNavigationIntent = mock();
    const { container } = renderCarousel(manyEntities, { virtualizationEnabled: true, onNavigationIntent });

    // Scroll events do not bubble: fire one on every element that could be the scroller (react-window's list
    // only mounts when AutoSizer measures a size, which depends on what other test files mocked).
    for (const element of [
      container.firstElementChild!,
      ...container.querySelectorAll("[class*='annotations-carousel']"),
    ]) {
      fireEvent.scroll(element, { target: { scrollLeft: 500 } });
    }
    expect(onNavigationIntent).not.toHaveBeenCalled();
  });

  it("does not report wheel intent in the vertical layout", () => {
    const onNavigationIntent = mock();
    const { container } = renderCarousel(fewEntities, { layout: "vertical", onNavigationIntent });

    fireEvent.wheel(container.querySelector(".ls-annotations-carousel__container")!, { deltaY: 200 });
    expect(onNavigationIntent).not.toHaveBeenCalled();
  });
});
