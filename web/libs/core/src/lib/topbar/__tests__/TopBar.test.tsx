import { fireEvent, render } from "@testing-library/react";
import { TopBar } from "../TopBar";

describe("shared TopBar", () => {
  it("renders nothing when visible is false", () => {
    const { container } = render(
      <TopBar visible={false} showViewAll isViewAll={false} onToggleViewAll={() => {}} showAddNew onAddNew={() => {}}>
        <div data-testid="carousel-slot">carousel</div>
      </TopBar>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the children slot in the topbar group when visible", () => {
    const { getByTestId, container } = render(
      <TopBar
        visible
        showViewAll={false}
        isViewAll={false}
        onToggleViewAll={() => {}}
        showAddNew={false}
        onAddNew={() => {}}
      >
        <div data-testid="carousel-slot">carousel</div>
      </TopBar>,
    );
    expect(getByTestId("carousel-slot")).toBeInTheDocument();
    // Block + group element must use the BEM-prefixed class names so customer whitelabel
    // CSS like `.lsf-topbar__group` keeps applying through the PostCSS pipeline.
    expect(container.querySelector(".ls-topbar")).not.toBeNull();
    expect(container.querySelector(".ls-topbar__group")).not.toBeNull();
    expect(container.querySelector(".ls-topbar_newLabelingUI")).not.toBeNull();
  });

  it("renders ViewAllToggle only when showViewAll is true", () => {
    const { queryByTestId, rerender } = render(
      <TopBar
        visible
        showViewAll={false}
        isViewAll={false}
        onToggleViewAll={() => {}}
        showAddNew={false}
        onAddNew={() => {}}
      />,
    );
    expect(queryByTestId("compare-all-toggle")).toBeNull();

    rerender(
      <TopBar
        visible
        showViewAll
        isViewAll={false}
        onToggleViewAll={() => {}}
        showAddNew={false}
        onAddNew={() => {}}
      />,
    );
    expect(queryByTestId("compare-all-toggle")).not.toBeNull();
  });

  it("invokes onToggleViewAll when the toggle is clicked", () => {
    const onToggleViewAll = mock();
    const { getByTestId } = render(
      <TopBar
        visible
        showViewAll
        isViewAll={false}
        onToggleViewAll={onToggleViewAll}
        showAddNew={false}
        onAddNew={() => {}}
      />,
    );
    fireEvent.click(getByTestId("compare-all-toggle"));
    expect(onToggleViewAll).toHaveBeenCalledTimes(1);
  });

  it("renders an add-new button only when showAddNew is true and invokes onAddNew", () => {
    const onAddNew = mock();
    const { getByLabelText, queryByLabelText, rerender } = render(
      <TopBar
        visible
        showViewAll={false}
        isViewAll={false}
        onToggleViewAll={() => {}}
        showAddNew={false}
        onAddNew={onAddNew}
      />,
    );
    expect(queryByLabelText("Create an annotation")).toBeNull();

    rerender(
      <TopBar
        visible
        showViewAll={false}
        isViewAll={false}
        onToggleViewAll={() => {}}
        showAddNew
        onAddNew={onAddNew}
      />,
    );
    fireEvent.click(getByLabelText("Create an annotation"));
    expect(onAddNew).toHaveBeenCalledTimes(1);
  });
});
