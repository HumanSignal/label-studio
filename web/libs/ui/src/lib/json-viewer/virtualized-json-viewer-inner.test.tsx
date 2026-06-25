import { act, render } from "@testing-library/react";
import * as reactJsonVirtualization from "react-json-virtualization";
import { VirtualizedJsonViewerInner } from "./virtualized-json-viewer-inner";
import { VIRTUALIZED_SEARCH_DEBOUNCE_MS } from "./virtualized-search-filter";

type CapturedViewerProps = reactJsonVirtualization.VirtualizeJSONCollapsableProps;

describe("VirtualizedJsonViewerInner search filter", () => {
  let capturedProps: CapturedViewerProps | undefined;

  beforeEach(() => {
    capturedProps = undefined;

    spyOn(reactJsonVirtualization.VirtualizeJSON, "Collapsable").mockImplementation((props) => {
      capturedProps = props;
      return <div data-testid="virtualized-json-viewer-inner" />;
    });
  });

  it("debounces searchQuery passed to the library", () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <VirtualizedJsonViewerInner
        data={{ text: "hello" }}
        searchText=""
        activeFilterId={null}
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    expect(capturedProps?.searchQuery).toBeUndefined();

    rerender(
      <VirtualizedJsonViewerInner
        data={{ text: "hello" }}
        searchText="hel"
        activeFilterId={null}
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    expect(capturedProps?.searchQuery).toBeUndefined();

    act(() => {
      jest.advanceTimersByTime(VIRTUALIZED_SEARCH_DEBOUNCE_MS);
    });

    expect(capturedProps?.searchQuery).toBe("hel");

    jest.useRealTimers();
  });

  it("filters rows to matched paths and ancestors after search metadata arrives", () => {
    render(
      <VirtualizedJsonViewerInner
        data={{ text: "hello", meta: { source: "import" } }}
        searchText="hello"
        activeFilterId={null}
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    act(() => {
      capturedProps?.onSearchMetadata?.({
        mode: "tree",
        query: "hello",
        pathFilterQuery: "",
        searchQuery: "hello",
        matchCount: 1,
        visibleCount: 3,
        matchedPaths: ["$.text"],
        matchedRowIds: ["row-1"],
        matchedLineNumbers: [],
        hasMore: false,
      });
    });

    const rowFilter = capturedProps?.rowFilter;
    expect(rowFilter).toBeDefined();

    const visibleText = rowFilter?.({
      mode: "tree",
      id: "row-1",
      path: "$.text",
      text: "hello",
      row: {
        id: "row-1",
        path: "$.text",
        depth: 1,
        key: "text",
        valueType: "string",
        rawValue: "hello",
        preview: '"hello"',
        isExpandable: false,
        isExpanded: false,
      },
      sourceFormat: "json",
    });
    const hiddenMeta = rowFilter?.({
      mode: "tree",
      id: "row-2",
      path: "$.meta",
      text: "meta",
      row: {
        id: "row-2",
        path: "$.meta",
        depth: 1,
        key: "meta",
        valueType: "object",
        rawValue: { source: "import" },
        preview: "Object(1)",
        isExpandable: true,
        isExpanded: true,
      },
      sourceFormat: "json",
    });

    expect(visibleText).toBe(true);
    expect(hiddenMeta).toBe(false);
  });

  it("clears search filter immediately when search text is cleared", () => {
    render(
      <VirtualizedJsonViewerInner
        data={{ text: "hello" }}
        searchText=""
        activeFilterId={null}
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    const rowFilter = capturedProps?.rowFilter;
    expect(
      rowFilter?.({
        mode: "tree",
        id: "row-1",
        path: "$.missing",
        text: "missing",
        row: {
          id: "row-1",
          path: "$.missing",
          depth: 1,
          key: "missing",
          valueType: "string",
          rawValue: "missing",
          preview: '"missing"',
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(true);
  });

  it("uses includes search mode so chip filters do not force prefix search", () => {
    render(
      <VirtualizedJsonViewerInner
        data={{ annotations: [{ created_at: "2024-01-01" }] }}
        searchText="created"
        activeFilterId="annotations"
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    expect(capturedProps?.pathFilterMode).toBe("prefix");
    expect(capturedProps?.searchMode).toBe("includes");
  });

  it("shows annotation search matches when metadata arrives for scoped path filter", () => {
    render(
      <VirtualizedJsonViewerInner
        data={{ annotations: [{ created_at: "2024-01-01" }], meta: { created: true } }}
        searchText="created"
        activeFilterId="annotations"
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    act(() => {
      capturedProps?.onSearchMetadata?.({
        mode: "tree",
        query: "created",
        pathFilterQuery: "$.annotations",
        searchQuery: "created",
        matchCount: 1,
        visibleCount: 3,
        matchedPaths: ["$.annotations[0].created_at"],
        matchedRowIds: ["row-1"],
        matchedLineNumbers: [],
        hasMore: false,
      });
    });

    const rowFilter = capturedProps?.rowFilter;
    expect(
      rowFilter?.({
        mode: "tree",
        id: "row-1",
        path: "$.annotations[0].created_at",
        text: "created_at",
        row: {
          id: "row-1",
          path: "$.annotations[0].created_at",
          depth: 2,
          key: "created_at",
          valueType: "string",
          rawValue: "2024-01-01",
          preview: '"2024-01-01"',
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(true);
    expect(
      rowFilter?.({
        mode: "tree",
        id: "row-2",
        path: "$.meta",
        text: "meta",
        row: {
          id: "row-2",
          path: "$.meta",
          depth: 1,
          key: "meta",
          valueType: "object",
          rawValue: { created: true },
          preview: "Object(1)",
          isExpandable: true,
          isExpanded: true,
        },
        sourceFormat: "json",
      }),
    ).toBe(false);
  });

  it("does not apply stale search paths while the debounced query is catching up", () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <VirtualizedJsonViewerInner
        data={{ id: 1, data: { text: "hello" } }}
        searchText="text"
        activeFilterId={null}
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    act(() => {
      capturedProps?.onSearchMetadata?.({
        mode: "tree",
        query: "text",
        pathFilterQuery: "",
        searchQuery: "text",
        matchCount: 1,
        visibleCount: 3,
        matchedPaths: ["$.data.text"],
        matchedRowIds: ["row-1"],
        matchedLineNumbers: [],
        hasMore: false,
      });
    });

    const rowFilterForText = capturedProps?.rowFilter;
    expect(
      rowFilterForText?.({
        mode: "tree",
        id: "row-id",
        path: "$.id",
        text: "id",
        row: {
          id: "row-id",
          path: "$.id",
          depth: 1,
          key: "id",
          valueType: "number",
          rawValue: 1,
          preview: "1",
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(false);

    rerender(
      <VirtualizedJsonViewerInner
        data={{ id: 1, data: { text: "hello" } }}
        searchText="id"
        activeFilterId={null}
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    const rowFilterWhilePending = capturedProps?.rowFilter;
    expect(
      rowFilterWhilePending?.({
        mode: "tree",
        id: "row-id",
        path: "$.id",
        text: "id",
        row: {
          id: "row-id",
          path: "$.id",
          depth: 1,
          key: "id",
          valueType: "number",
          rawValue: 1,
          preview: "1",
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(true);

    act(() => {
      capturedProps?.onSearchMetadata?.({
        mode: "tree",
        query: "text",
        pathFilterQuery: "",
        searchQuery: "text",
        matchCount: 1,
        visibleCount: 3,
        matchedPaths: ["$.data.text"],
        matchedRowIds: ["row-1"],
        matchedLineNumbers: [],
        hasMore: false,
      });
    });

    expect(
      rowFilterWhilePending?.({
        mode: "tree",
        id: "row-id",
        path: "$.id",
        text: "id",
        row: {
          id: "row-id",
          path: "$.id",
          depth: 1,
          key: "id",
          valueType: "number",
          rawValue: 1,
          preview: "1",
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(true);

    jest.useRealTimers();
  });

  it("resets search row filter when switching path filters after zero matches", () => {
    const { rerender } = render(
      <VirtualizedJsonViewerInner
        data={{ annotations: [{ created_at: "2024-01-01" }], meta: { created: true } }}
        searchText="created"
        activeFilterId="annotations"
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    act(() => {
      capturedProps?.onSearchMetadata?.({
        mode: "tree",
        query: "created",
        pathFilterQuery: "$.annotations",
        searchQuery: "created",
        matchCount: 0,
        visibleCount: 0,
        matchedPaths: [],
        matchedRowIds: [],
        matchedLineNumbers: [],
        hasMore: false,
      });
    });

    const rowFilterWithEmptyMatches = capturedProps?.rowFilter;
    expect(
      rowFilterWithEmptyMatches?.({
        mode: "tree",
        id: "root",
        path: "$",
        text: "root",
        row: {
          id: "root",
          path: "$",
          depth: 0,
          valueType: "object",
          rawValue: {},
          preview: "Object(2)",
          isExpandable: true,
          isExpanded: true,
        },
        sourceFormat: "json",
      }),
    ).toBe(false);

    rerender(
      <VirtualizedJsonViewerInner
        data={{ annotations: [{ created_at: "2024-01-01" }], meta: { created: true } }}
        searchText="created"
        activeFilterId="all"
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    const rowFilterAfterAll = capturedProps?.rowFilter;
    expect(
      rowFilterAfterAll?.({
        mode: "tree",
        id: "root",
        path: "$",
        text: "root",
        row: {
          id: "root",
          path: "$",
          depth: 0,
          valueType: "object",
          rawValue: {},
          preview: "Object(2)",
          isExpandable: true,
          isExpanded: true,
        },
        sourceFormat: "json",
      }),
    ).toBe(true);
  });
});
