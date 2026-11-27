import { describe, expect, it, mock } from "bun:test";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Toggle } from "./toggle";

describe("Toggle", () => {
  it("works without an onChange and forwards its ref to the native checkbox", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Toggle ref={ref} label="Allow skipping" />);
    const input = screen.getByRole("checkbox") as HTMLInputElement;
    expect(ref.current).toBe(input);
    fireEvent.click(input);
    expect(input.checked).toBe(true);
  });

  it("follows checked when it is passed", () => {
    const onChange = mock();
    const { rerender } = render(<Toggle aria-label="Active" checked={false} onChange={onChange} />);
    rerender(<Toggle aria-label="Active" checked onChange={onChange} />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });

  it("marks an invalid value", () => {
    render(<Toggle aria-label="Consent" invalid />);
    expect(screen.getByRole("checkbox").getAttribute("aria-invalid")).toBe("true");
  });

  it("puts the label first when aligned to the end", () => {
    const { container } = render(<Toggle label="Reveal names" align="end" />);
    const label = container.querySelector("label") as HTMLElement;
    expect(label.className).toContain("placement_left");
  });
});
