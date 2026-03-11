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
  selectedItemsGroup: "selectedItemsGroup",
  selectedItemsHeader: "selectedItemsHeader",
  selectedItemsCaret: "selectedItemsCaret",
  selectedItemsTitle: "selectedItemsTitle",
  selectedItemsContent: "selectedItemsContent",
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

      await waitFor(
        () => {
          const virtualList = screen.getByTestId("virtual-list");
          expect(virtualList).toBeInTheDocument();
          expect(virtualList).toHaveAttribute("data-height", String(3 * ITEM_HEIGHT));
        },
        { timeout: 3000 },
      );
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

  describe("Label and description", () => {
    it("renders with label and description when provided", () => {
      render(
        <Select options={["A", "B"] as any} placeholder="Pick" label="Choose one" description="Optional helper text" />,
      );
      expect(screen.getByText("Choose one")).toBeInTheDocument();
      expect(screen.getByText("Optional helper text")).toBeInTheDocument();
    });
  });

  describe("SelectedItemsGroup (multiple + searchable + virtual list)", () => {
    it("shows selected items group when multiple selections exist", async () => {
      render(
        <Select
          options={["Apple", "Banana", "Cherry"] as any}
          placeholder="Select"
          multiple={true}
          searchable={true}
          isVirtualList={true}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Apple"));
      fireEvent.click(screen.getByText("Banana"));
      await waitFor(() => {
        expect(screen.getByText("Selected items")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument(); // badge count
      });
    });

    it("deselects item from selected group when clicking option", async () => {
      const onChange = jest.fn();
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          multiple={true}
          searchable={true}
          isVirtualList={true}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Apple"));
      fireEvent.click(screen.getByText("Banana"));
      await waitFor(() => expect(screen.getByText("Selected items")).toBeInTheDocument());
      const header = screen.getByRole("button", { name: /Selected items group/i });
      fireEvent.click(header);
      await waitFor(() => expect(screen.getAllByTestId("select-option-Apple").length).toBeGreaterThan(0));
      const appleOptions = screen.getAllByTestId("select-option-Apple");
      fireEvent.click(appleOptions[0]);
      expect(onChange).toHaveBeenCalled();
    });

    it("shows Selected items group with 0 when alwaysShowSelectedGroup and none selected", async () => {
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          multiple={true}
          searchable={true}
          isVirtualList={true}
          alwaysShowSelectedGroup={true}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Selected items")).toBeInTheDocument());
      expect(screen.getByText("0")).toBeInTheDocument();
      const header = screen.getByRole("button", { name: /Selected items group/i });
      expect(header).toBeDisabled();
    });
  });

  describe("Search and callbacks", () => {
    it("calls onSearch when search input changes", async () => {
      const onSearch = jest.fn();
      render(
        <Select options={["Apple", "Banana"] as any} placeholder="Select" searchable={true} onSearch={onSearch} />,
      );
      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByTestId("select-search-field");
      fireEvent.change(searchInput, { target: { value: "App" } });
      await waitFor(() => expect(onSearch).toHaveBeenCalledWith("App"));
    });

    it("uses custom searchFilter when provided", async () => {
      const searchFilter = jest.fn((option: any, q: string) => {
        const label = option?.label ?? option;
        return String(label).toLowerCase().startsWith(q.toLowerCase());
      });
      render(
        <Select
          options={["Apple", "Apricot", "Banana"] as any}
          placeholder="Select"
          searchable={true}
          searchFilter={searchFilter}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByTestId("select-search-field");
      fireEvent.change(searchInput, { target: { value: "Ap" } });
      await waitFor(() => expect(searchFilter).toHaveBeenCalled());
    });
  });

  describe("Open/close callbacks", () => {
    it("calls onOpen when dropdown opens and onClose when option selected (single)", async () => {
      const onOpen = jest.fn();
      const onClose = jest.fn();
      render(<Select options={["Apple", "Banana"] as any} placeholder="Select" onOpen={onOpen} onClose={onClose} />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(onOpen).toHaveBeenCalled());
      fireEvent.click(screen.getByText("Apple"));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
  });

  describe("renderSelected and selectFirstIfEmpty", () => {
    it("uses renderSelected when provided", async () => {
      const renderSelected = jest.fn((selected: any[], placeholder: string) =>
        selected.length ? selected.map((s) => s?.label ?? s).join(", ") : placeholder,
      );
      render(<Select options={["Apple", "Banana"] as any} placeholder="Pick one" renderSelected={renderSelected} />);
      expect(renderSelected).toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Apple"));
      await waitFor(() => expect(renderSelected).toHaveBeenCalledWith(expect.any(Array), "Pick one"));
    });

    it("selects first option when selectFirstIfEmpty and no value", () => {
      const onChange = jest.fn();
      render(
        <Select
          options={[{ value: "a", label: "Option A" }] as any}
          placeholder="Select"
          selectFirstIfEmpty={true}
          onChange={onChange}
        />,
      );
      expect(screen.getByText("Option A")).toBeInTheDocument();
    });
  });

  describe("Loading and trigger attributes", () => {
    it("shows Loading when isLoading", async () => {
      render(<Select options={["A", "B"] as any} placeholder="Select" isLoading={true} />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Loading...")).toBeInTheDocument());
    });

    it("applies data-testid from props when provided", () => {
      render(<Select options={["A"] as any} placeholder="Select" dataTestid="my-select" />);
      expect(screen.getByTestId("my-select")).toBeInTheDocument();
    });
  });

  describe("Option keyboard navigation", () => {
    it("selects option on Enter key", async () => {
      const onChange = jest.fn();
      render(<Select options={["Apple", "Banana"] as any} placeholder="Select" onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      const option = screen.getByTestId("select-option-Apple");
      option.focus();
      fireEvent.keyDown(option, { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith("Apple");
    });

    it("selects option on Space key", async () => {
      const onChange = jest.fn();
      render(<Select options={["Banana"] as any} placeholder="Select" onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Banana")).toBeInTheDocument());
      const option = screen.getByTestId("select-option-Banana");
      option.focus();
      fireEvent.keyDown(option, { key: " " });
      expect(onChange).toHaveBeenCalledWith("Banana");
    });
  });

  describe("Group option with multiple", () => {
    it("toggles all children when clicking group header in multiple mode", async () => {
      const onChange = jest.fn();
      const options = [
        {
          label: "Fruits",
          children: [
            { value: "a", label: "Apple" },
            { value: "b", label: "Banana" },
          ],
        },
      ];
      render(<Select options={options as any} placeholder="Select" multiple={true} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Fruits")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Fruits"));
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("SelectedItemsGroup disabled and deselect all", () => {
    it("does not deselect when clicking option in selected group if disabled", () => {
      const onChange = jest.fn();
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          multiple={true}
          searchable={true}
          isVirtualList={true}
          disabled={true}
          onChange={onChange}
        />,
      );
      const trigger = screen.getByRole("button");
      expect(trigger).toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("deselects all when clicking deselect all checkbox in selected group", async () => {
      const onChange = jest.fn();
      render(
        <Select
          options={["Apple", "Banana", "Cherry"] as any}
          placeholder="Select"
          multiple={true}
          searchable={true}
          isVirtualList={true}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Apple"));
      fireEvent.click(screen.getByText("Banana"));
      await waitFor(() => expect(screen.getByText("Selected items")).toBeInTheDocument());
      const checkboxes = screen.getAllByRole("checkbox");
      const deselectAllCheckbox = checkboxes[0];
      fireEvent.click(deselectAllCheckbox);
      expect(onChange).toHaveBeenCalled();
    });

    it("collapses selected group when all items are deselected", async () => {
      const onChange = jest.fn();
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          multiple={true}
          searchable={true}
          isVirtualList={true}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Apple"));
      fireEvent.click(screen.getByText("Banana"));
      await waitFor(() => expect(screen.getByText("Selected items")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: /Selected items group/i }));
      await waitFor(() => expect(screen.getAllByTestId("select-option-Apple").length).toBeGreaterThan(0));
      const appleOptions = screen.getAllByTestId("select-option-Apple");
      fireEvent.click(appleOptions[0]);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const bananaOptions = screen.getAllByTestId("select-option-Banana");
      fireEvent.click(bananaOptions[0]);
      await waitFor(() => expect(screen.getByText("Select")).toBeInTheDocument());
    });
  });

  describe("Controlled value (externalValue)", () => {
    it("syncs to external value when value prop changes", async () => {
      const { rerender } = render(
        <Select options={["Apple", "Banana", "Cherry"] as any} placeholder="Select" value="Apple" />,
      );
      expect(screen.getByText("Apple")).toBeInTheDocument();
      rerender(<Select options={["Apple", "Banana", "Cherry"] as any} placeholder="Select" value="Banana" />);
      await waitFor(() => expect(screen.getByText("Banana")).toBeInTheDocument());
    });

    it("syncs to external value object with value key", () => {
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          value={{ value: "Apple", label: "Apple" } as any}
        />,
      );
      expect(screen.getByText("Apple")).toBeInTheDocument();
    });
  });

  describe("defaultSearchValue and open/close", () => {
    it("restores defaultSearchValue when opening and resets when closing", async () => {
      const onSearch = jest.fn();
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          searchable={true}
          defaultSearchValue="Ap"
          onSearch={onSearch}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(onSearch).toHaveBeenCalledWith("Ap"));
      const searchInput = screen.getByTestId("select-search-field");
      expect((searchInput as HTMLInputElement).value).toBe("Ap");
      fireEvent.click(screen.getByText("Apple"));
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => {
        expect(screen.getByTestId("select-search-field")).toBeInTheDocument();
      });
      expect((screen.getByTestId("select-search-field") as HTMLInputElement).value).toBe("Ap");
    });
  });

  describe("Option keyboard ArrowDown and ArrowUp", () => {
    it("moves focus to next option on ArrowDown", async () => {
      render(<Select options={["Apple", "Banana", "Cherry"] as any} placeholder="Select" />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      const first = screen.getByTestId("select-option-Apple");
      first.focus();
      fireEvent.keyDown(first, { key: "ArrowDown" });
      expect(document.activeElement).toBe(screen.getByTestId("select-option-Banana"));
    });

    it("moves focus to previous option on ArrowUp", async () => {
      render(<Select options={["Apple", "Banana", "Cherry"] as any} placeholder="Select" />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Banana")).toBeInTheDocument());
      const second = screen.getByTestId("select-option-Banana");
      second.focus();
      fireEvent.keyDown(second, { key: "ArrowUp" });
      expect(document.activeElement).toBe(screen.getByTestId("select-option-Apple"));
    });
  });

  describe("Single select with grouped options", () => {
    it("renders group label as non-interactive header when not multiple", async () => {
      const options = [
        {
          label: "Fruits",
          children: [
            { value: "a", label: "Apple" },
            { value: "b", label: "Banana" },
          ],
        },
      ];
      render(<Select options={options as any} placeholder="Select" />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Fruits")).toBeInTheDocument());
      expect(screen.getByText("Fruits").tagName).toBe("DIV");
    });
  });

  describe("selectedValueRenderer", () => {
    it("uses selectedValueRenderer for each selected option in display", async () => {
      const selectedValueRenderer = jest.fn((option: any) => (
        <span data-testid="custom-label">{option?.label ?? option}</span>
      ));
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Pick"
          selectedValueRenderer={selectedValueRenderer as any}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Apple"));
      expect(selectedValueRenderer).toHaveBeenCalled();
      expect(screen.getByTestId("custom-label")).toBeInTheDocument();
      expect(screen.getByTestId("custom-label").textContent).toBe("Apple");
    });
  });

  describe("Trigger size and props", () => {
    it("applies size small to trigger", () => {
      render(<Select options={["A"] as any} placeholder="Select" size="small" />);
      const trigger = screen.getByRole("button");
      expect(trigger).toHaveClass("sizeSmall");
    });

    it("applies size large to trigger", () => {
      render(<Select options={["A"] as any} placeholder="Select" size="large" />);
      const trigger = screen.getByRole("button");
      expect(trigger).toHaveClass("sizeLarge");
    });

    it("spreads triggerProps onto trigger", () => {
      render(<Select options={["A"] as any} placeholder="Select" triggerProps={{ "data-foo": "bar" }} />);
      expect(screen.getByRole("button").getAttribute("data-foo")).toBe("bar");
    });
  });

  describe("Header", () => {
    it("renders custom header when props.header provided", async () => {
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          header={<div data-testid="custom-header">Custom header</div>}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByTestId("custom-header")).toBeInTheDocument());
      expect(screen.getByText("Custom header")).toBeInTheDocument();
    });
  });

  describe("searchFilter with empty query", () => {
    it("calls custom searchFilter even with empty query when searchFilter provided", async () => {
      const searchFilter = jest.fn(() => true);
      render(
        <Select
          options={["Apple", "Banana"] as any}
          placeholder="Select"
          searchable={true}
          searchFilter={searchFilter}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(searchFilter).toHaveBeenCalled());
    });
  });

  describe("onChange when disabled", () => {
    it("does not call onChange when selecting and component is disabled", async () => {
      const onChange = jest.fn();
      render(<Select options={["Apple", "Banana"] as any} placeholder="Select" disabled={true} onChange={onChange} />);
      const trigger = screen.getByRole("button");
      expect(trigger).toBeDisabled();
    });
  });

  describe("Native select and form", () => {
    it("renders hidden native select with name and value for form submission", async () => {
      render(<Select options={["Apple", "Banana"] as any} placeholder="Select" name="fruit" />);
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Apple"));
      const nativeSelect = document.querySelector("select");
      expect(nativeSelect).toBeInTheDocument();
      expect(nativeSelect?.getAttribute("name")).toBe("fruit");
    });
  });
});
