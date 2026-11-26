import { describe, expect, it, mock } from "bun:test";
import { createRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NumberInput } from "./number-input";

const field = () => screen.getByRole("spinbutton") as HTMLInputElement;

describe("NumberInput", () => {
  it("reports numbers, not strings, and null when emptied", () => {
    const onValueChange = mock();
    render(<NumberInput aria-label="Overlap" defaultValue={3} onValueChange={onValueChange} />);

    fireEvent.change(field(), { target: { value: "12" } });
    fireEvent.change(field(), { target: { value: "" } });
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual([12, null]);
  });

  it("steps with the buttons and the arrow keys, within min and max", () => {
    const onValueChange = mock();
    render(<NumberInput aria-label="Tasks" defaultValue={9} min={0} max={10} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(field().value).toBe("10");
    expect((screen.getByRole("button", { name: "Increase" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(field().value).toBe("8");
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual([10, 9, 8]);
  });

  it("lets the user type freely and clamps when the field is left", () => {
    const onValueChange = mock();
    render(<NumberInput aria-label="Score" defaultValue={50} min={0} max={100} onValueChange={onValueChange} />);

    fireEvent.change(field(), { target: { value: "140" } });
    expect(field().value).toBe("140");
    fireEvent.blur(field());
    expect(field().value).toBe("100");
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe(100);
  });

  it("rounds to precision when the field is left", () => {
    render(<NumberInput aria-label="Rate" defaultValue={0} precision={2} step={0.05} />);
    fireEvent.change(field(), { target: { value: "0.256" } });
    fireEvent.blur(field());
    expect(field().value).toBe("0.26");
  });

  it("steps decimals without floating-point noise", () => {
    render(<NumberInput aria-label="Rate" defaultValue={0.1} step={0.2} stepper="compact" />);
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(field().value).toBe("0.3");
  });

  it("follows a controlled value", () => {
    function Controlled() {
      const [value, setValue] = useState<number | null>(2);
      return (
        <>
          <NumberInput aria-label="Count" value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(7)}>
            Set seven
          </button>
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "Set seven" }));
    expect(field().value).toBe("7");
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(field().value).toBe("8");
  });

  it("exposes its value to assistive technology and forwards the ref to the native input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<NumberInput ref={ref} aria-label="Seats" defaultValue={5} min={1} max={50} />);
    expect(ref.current).toBe(field());
    expect(field().getAttribute("aria-valuenow")).toBe("5");
    expect(field().getAttribute("aria-valuemin")).toBe("1");
    expect(field().getAttribute("aria-valuemax")).toBe("50");
  });

  it("shows the unit, and no buttons with stepper none", () => {
    render(<NumberInput aria-label="Lock" defaultValue={15} unit="minutes" stepper="none" />);
    expect(screen.getByText("minutes")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Increase" })).toBeNull();
  });

  it("renders a label and an error through Field", () => {
    render(<NumberInput label="Overlap" error="Must be at least 1" defaultValue={0} />);
    expect(screen.getByLabelText("Overlap").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Must be at least 1")).toBeTruthy();
  });
});
