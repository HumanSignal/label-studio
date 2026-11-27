import { act, render } from "@testing-library/react";
import * as reactJsonVirtualization from "react-json-virtualization";
import { VirtualizedJsonViewerInner } from "./virtualized-json-viewer-inner";
import { VIRTUALIZED_SEARCH_DEBOUNCE_MS } from "./virtualized-search-filter";

type CapturedViewerProps = reactJsonVirtualization.VirtualizeJSONCollapsableProps;

/** Minimal reproducer from FIT-2107 — nested match starts below default expand depth. */
const FIT_2107_TASK_SOURCE = {
  id: 271216056,
  data: { text: "sample" },
  annotations: [
    {
      result: [
        {
          value: {
            reactcode: {
              fields: {
                review_dimensions: "moderate",
                review_comments: "Nested field should remain searchable",
              },
            },
          },
        },
      ],
    },
  ],
} as const;

const FIT_2107_REVIEW_DIMENSIONS_PATH = "$.annotations[0].result[0].value.reactcode.fields.review_dimensions";

async function flushDeepSearchSchedule() {
  await act(async () => {
    await Promise.resolve();
  });
}

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

  it("filters rows to matched paths and ancestors from deep search", async () => {
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

    await flushDeepSearchSchedule();

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

  it("shows annotation search matches for scoped path filter", async () => {
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

    await flushDeepSearchSchedule();

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

  it("does not apply stale search paths while the debounced query is catching up", async () => {
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
      jest.advanceTimersByTime(VIRTUALIZED_SEARCH_DEBOUNCE_MS);
    });
    await flushDeepSearchSchedule();

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
      jest.advanceTimersByTime(VIRTUALIZED_SEARCH_DEBOUNCE_MS);
    });
    await flushDeepSearchSchedule();

    const rowFilterForId = capturedProps?.rowFilter;
    expect(
      rowFilterForId?.({
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
    expect(
      rowFilterForId?.({
        mode: "tree",
        id: "row-text",
        path: "$.data.text",
        text: "text",
        row: {
          id: "row-text",
          path: "$.data.text",
          depth: 2,
          key: "text",
          valueType: "string",
          rawValue: "hello",
          preview: '"hello"',
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(false);

    jest.useRealTimers();
  });

  it("shows deeply nested review_ matches and ancestor chain for FIT-2107 payload", async () => {
    jest.useFakeTimers();

    render(
      <VirtualizedJsonViewerInner
        data={FIT_2107_TASK_SOURCE}
        searchText="review_"
        activeFilterId={null}
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(VIRTUALIZED_SEARCH_DEBOUNCE_MS);
    });
    await flushDeepSearchSchedule();

    expect(capturedProps?.expandedPaths?.has(FIT_2107_REVIEW_DIMENSIONS_PATH)).toBe(true);

    const rowFilter = capturedProps?.rowFilter;
    expect(rowFilter).toBeDefined();

    const ancestorPaths = [
      "$",
      "$.annotations",
      "$.annotations[0]",
      "$.annotations[0].result",
      "$.annotations[0].result[0]",
      "$.annotations[0].result[0].value",
      "$.annotations[0].result[0].value.reactcode",
      "$.annotations[0].result[0].value.reactcode.fields",
      FIT_2107_REVIEW_DIMENSIONS_PATH,
    ];

    for (const path of ancestorPaths) {
      expect(
        rowFilter?.({
          mode: "tree",
          id: `row-${path}`,
          path,
          text: path,
          row: {
            id: `row-${path}`,
            path,
            depth: path.split(".").length,
            key: path.split(".").pop(),
            valueType: "object",
            rawValue: {},
            preview: "Object(1)",
            isExpandable: true,
            isExpanded: false,
          },
          sourceFormat: "json",
        }),
      ).toBe(true);
    }

    expect(
      rowFilter?.({
        mode: "tree",
        id: "row-data",
        path: "$.data",
        text: "data",
        row: {
          id: "row-data",
          path: "$.data",
          depth: 1,
          key: "data",
          valueType: "object",
          rawValue: { text: "sample" },
          preview: "Object(1)",
          isExpandable: true,
          isExpanded: true,
        },
        sourceFormat: "json",
      }),
    ).toBe(false);

    jest.useRealTimers();
  });

  it("shows scoped annotation filter matches for deeply nested FIT-2107 paths", async () => {
    jest.useFakeTimers();

    render(
      <VirtualizedJsonViewerInner
        data={FIT_2107_TASK_SOURCE}
        searchText="review_"
        activeFilterId="annotations"
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(VIRTUALIZED_SEARCH_DEBOUNCE_MS);
    });
    await flushDeepSearchSchedule();

    const rowFilter = capturedProps?.rowFilter;
    expect(
      rowFilter?.({
        mode: "tree",
        id: "row-review-dimensions",
        path: FIT_2107_REVIEW_DIMENSIONS_PATH,
        text: "review_dimensions",
        row: {
          id: "row-review-dimensions",
          path: FIT_2107_REVIEW_DIMENSIONS_PATH,
          depth: 8,
          key: "review_dimensions",
          valueType: "string",
          rawValue: "moderate",
          preview: '"moderate"',
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(true);
    expect(
      rowFilter?.({
        mode: "tree",
        id: "row-data",
        path: "$.data",
        text: "data",
        row: {
          id: "row-data",
          path: "$.data",
          depth: 1,
          key: "data",
          valueType: "object",
          rawValue: { text: "sample" },
          preview: "Object(1)",
          isExpandable: true,
          isExpanded: true,
        },
        sourceFormat: "json",
      }),
    ).toBe(false);

    jest.useRealTimers();
  });

  it("resets search row filter when switching path filters after zero matches", async () => {
    const { rerender } = render(
      <VirtualizedJsonViewerInner
        data={{ annotations: [{ foo: "bar" }], meta: { note: "needle" } }}
        searchText="needle"
        activeFilterId="annotations"
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    await flushDeepSearchSchedule();

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
        data={{ annotations: [{ foo: "bar" }], meta: { note: "needle" } }}
        searchText="needle"
        activeFilterId="all"
        collapseDepth={false}
        resetKey={0}
        fontSize="inherit"
        readerViewThreshold={0}
      />,
    );

    await flushDeepSearchSchedule();

    const rowFilterAfterAll = capturedProps?.rowFilter;
    expect(
      rowFilterAfterAll?.({
        mode: "tree",
        id: "row-meta-note",
        path: "$.meta.note",
        text: "note",
        row: {
          id: "row-meta-note",
          path: "$.meta.note",
          depth: 2,
          key: "note",
          valueType: "string",
          rawValue: "needle",
          preview: '"needle"',
          isExpandable: false,
          isExpanded: false,
        },
        sourceFormat: "json",
      }),
    ).toBe(true);
  });
});
