import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import { GridSelectAll } from "../GridSelectAll";

const createMockStore = (viewOverrides = {}) => {
  const selectAll = jest.fn();
  const view = {
    type: "grid",
    selected: {
      isAllSelected: false,
      isIndeterminate: false,
    },
    selectAll,
    ...viewOverrides,
  };

  return { store: { currentView: view }, view, selectAll };
};

const renderWithStore = (viewOverrides = {}) => {
  const { store, view, selectAll } = createMockStore(viewOverrides);

  render(
    <Provider store={store}>
      <GridSelectAll />
    </Provider>,
  );

  return { view, selectAll };
};

describe("GridSelectAll", () => {
  it("renders nothing in list view", () => {
    const { container } = render(
      <Provider store={{ currentView: { type: "list", selected: {}, selectAll: jest.fn() } }}>
        <GridSelectAll />
      </Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders checkbox in grid view", () => {
    renderWithStore();

    expect(screen.getByTestId("dm-grid-select-all")).toBeInTheDocument();
    expect(screen.getByLabelText("Select all rows")).toBeInTheDocument();
  });

  it("calls view.selectAll on click", () => {
    const { selectAll } = renderWithStore();

    fireEvent.click(screen.getByTestId("dm-grid-select-all"));

    expect(selectAll).toHaveBeenCalledTimes(1);
  });

  it("reflects isAllSelected state", () => {
    renderWithStore({
      selected: {
        isAllSelected: true,
        isIndeterminate: false,
      },
    });

    expect(screen.getByLabelText("Unselect all rows")).toBeChecked();
  });

  it("reflects indeterminate state", () => {
    renderWithStore({
      selected: {
        isAllSelected: false,
        isIndeterminate: true,
      },
    });

    const checkbox = screen.getByTestId("dm-grid-select-all");

    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
  });
});
