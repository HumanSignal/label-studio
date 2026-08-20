import { render, screen } from "@testing-library/react";
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
    expect(container.querySelector(".ls-annotations-carousel_virtualized")).not.toBeNull();
    expect(container.querySelector(".ls-annotations-carousel__scroll")).not.toBeNull();
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
