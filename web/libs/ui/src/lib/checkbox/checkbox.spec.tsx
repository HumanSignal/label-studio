import { render, fireEvent } from "@testing-library/react";
import Checkbox from "./checkbox";

describe("Checkbox", () => {
  it("should render successfully", () => {
    const { baseElement } = render(<Checkbox />);
    expect(baseElement).toBeTruthy();
  });

  it("should render with a label when children are provided", () => {
    const { getByText } = render(<Checkbox>Test Label</Checkbox>);
    expect(getByText("Test Label")).toBeTruthy();
  });

  it("should be checked when checked prop is true", () => {
    const { getByRole } = render(<Checkbox checked={true} />);
    expect((getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });

  it("should not be checked when checked prop is false", () => {
    const { getByRole } = render(<Checkbox checked={false} />);
    expect((getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  });

  it("should call onChange when clicked", () => {
    const handleChange = jest.fn();
    const { getByRole } = render(<Checkbox onChange={handleChange} />);
    fireEvent.click(getByRole("checkbox"));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("should be indeterminate when indeterminate prop is true", () => {
    const { getByRole } = render(<Checkbox indeterminate={true} />);
    expect(getByRole("checkbox")).toHaveProperty("indeterminate", true);
  });

  it("should apply custom className", () => {
    const { container } = render(<Checkbox className="custom-class" />);
    expect((container.firstChild as HTMLElement).classList.contains("custom-class")).toBe(true);
  });

  it("should apply custom style", () => {
    const { container } = render(<Checkbox style={{ marginTop: "10px" }} />);
    expect((container.firstChild as HTMLElement).style.marginTop).toBe("10px");
  });
});
