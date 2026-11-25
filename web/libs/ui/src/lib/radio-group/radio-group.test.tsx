import { describe, expect, it, mock } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Radio, RadioGroup } from "./radio-group";

const sampling = (props: Partial<React.ComponentProps<typeof RadioGroup>> = {}) => (
  <RadioGroup label="Task sampling" {...props}>
    <Radio value="sequential" label="Sequential" description="In the order tasks were imported." />
    <Radio value="random" label="Random" />
    <Radio value="uncertainty" label="Uncertainty" disabled />
  </RadioGroup>
);

describe("RadioGroup", () => {
  it("renders native radios in a group named by its label", () => {
    render(sampling({ defaultValue: "random" }));
    const group = screen.getByRole("group", { name: "Task sampling" });
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];

    expect(group.tagName).toBe("FIELDSET");
    expect(radios).toHaveLength(3);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    expect((screen.getByRole("radio", { name: /Random/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("selects on click and reports the value", () => {
    const onValueChange = mock();
    render(sampling({ defaultValue: "random", onValueChange }));

    fireEvent.click(screen.getByRole("radio", { name: /Sequential/ }));
    expect((screen.getByRole("radio", { name: /Sequential/ }) as HTMLInputElement).checked).toBe(true);
    expect(onValueChange).toHaveBeenCalledWith("sequential");
  });

  it("follows a controlled value", () => {
    function Controlled() {
      const [value, setValue] = useState("random");
      return (
        <>
          {sampling({ value, onValueChange: setValue })}
          <button type="button" onClick={() => setValue("sequential")}>
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect((screen.getByRole("radio", { name: /Sequential/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("disables one option or the whole group", () => {
    const { rerender } = render(sampling());
    expect((screen.getByRole("radio", { name: /Uncertainty/ }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Random/ }) as HTMLInputElement).disabled).toBe(false);

    rerender(sampling({ disabled: true }));
    for (const radio of screen.getAllByRole("radio") as HTMLInputElement[]) expect(radio.disabled).toBe(true);
  });

  it("links the description to its option", () => {
    render(sampling());
    expect(screen.getByRole("radio", { name: /Sequential/ }).closest("label")?.textContent).toContain(
      "In the order tasks were imported.",
    );
  });

  it("shows the error and marks every radio invalid", () => {
    render(sampling({ error: "Choose how tasks are served" }));
    expect(screen.getByText("Choose how tasks are served")).toBeTruthy();
    for (const radio of screen.getAllByRole("radio")) expect(radio.getAttribute("aria-invalid")).toBe("true");
  });

  it("is a radiogroup on its own when it has no visible label", () => {
    render(
      <RadioGroup aria-label="Density">
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Density" })).toBeTruthy();
  });

  it("draws the card variant with the optional icon", () => {
    render(
      <RadioGroup variant="card" defaultValue="consensus">
        <Radio value="consensus" label="Consensus" icon={<svg data-testid="icon" />} />
        <Radio value="pairwise" label="Pairwise" />
      </RadioGroup>,
    );
    expect(screen.getByTestId("icon")).toBeTruthy();
    expect(
      screen
        .getByRole("radio", { name: /Consensus/ })
        .closest("label")
        ?.getAttribute("data-checked"),
    ).toBe("true");
  });
});
