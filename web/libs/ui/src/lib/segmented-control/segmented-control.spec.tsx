import { fireEvent, render, screen } from "@testing-library/react";
import { SegmentedControl } from "./segmented-control";

describe("SegmentedControl", () => {
  const options = [
    { value: "cards", label: "C", tooltip: "Switch to Cards View" },
    { value: "table", label: "L", "aria-label": "List", "data-testid": "list-option", className: "custom" },
  ];

  it("names icon-only options by their tooltip or aria-label", () => {
    render(<SegmentedControl selectedOption="cards" options={options} />);

    expect(screen.getByRole("radio", { name: "Switch to Cards View" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("aria-checked", "false");
  });

  it("uses an option's own test id and class, else the control's test id", () => {
    render(<SegmentedControl selectedOption="cards" options={options} data-testid="mode" />);

    expect(screen.getByTestId("mode-cards")).toBeInTheDocument();
    expect(screen.getByTestId("list-option")).toHaveClass("custom");
  });

  it("calls onChange with the clicked value", () => {
    const onChange = mock();
    render(<SegmentedControl selectedOption="cards" options={options} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "List" }));

    expect(onChange).toHaveBeenCalledWith("table");
  });
});
