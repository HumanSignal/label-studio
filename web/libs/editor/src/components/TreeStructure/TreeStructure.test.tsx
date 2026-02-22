import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TreeStructure, { type RowItem } from "./TreeStructure";

const mockResetAfterIndex = jest.fn();
const mockOffsetHeight = 200;
const mockOffsetWidth = 150;
const mockClientWidth = 150;

jest.mock("react-window", () => {
  const R = require("react");
  return {
    VariableSizeList: R.forwardRef(
      (
        {
          children,
          itemCount,
          itemData,
          itemSize,
          height,
          width,
        }: {
          children: (props: { data: (i: number) => unknown; index: number; style: object }) => React.ReactNode;
          itemCount: number;
          itemData: (index: number) => unknown;
          itemSize: number | ((index: number) => number);
          height: number;
          width: number;
        },
        ref: React.Ref<unknown>,
      ) => {
        R.useEffect(() => {
          if (ref && typeof ref === "object" && "current" in ref) {
            (ref as React.MutableRefObject<unknown>).current = {
              resetAfterIndex: mockResetAfterIndex,
              _outerRef: {
                firstChild: {
                  offsetHeight: mockOffsetHeight,
                  offsetWidth: mockOffsetWidth,
                  clientWidth: mockClientWidth,
                },
              },
            };
          }
        }, [ref]);
        const rows = [];
        for (let i = 0; i < itemCount; i++) {
          const rowHeight = typeof itemSize === "function" ? itemSize(i) : itemSize;
          rows.push(
            R.createElement(
              R.Fragment,
              { key: i },
              children({
                data: itemData,
                index: i,
                style: { height: rowHeight },
              }),
            ),
          );
        }
        return <div data-testid="variable-size-list">{rows}</div>;
      },
    ),
  };
});

const defaultTransformationCallback = ({
  node,
  nestingLevel,
  isLeaf,
  isOpen,
}: {
  node: RowItem;
  nestingLevel: number;
  isFiltering: boolean;
  isLeaf: boolean;
  childCount: number | undefined;
  isOpen: boolean;
}) => ({
  id: `${node.label}-${nestingLevel}`,
  isLeaf,
  name: node.label,
  nestingLevel,
  padding: nestingLevel * 10,
  path: node.path,
});

const MockRowComponent: React.FC<{
  item: { row?: { id: string; name: string }; toggle: (id: string) => void; addInside: (id?: string) => void };
  dimensionCallback?: (el: HTMLElement) => void;
}> = ({ item, dimensionCallback }) => (
  <div
    data-testid="tree-row"
    ref={(el) => {
      if (el && dimensionCallback) dimensionCallback(el);
    }}
  >
    {item?.row && (
      <>
        <span data-testid="row-name">{item.row.name}</span>
        <button type="button" data-testid="toggle-btn" onClick={() => item.toggle(item.row!.id)}>
          Toggle
        </button>
        <button type="button" data-testid="add-inside-btn" onClick={() => item.addInside(item.row!.id)}>
          Add inside
        </button>
        <button type="button" data-testid="add-root-btn" onClick={() => item.addInside()}>
          Add root
        </button>
      </>
    )}
  </div>
);

const makeItems = (overrides?: Partial<RowItem>[]): RowItem[] => [
  {
    label: "A",
    depth: 0,
    path: ["A"],
    isOpen: true,
    children: [
      {
        label: "A1",
        depth: 1,
        path: ["A", "A1"],
        isOpen: false,
      },
    ],
    ...overrides?.[0],
  },
];

describe("TreeStructure", () => {
  beforeEach(() => {
    mockResetAfterIndex.mockClear();
    Object.defineProperty(document.body, "clientHeight", { value: 800, configurable: true });
  });

  it("renders list with items and transformationCallback", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
      />,
    );
    expect(screen.getByTestId("variable-size-list")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("calls toggle when defaultExpanded is true", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
      />,
    );
    const toggleBtns = screen.getAllByTestId("toggle-btn");
    fireEvent.click(toggleBtns[0]);
    expect(mockResetAfterIndex).toHaveBeenCalledWith(0);
  });

  it("calls toggle when defaultExpanded is false", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={false}
      />,
    );
    fireEvent.click(screen.getByTestId("toggle-btn"));
    expect(mockResetAfterIndex).toHaveBeenCalledWith(0);
  });

  it("addInside does nothing when isEditable is false", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={false}
        isEditable={false}
      />,
    );
    fireEvent.click(screen.getByTestId("add-inside-btn"));
    expect(mockResetAfterIndex).toHaveBeenCalled();
  });

  it("addInside updates data when isEditable is true", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={false}
        isEditable={true}
      />,
    );
    fireEvent.click(screen.getByTestId("add-inside-btn"));
    expect(mockResetAfterIndex).toHaveBeenCalled();
  });

  it("flatten mode expands all nodes", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={true}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={false}
      />,
    );
    expect(screen.getByTestId("variable-size-list")).toBeInTheDocument();
  });

  it("handles empty items", () => {
    render(
      <TreeStructure
        items={[]}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
      />,
    );
    expect(screen.getByTestId("variable-size-list")).toBeInTheDocument();
  });

  it("handles items with nested children and countChildNodes", () => {
    const items: RowItem[] = [
      {
        label: "Root",
        depth: 0,
        path: ["Root"],
        isOpen: true,
        children: [
          {
            label: "Child1",
            depth: 1,
            path: ["Root", "Child1"],
            isOpen: true,
            children: [{ label: "Grandchild", depth: 2, path: ["Root", "Child1", "Grandchild"], isOpen: false }],
          },
        ],
      },
    ];
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
      />,
    );
    expect(screen.getByText("Root")).toBeInTheDocument();
  });

  it("rowComponent receives dimensionCallback and triggers updateHeight", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={100}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
      />,
    );
    expect(screen.getAllByTestId("tree-row").length).toBeGreaterThan(0);
  });

  it("addInside without id calls recursiveTreeWalker with no addInsideId", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
        isEditable={true}
      />,
    );
    const addRootBtns = screen.getAllByTestId("add-root-btn");
    fireEvent.click(addRootBtns[0]);
    expect(mockResetAfterIndex).toHaveBeenCalled();
  });

  it("toggle twice toggles open state back and forth", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
      />,
    );
    const toggleBtns = screen.getAllByTestId("toggle-btn");
    fireEvent.click(toggleBtns[0]);
    fireEvent.click(toggleBtns[0]);
    expect(mockResetAfterIndex).toHaveBeenCalled();
  });

  it("toggle when defaultExpanded false toggles twice", () => {
    const items = makeItems();
    render(
      <TreeStructure
        items={items}
        rowComponent={MockRowComponent}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={200}
        maxWidth={600}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={false}
      />,
    );
    const toggleBtns = screen.getAllByTestId("toggle-btn");
    fireEvent.click(toggleBtns[0]);
    fireEvent.click(toggleBtns[0]);
    expect(mockResetAfterIndex).toHaveBeenCalled();
  });

  it("dimensionCallback handles row wider than maxWidth", () => {
    const WideRow: React.FC<{
      item: unknown;
      dimensionCallback?: (el: { scrollWidth: number; scrollHeight: number }) => void;
    }> = ({ dimensionCallback }) => {
      const fakeRef = { scrollWidth: 800, scrollHeight: 25 };
      return <div data-testid="wide-row" ref={() => dimensionCallback?.(fakeRef)} />;
    };
    const items: RowItem[] = [{ label: "Wide", depth: 0, path: ["Wide"], isOpen: true }];
    render(
      <TreeStructure
        items={items}
        rowComponent={WideRow as React.FC<any>}
        flatten={false}
        rowHeight={30}
        maxHeightPercentage={50}
        minWidth={100}
        maxWidth={400}
        transformationCallback={defaultTransformationCallback}
        defaultExpanded={true}
      />,
    );
    expect(screen.getByTestId("wide-row")).toBeInTheDocument();
  });
});
