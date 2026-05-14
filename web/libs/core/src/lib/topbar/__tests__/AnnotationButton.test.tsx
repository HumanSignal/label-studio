import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AnnotationButton } from "../AnnotationButton";
import type { AnnotationActionHandlers, AnnotationCapabilities, SharedAnnotation } from "../types";

const fullCapabilities: AnnotationCapabilities = {
  groundTruthEnabled: true,
  enableCreateAnnotation: true,
  enableAnnotationDelete: true,
  enablePredictionDelete: true,
  enableAnnotations: true,
  enablePredictions: true,
  enableCopyLink: true,
  enableCompareAllAnnotations: true,
  enablePerformanceDashboard: false,
  showUserInfo: true,
};

function makeAnnotation(overrides: Partial<SharedAnnotation> = {}): SharedAnnotation {
  return {
    id: "ann-1",
    pk: "1",
    type: "annotation",
    selected: false,
    createdBy: "Test User",
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

function makeHandlers(overrides: Partial<AnnotationActionHandlers> = {}): AnnotationActionHandlers {
  return {
    onSelect: mock(),
    onSetGroundTruth: mock(),
    onDuplicate: mock(),
    onDelete: mock(),
    onShowOtherAnnotations: mock(),
    ...overrides,
  };
}

describe("shared AnnotationButton", () => {
  // Selenium page objects
  // (`label-studio-test-automation/.../QuickViewTabManagement.java`) require the
  // `lsf-annotation-button` element to be a DIRECT child of the carousel container
  // (`__carosel/div`). If anything wraps the shared button — e.g. an extra `<span>`
  // in a per-row wrapper — the active-tab XPath silently returns null, breaking
  // `getCurrentAnnotationId()` and cascading into Review-Stream advancement asserts.
  // Forwarding the outer `<div>` ref lets wrappers attach IntersectionObservers
  // (e.g. `useResolveUser`) without introducing a wrapper element. Do not regress.
  it("forwards the outer ref to the lsf-annotation-button div (no DOM wrapper between carousel and button)", () => {
    const ref = createRef<HTMLDivElement>();
    const annotation = makeAnnotation({ pk: "55" });
    const { container } = render(
      <div className="lsf-annotations-carousel__carosel">
        <AnnotationButton ref={ref} annotation={annotation} capabilities={fullCapabilities} handlers={makeHandlers()} />
      </div>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current!.getAttribute("data-annotation-id")).toBe("55");
    expect(ref.current!.parentElement?.className).toBe("lsf-annotations-carousel__carosel");
    // Mirror the Selenium XPath `//div[@class='__carosel']/div[contains(@class,'lsf-annotation-button')]`.
    const directChild = container.querySelector(".lsf-annotations-carousel__carosel > [data-annotation-id='55']");
    expect(directChild).not.toBeNull();
  });

  it("renders the user display name and the data-annotation-id attribute", () => {
    const annotation = makeAnnotation({ pk: "42", createdBy: "Test User" });
    const { container } = render(
      <AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={makeHandlers()} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(container.querySelector('[data-annotation-id="42"]')).not.toBeNull();
  });

  it("falls back to entity id when pk is missing", () => {
    const annotation = makeAnnotation({ pk: null, id: "draft-7" });
    const { container } = render(
      <AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={makeHandlers()} />,
    );
    expect(container.querySelector('[data-annotation-id="draft-7"]')).not.toBeNull();
  });

  it("applies the BEM modifiers for selected/draft/skipped/groundTruth states", () => {
    const annotation = makeAnnotation({
      selected: true,
      groundTruth: true,
      skipped: true,
      pk: null,
    });
    const { container } = render(
      <AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={makeHandlers()} />,
    );
    const root = container.querySelector(".ls-annotation-button");
    expect(root).not.toBeNull();
    expect(root!.className).toMatch(/ls-annotation-button_selected/);
    expect(root!.className).toMatch(/ls-annotation-button_groundTruth/);
    expect(root!.className).toMatch(/ls-annotation-button_skipped/);
    expect(root!.className).toMatch(/ls-annotation-button_draft/);
  });

  it("invokes handlers.onSelect when an unselected button is clicked", () => {
    const handlers = makeHandlers();
    const annotation = makeAnnotation({ selected: false });
    render(<AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={handlers} />);
    fireEvent.click(screen.getByText("Test User"));
    expect(handlers.onSelect).toHaveBeenCalledWith(annotation);
  });

  it("does NOT invoke onSelect when the annotation is already selected", () => {
    const handlers = makeHandlers();
    const annotation = makeAnnotation({ selected: true });
    render(<AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={handlers} />);
    fireEvent.click(screen.getByText("Test User"));
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it("uses type-specific labels for the menu trigger (Prediction vs Annotation)", () => {
    const handlers = makeHandlers();
    const annotation = makeAnnotation({ type: "prediction", pk: "9" });
    render(
      <AnnotationButton
        annotation={annotation}
        capabilities={{ ...fullCapabilities, enablePredictionDelete: true }}
        handlers={handlers}
      />,
    );
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    expect(screen.getByText("Copy Prediction ID")).toBeInTheDocument();
    expect(screen.getByText("Duplicate as Annotation")).toBeInTheDocument();
    expect(screen.getByText("Delete Prediction")).toBeInTheDocument();
  });

  it("uses Annotation labels for an annotation entity", () => {
    const handlers = makeHandlers();
    const annotation = makeAnnotation({ type: "annotation", pk: "7" });
    render(<AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={handlers} />);
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    expect(screen.getByText("Copy Annotation ID")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Annotation")).toBeInTheDocument();
    expect(screen.getByText("Delete Annotation")).toBeInTheDocument();
  });

  it("invokes handlers.onShowOtherAnnotations when Compare All Annotations is selected", () => {
    const handlers = makeHandlers();
    const annotation = makeAnnotation({ pk: "7" });
    render(<AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={handlers} />);
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    fireEvent.click(screen.getByTestId("annotation-button-menu-compare-all"));
    expect(handlers.onShowOtherAnnotations).toHaveBeenCalledWith();
  });

  it("hides Compare All Annotations when capabilities.enableCompareAllAnnotations is false", () => {
    // Mirrors the wrapper behavior: when the host omits `annotations:view-all`
    // the left-side ViewAllToggle disappears, and the matching context-menu
    // row must disappear with it (otherwise the action would silently toggle
    // a state with no UI to leave it).
    const annotation = makeAnnotation({ pk: "7" });
    render(
      <AnnotationButton
        annotation={annotation}
        capabilities={{ ...fullCapabilities, enableCompareAllAnnotations: false }}
        handlers={makeHandlers()}
      />,
    );
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    expect(screen.queryByTestId("annotation-button-menu-compare-all")).toBeNull();
    expect(screen.queryByText("Compare All Annotations")).toBeNull();
  });

  it("shows Compare All Annotations when capabilities.enableCompareAllAnnotations is omitted (back-compat default)", () => {
    // Out-of-tree consumers that haven't been updated still see the row;
    // the contract is "explicitly false to hide".
    const { enableCompareAllAnnotations: _omitted, ...withoutFlag } = fullCapabilities;
    const annotation = makeAnnotation({ pk: "7" });
    render(<AnnotationButton annotation={annotation} capabilities={withoutFlag} handlers={makeHandlers()} />);
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    expect(screen.getByTestId("annotation-button-menu-compare-all")).toBeInTheDocument();
  });

  it("invokes handlers.onSetGroundTruth with toggled value", () => {
    const handlers = makeHandlers();
    const annotation = makeAnnotation({ pk: "7", groundTruth: false });
    render(<AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={handlers} />);
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    fireEvent.click(screen.getByText("Set as Ground Truth"));
    expect(handlers.onSetGroundTruth).toHaveBeenCalledWith(annotation, true);
  });

  it("hides Set Ground Truth when capabilities.groundTruthEnabled is false", () => {
    const annotation = makeAnnotation({ pk: "7" });
    render(
      <AnnotationButton
        annotation={annotation}
        capabilities={{ ...fullCapabilities, groundTruthEnabled: false }}
        handlers={makeHandlers()}
      />,
    );
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    expect(screen.queryByText("Set as Ground Truth")).toBeNull();
  });

  it("invokes handlers.onDelete when Delete Annotation is clicked", () => {
    const handlers = makeHandlers();
    const annotation = makeAnnotation({ pk: "7" });
    render(<AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={handlers} />);
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    fireEvent.click(screen.getByTestId("annotation-button-menu-delete"));
    expect(handlers.onDelete).toHaveBeenCalledWith(annotation);
  });

  it("renders the performance dashboard menu item only when capability is on and entity has a pk", () => {
    const handlers = makeHandlers({ onOpenPerformanceDashboard: mock() });
    const annotation = makeAnnotation({ pk: "7" });
    render(
      <AnnotationButton
        annotation={annotation}
        capabilities={{ ...fullCapabilities, enablePerformanceDashboard: true }}
        handlers={handlers}
      />,
    );
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    fireEvent.click(screen.getByTestId("annotation-button-menu-performance-dashboard"));
    expect(handlers.onOpenPerformanceDashboard).toHaveBeenCalledWith(annotation);
  });

  it("hides the performance dashboard item for predictions even with capability on", () => {
    const annotation = makeAnnotation({ type: "prediction", pk: "7" });
    render(
      <AnnotationButton
        annotation={annotation}
        capabilities={{ ...fullCapabilities, enablePerformanceDashboard: true }}
        handlers={makeHandlers({ onOpenPerformanceDashboard: mock() })}
      />,
    );
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    expect(screen.queryByText("Open Performance Dashboard")).toBeNull();
  });

  describe("clipboard capability gating (FIT-1774)", () => {
    it("shows the Copy Annotation ID item by default (capability omitted preserves classic behavior)", () => {
      // Classic editor wrapper never sets `enableCopyAnnotationId`, so the
      // shared layer must default to true to keep the menu item visible.
      const annotation = makeAnnotation({ pk: "7" });
      render(<AnnotationButton annotation={annotation} capabilities={fullCapabilities} handlers={makeHandlers()} />);
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      expect(screen.queryByTestId("annotation-button-menu-copy-id")).not.toBeNull();
    });

    it("shows the Copy Annotation ID item when enableCopyAnnotationId is explicitly true", () => {
      const annotation = makeAnnotation({ pk: "7" });
      render(
        <AnnotationButton
          annotation={annotation}
          capabilities={{ ...fullCapabilities, enableCopyAnnotationId: true }}
          handlers={makeHandlers()}
        />,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      expect(screen.queryByTestId("annotation-button-menu-copy-id")).not.toBeNull();
    });

    it("hides the Copy Annotation ID item when enableCopyAnnotationId is false (org disabled clipboard-write)", () => {
      // The new editor wrapper sets this to false when the iframe broker
      // would deny `copyToClipboard` because the org's
      // `allowed_iframe_permissions` does not include `clipboard-write`.
      // The user should never see an action they can't perform.
      const annotation = makeAnnotation({ pk: "7" });
      render(
        <AnnotationButton
          annotation={annotation}
          capabilities={{ ...fullCapabilities, enableCopyAnnotationId: false }}
          handlers={makeHandlers()}
        />,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      expect(screen.queryByTestId("annotation-button-menu-copy-id")).toBeNull();
    });

    it("hides Copy Annotation Link when enableCopyLink is false (e.g. org has disabled clipboard-write)", () => {
      const annotation = makeAnnotation({ pk: "7" });
      render(
        <AnnotationButton
          annotation={annotation}
          capabilities={{ ...fullCapabilities, enableCopyLink: false }}
          handlers={makeHandlers()}
        />,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      expect(screen.queryByTestId("annotation-button-menu-copy-link")).toBeNull();
    });

    it("hides BOTH copy items when both copy capabilities are false (full clipboard opt-out)", () => {
      const annotation = makeAnnotation({ pk: "7" });
      render(
        <AnnotationButton
          annotation={annotation}
          capabilities={{ ...fullCapabilities, enableCopyAnnotationId: false, enableCopyLink: false }}
          handlers={makeHandlers()}
        />,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      expect(screen.queryByTestId("annotation-button-menu-copy-id")).toBeNull();
      expect(screen.queryByTestId("annotation-button-menu-copy-link")).toBeNull();
    });
  });
});
