import { fireEvent, render, screen } from "@testing-library/react";
import { AnnotationsListFilter } from "../AnnotationsListFilter";
import { DEFAULT_ANNOTATIONS_LIST_FILTER } from "../annotations-list-filter";
import type { AnnotationCapabilities, AnnotationsListSortState } from "../types";

const baseCapabilities: AnnotationCapabilities = {
  groundTruthEnabled: true,
  enableCreateAnnotation: true,
  enableAnnotationDelete: true,
  enableAnnotations: true,
  enablePredictions: true,
  enableCopyLink: false,
  showUserInfo: true,
};

const defaultSort: AnnotationsListSortState = { field: "createdAt", direction: "asc" };

function renderFilter(capabilities: AnnotationCapabilities) {
  const onChange = mock();
  const onSortChange = mock();

  render(
    <AnnotationsListFilter
      filter={DEFAULT_ANNOTATIONS_LIST_FILTER}
      onChange={onChange}
      capabilities={capabilities}
      filteredMatchCount={2}
      totalCount={5}
      sort={defaultSort}
      onSortChange={onSortChange}
    />,
  );

  fireEvent.click(screen.getByTestId("annotations-list-filter-toggle"));

  return { onChange, onSortChange };
}

describe("AnnotationsListFilter review status gating", () => {
  it("hides Accepted, Rejected, and Fix + Accepted rows when enableReviewStatusFilters is false", () => {
    renderFilter({ ...baseCapabilities, enableReviewStatusFilters: false });

    expect(screen.queryByTestId("annotations-list-filter-status-accepted-any")).not.toBeInTheDocument();
    expect(screen.queryByTestId("annotations-list-filter-status-rejected-any")).not.toBeInTheDocument();
    expect(screen.queryByTestId("annotations-list-filter-status-fixedAndAccepted-any")).not.toBeInTheDocument();
    expect(screen.getByTestId("annotations-list-filter-status-draft-any")).toBeInTheDocument();
  });

  it("shows Accepted, Rejected, and Fix + Accepted rows when enableReviewStatusFilters is true", () => {
    renderFilter({ ...baseCapabilities, enableReviewStatusFilters: true });

    expect(screen.getByTestId("annotations-list-filter-status-accepted-any")).toBeInTheDocument();
    expect(screen.getByTestId("annotations-list-filter-status-rejected-any")).toBeInTheDocument();
    expect(screen.getByTestId("annotations-list-filter-status-fixedAndAccepted-any")).toBeInTheDocument();
  });

  it("does not count review status filters in the badge when review filters are disabled", () => {
    render(
      <AnnotationsListFilter
        filter={{
          ...DEFAULT_ANNOTATIONS_LIST_FILTER,
          statuses: {
            ...DEFAULT_ANNOTATIONS_LIST_FILTER.statuses,
            accepted: true,
            draft: true,
          },
        }}
        onChange={mock()}
        capabilities={{ ...baseCapabilities, enableReviewStatusFilters: false }}
        filteredMatchCount={1}
        totalCount={5}
        sort={defaultSort}
        onSortChange={mock()}
      />,
    );

    expect(screen.getByLabelText("1 active filter")).toBeInTheDocument();
  });
});
