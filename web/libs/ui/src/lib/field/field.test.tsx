import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Input } from "../input/input";
import { Field } from "./field";

describe("Field", () => {
  it("labels its control and links the description and the error to it", () => {
    render(
      <Field label="Delivery email" description="Reports go here." error="Enter a valid email address">
        <Input defaultValue="reports@acme" />
      </Field>,
    );
    const input = screen.getByLabelText("Delivery email");

    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = (input.getAttribute("aria-describedby") ?? "").split(" ");
    const texts = described.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toContain("Reports go here.");
    expect(texts).toContain("Enter a valid email address");
  });

  it("shows the hint, and replaces it with the error when there is one", () => {
    const { rerender } = render(
      <Field label="Name" hint="Shown on the project card.">
        <Input />
      </Field>,
    );
    expect(screen.getByText("Shown on the project card.")).toBeTruthy();

    rerender(
      <Field label="Name" hint="Shown on the project card." error="Enter a name">
        <Input />
      </Field>,
    );
    expect(screen.queryByText("Shown on the project card.")).toBeNull();
    expect(screen.getByText("Enter a name")).toBeTruthy();
  });

  it("marks required fields with the Required badge and nothing on optional ones", () => {
    const { rerender } = render(
      <Field label="Workspace" required>
        <Input />
      </Field>,
    );
    expect(screen.getByText("Required")).toBeTruthy();

    rerender(
      <Field label="Workspace">
        <Input />
      </Field>,
    );
    expect(screen.queryByText("Required")).toBeNull();
    expect(screen.queryByText(/optional/i)).toBeNull();
  });

  it("keeps a control's own id", () => {
    render(
      <Field label="Token">
        <Input id="token-input" />
      </Field>,
    );
    expect(screen.getByLabelText("Token").id).toBe("token-input");
  });

  it("renders a group as a fieldset named by its legend", () => {
    render(
      <Field group label="Sampling" error="Choose one">
        <input type="radio" name="s" aria-label="Random" />
      </Field>,
    );
    const group = screen.getByRole("group", { name: "Sampling" });
    expect(group.tagName).toBe("FIELDSET");
    expect(group.getAttribute("aria-invalid")).toBe("true");
  });

  it("lays the control out at the right in horizontal layout", () => {
    const { container } = render(
      <Field label="Score" layout="horizontal" error="Too high">
        <Input />
      </Field>,
    );
    expect(container.firstElementChild?.getAttribute("data-layout")).toBe("horizontal");
  });
});
