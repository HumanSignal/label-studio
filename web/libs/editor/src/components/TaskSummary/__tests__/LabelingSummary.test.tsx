import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MSTAnnotation } from "../../../stores/types";
import { LabelingSummary } from "../LabelingSummary";
import type { ControlTag, AnnotationSummary } from "../types";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

Object.defineProperty(window, "APP_SETTINGS", {
  value: {
    user: { id: 1, displayName: "Test User" },
    feature_flags: {},
    feature_flags_default_value: false,
  },
  writable: true,
  configurable: true,
});

const MANY_CONTROL_TAGS: ControlTag[] = [
  "sentiment",
  "category",
  "topic",
  "quality",
  "difficulty",
  "relevance",
  "language",
  "tone",
  "intent",
  "priority",
].map((name) => ({
  name,
  type: "choices",
  to_name: "text",
  label_attrs: {},
  per_region: false,
}));

const createAnnotation = (id: string): MSTAnnotation =>
  ({
    id,
    pk: id,
    type: "annotation" as const,
    user: { id: 1, email: "user@test.com", displayName: "User" },
    createdBy: "User",
    versions: {
      result: MANY_CONTROL_TAGS.map((c) => ({
        from_name: c.name,
        to_name: "text",
        type: "choices",
        value: { choices: ["value1"] },
      })),
    },
    results: [],
  }) as MSTAnnotation;

describe("LabelingSummary – horizontal scroll regression", () => {
  beforeEach(() => {
    window.APP_SETTINGS.feature_flags = {};
  });

  it("allows horizontal scrolling (overflowX is not hidden)", () => {
    const annotations = [createAnnotation("1"), createAnnotation("2")];

    const { container } = renderWithQueryClient(
      <LabelingSummary annotations={annotations} controls={MANY_CONTROL_TAGS} onSelect={() => {}} hideInfo={false} />,
    );

    const scrollArea = container.querySelector("[style]") as HTMLElement;
    const scrollContainer = container.firstElementChild!.firstElementChild as HTMLElement;

    expect(scrollContainer).toBeTruthy();
    const overflowX = scrollContainer.style.overflowX;
    expect(overflowX).not.toBe("hidden");
    expect(["auto", "scroll"]).toContain(overflowX);
  });

  it("renders sticky first cell in annotation rows", () => {
    const annotations = [createAnnotation("1")];

    const { container } = renderWithQueryClient(
      <LabelingSummary annotations={annotations} controls={MANY_CONTROL_TAGS} onSelect={() => {}} hideInfo={false} />,
    );

    const tbody = container.querySelector("tbody")!;
    const annotationRows = tbody.querySelectorAll("tr[data-annotation-pk]");

    expect(annotationRows.length).toBeGreaterThan(0);

    for (const row of annotationRows) {
      const firstCell = row.querySelector("td") as HTMLElement;

      expect(firstCell).toBeTruthy();
      expect(firstCell.style.position).toBe("sticky");
      expect(firstCell.style.left).toBe("0px");
    }
  });

  it("renders sticky first header cell", () => {
    const annotations = [createAnnotation("1")];

    const { container } = renderWithQueryClient(
      <LabelingSummary annotations={annotations} controls={MANY_CONTROL_TAGS} onSelect={() => {}} hideInfo={false} />,
    );

    const thead = container.querySelector("thead")!;
    const firstHeader = thead.querySelector("th") as HTMLElement;

    expect(firstHeader).toBeTruthy();
    expect(firstHeader.style.position).toBe("sticky");
    expect(firstHeader.style.left).toBe("0px");
  });

  it("renders all control columns as header cells", () => {
    const annotations = [createAnnotation("1")];

    renderWithQueryClient(
      <LabelingSummary annotations={annotations} controls={MANY_CONTROL_TAGS} onSelect={() => {}} hideInfo={false} />,
    );

    expect(screen.getByText("Annotator")).toBeInTheDocument();

    for (const control of MANY_CONTROL_TAGS) {
      expect(screen.getByText(control.name)).toBeInTheDocument();
    }
  });

  it("sets table width to getTotalSize when columns are measured", async () => {
    const annotations = [createAnnotation("1")];

    const { container } = renderWithQueryClient(
      <LabelingSummary annotations={annotations} controls={MANY_CONTROL_TAGS} onSelect={() => {}} hideInfo={false} />,
    );

    const table = container.querySelector("table") as HTMLElement;

    expect(table).toBeTruthy();
    expect(table.style.minWidth).toBe("100%");
  });
});
