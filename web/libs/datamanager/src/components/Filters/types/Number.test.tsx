import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { RangeInput } from "./Number";

describe("RangeInput (FIT-2448)", () => {
  it("renders Min, connector and, and Max without clipping layout classes", () => {
    const onChange = mock(() => {});
    const { container } = render(<RangeInput value={{ min: 1, max: 2 }} onChange={onChange} />);

    expect(screen.getByPlaceholderText("Min")).toHaveValue(1);
    expect(screen.getByPlaceholderText("Max")).toHaveValue(2);
    expect(screen.getByText("and")).toBeInTheDocument();

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("min-w-0");
    expect(root.className).toContain("w-full");
  });

  it("updates min and max independently", () => {
    const onChange = mock(() => {});
    render(<RangeInput value={{ min: 1, max: 2 }} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Min"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith({ min: 3, max: 2 });

    fireEvent.change(screen.getByPlaceholderText("Max"), { target: { value: "9" } });
    expect(onChange).toHaveBeenCalledWith({ min: 1, max: 9 });
  });
});
