import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Select } from "./select";

// Mock ResizeObserver which is used by cmdk
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock the styles
jest.mock("./select.module.scss", () => ({
  selectTrigger: "selectTrigger",
  isInline: "isInline",
  isOpen: "isOpen",
  isDisabled: "isDisabled",
  sizeSmall: "sizeSmall",
  sizeMedium: "sizeMedium",
  sizeLarge: "sizeLarge",
  selectLoading: "selectLoading",
  valueInput: "valueInput",
}));

// Mock react-window and react-window-infinite-loader to capture props
const mockVariableSizeList = jest.fn();
jest.mock("react-window", () => ({
  VariableSizeList: (props: any) => {
    mockVariableSizeList(props);
    // Render the items directly for testing
    const items = [];
    for (let i = 0; i < Math.min(props.itemCount, 5); i++) {
      items.push(
        <div key={i} data-testid={`virtual-item-${i}`}>
          {props.children({ index: i, style: {} })}
        </div>,
      );
    }
    return (
      <div data-testid="virtual-list" data-height={props.height}>
        {items}
      </div>
    );
  },
}));

jest.mock("react-window-infinite-loader", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    return children({
      onItemsRendered: jest.fn(),
      ref: { current: null },
    });
  },
}));

describe("Select Component", () => {
  beforeEach(() => {
    mockVariableSizeList.mockClear();
  });

  describe("Basic Rendering", () => {
    it("renders with placeholder", () => {
      render(<Select options={["Apple", "Banana"]} placeholder="Select a fruit" />);
      expect(screen.getByText("Select a fruit")).toBeInTheDocument();
    });

    it("renders with flat options", async () => {
      render(<Select options={["Apple", "Banana", "Cherry"]} placeholder="Select" />);

      // Open the dropdown
      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Banana")).toBeInTheDocument();
        expect(screen.getByText("Cherry")).toBeInTheDocument();
      });
    });

    it("renders with grouped options", async () => {
      const groupedOptions = [
        { label: "Fruits", children: ["Apple", "Banana"] },
        { label: "Vegetables", children: ["Carrot", "Broccoli"] },
      ];

      render(<Select options={groupedOptions as any} placeholder="Select" />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("Fruits")).toBeInTheDocument();
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Vegetables")).toBeInTheDocument();
        expect(screen.getByText("Carrot")).toBeInTheDocument();
      });
    });
  });

  describe("Virtual List Height Calculation", () => {
    const ITEM_HEIGHT = 40;
    const MAX_VISIBLE_ITEMS = 5;

    it("calculates correct height for flat options with virtual list", async () => {
      const flatOptions = ["Option 1", "Option 2", "Option 3"];

      render(<Select options={flatOptions as any} isVirtualList={true} searchable={true} placeholder="Select" />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        const virtualList = screen.getByTestId("virtual-list");
        expect(virtualList).toBeInTheDocument();
        // With 3 flat options, height should be 3 * 40 = 120
        expect(virtualList).toHaveAttribute("data-height", String(3 * ITEM_HEIGHT));
      });
    });

    it("calculates correct height for many flat options (capped at max visible)", async () => {
      const manyOptions = Array.from({ length: 20 }, (_, i) => `Option ${i + 1}`);

      render(<Select options={manyOptions as any} isVirtualList={true} searchable={true} placeholder="Select" />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockVariableSizeList).toHaveBeenCalled();
      });

      // With 20 options, height should be capped at 5 * 40 = 200
      const lastCall = mockVariableSizeList.mock.calls[mockVariableSizeList.mock.calls.length - 1][0];
      expect(lastCall.height).toBe(MAX_VISIBLE_ITEMS * ITEM_HEIGHT);
    });

    it("calculates correct height for grouped options using flatOptions count", async () => {
      // This is the key test for the filter dropdown bug fix
      // 2 groups with 3 children each = 6 total items
      const groupedOptions = [
        { label: "Tasks", children: ["Task 1", "Task 2", "Task 3"] },
        { label: "Annotations", children: ["Anno 1", "Anno 2", "Anno 3"] },
      ];

      render(<Select options={groupedOptions as any} isVirtualList={true} searchable={true} placeholder="Select" />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockVariableSizeList).toHaveBeenCalled();
      });

      // With 6 flattened items (3 + 3), height should be capped at 5 * 40 = 200
      // NOT 2 * 40 = 80 (which would be wrong if using renderedOptions.length)
      const lastCall = mockVariableSizeList.mock.calls[mockVariableSizeList.mock.calls.length - 1][0];
      expect(lastCall.height).toBe(MAX_VISIBLE_ITEMS * ITEM_HEIGHT);
    });

    it("calculates correct height for single group with few children", async () => {
      // This reproduces the exact bug from the screenshot
      // 1 group with 2 children = 2 total items
      const groupedOptions = [{ label: "Tasks", children: ["Task 1", "Task 2"] }];

      render(<Select options={groupedOptions as any} isVirtualList={true} searchable={true} placeholder="Select" />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockVariableSizeList).toHaveBeenCalled();
      });

      // With 2 flattened items, height should be 2 * 40 = 80
      // NOT 1 * 40 = 40 (which was the bug - only counting the group element)
      const lastCall = mockVariableSizeList.mock.calls[mockVariableSizeList.mock.calls.length - 1][0];
      expect(lastCall.height).toBe(2 * ITEM_HEIGHT);
    });

    it("calculates correct height when searching flat options", async () => {
      const options = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry"];

      render(<Select options={options as any} isVirtualList={true} searchable={true} placeholder="Select" />);

      fireEvent.click(screen.getByRole("button"));

      // Type in search to filter
      const searchInput = screen.getByTestId("select-search-field");
      fireEvent.change(searchInput, { target: { value: "Ap" } });

      await waitFor(() => {
        // Should filter to Apple and Apricot (2 items)
        const lastCall = mockVariableSizeList.mock.calls[mockVariableSizeList.mock.calls.length - 1][0];
        expect(lastCall.height).toBe(2 * ITEM_HEIGHT);
      });
    });

    it("calculates correct height when searching grouped options", async () => {
      const groupedOptions = [
        { label: "Fruits", children: ["Apple", "Apricot", "Banana"] },
        { label: "Vegetables", children: ["Asparagus", "Artichoke", "Broccoli"] },
      ];

      render(<Select options={groupedOptions as any} isVirtualList={true} searchable={true} placeholder="Select" />);

      fireEvent.click(screen.getByRole("button"));

      // Type in search to filter - "Ap" should match Apple and Apricot only
      const searchInput = screen.getByTestId("select-search-field");
      fireEvent.change(searchInput, { target: { value: "Ap" } });

      await waitFor(() => {
        // When searching, options are flattened and filtered
        // "Ap" matches: Apple, Apricot = 2 items
        const lastCall = mockVariableSizeList.mock.calls[mockVariableSizeList.mock.calls.length - 1][0];
        expect(lastCall.height).toBe(2 * ITEM_HEIGHT);
      });
    });
  });

  describe("Infinite Loading Support", () => {
    it("supports loadMore callback for infinite scroll", async () => {
      const loadMore = jest.fn();
      const options = Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`);

      render(
        <Select
          options={options as any}
          isVirtualList={true}
          searchable={true}
          loadMore={loadMore}
          itemCount={100}
          placeholder="Select"
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
      });

      // The InfiniteLoader should be set up for infinite scroll
      expect(mockVariableSizeList).toHaveBeenCalled();
    });

    it("maintains correct height calculation with paginated flat options", async () => {
      const loadMore = jest.fn();
      // Simulate first page of 10 items loaded
      const options = Array.from({ length: 10 }, (_, i) => `User ${i + 1}`);

      render(
        <Select
          options={options as any}
          isVirtualList={true}
          searchable={true}
          loadMore={loadMore}
          itemCount={100} // Total available
          placeholder="Select a user"
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockVariableSizeList).toHaveBeenCalled();
      });

      // Height should be based on loaded items (10), capped at 5 visible
      const lastCall = mockVariableSizeList.mock.calls[mockVariableSizeList.mock.calls.length - 1][0];
      expect(lastCall.height).toBe(5 * 40); // 5 * ITEM_HEIGHT
    });
  });

  describe("Footer Support", () => {
    it("renders footer content when provided", async () => {
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          footer={<div data-testid="custom-footer">Custom Footer</div>}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
        expect(screen.getByText("Custom Footer")).toBeInTheDocument();
      });
    });
  });

  describe("Selection Behavior", () => {
    it("selects an option when clicked", async () => {
      const onChange = jest.fn();

      render(
        <Select options={["Apple", "Banana", "Cherry"] as any} placeholder="Select a fruit" onChange={onChange} />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("Banana")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Banana"));

      expect(onChange).toHaveBeenCalledWith("Banana");
    });

    it("handles multiple selection", async () => {
      const onChange = jest.fn();

      render(
        <Select
          options={["Apple", "Banana", "Cherry"] as any}
          placeholder="Select fruits"
          onChange={onChange}
          multiple={true}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Apple"));
      fireEvent.click(screen.getByText("Cherry"));

      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty options", async () => {
      render(<Select options={[] as any} placeholder="No options" searchable={true} />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("No results found.")).toBeInTheDocument();
      });
    });

    it("handles disabled state", () => {
      render(<Select options={["Apple", "Banana"] as any} placeholder="Select" disabled={true} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toBeDisabled();
    });
  });
});
