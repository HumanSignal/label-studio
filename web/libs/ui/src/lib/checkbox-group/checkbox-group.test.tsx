import { describe, expect, it, mock } from "bun:test";
import { createRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Checkbox } from "../checkbox/checkbox";
import { CheckboxGroup } from "./checkbox-group";

const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;

describe("CheckboxGroup", () => {
  it("reports the checked values as a list", () => {
    const onValueChange = mock();
    render(
      <CheckboxGroup label="Send for" defaultValue={["TASK_CREATED"]} onValueChange={onValueChange}>
        <Checkbox value="TASK_CREATED" label="Task created" />
        <Checkbox value="ANNOTATION_CREATED" label="Annotation created" />
      </CheckboxGroup>,
    );
    expect(screen.getByRole("group", { name: "Send for" }).tagName).toBe("FIELDSET");
    expect(box("Task created").checked).toBe(true);

    fireEvent.click(box("Annotation created"));
    fireEvent.click(box("Task created"));
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual([
      ["TASK_CREATED", "ANNOTATION_CREATED"],
      ["ANNOTATION_CREATED"],
    ]);
    expect(box("Task created").checked).toBe(false);
  });

  it("follows a controlled list and disables every box with the group", () => {
    const { rerender } = render(
      <CheckboxGroup aria-label="Events" value={["b"]}>
        <Checkbox value="a" label="A" />
        <Checkbox value="b" label="B" />
      </CheckboxGroup>,
    );
    expect(box("B").checked).toBe(true);
    rerender(
      <CheckboxGroup aria-label="Events" value={["a"]} disabled>
        <Checkbox value="a" label="A" />
        <Checkbox value="b" label="B" />
      </CheckboxGroup>,
    );
    expect(box("A").checked).toBe(true);
    expect(box("B").disabled).toBe(true);
  });

  it("shows the error and marks the boxes invalid", () => {
    render(
      <CheckboxGroup label="Consent" error="Confirm to continue">
        <Checkbox value="ok" label="I understand" />
      </CheckboxGroup>,
    );
    expect(screen.getByText("Confirm to continue")).toBeTruthy();
    expect(box("I understand").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Checkbox", () => {
  it("forwards its ref to the native input and works uncontrolled", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} defaultChecked label="Include history" />);
    expect(ref.current).toBe(box("Include history"));
    expect(box("Include history").checked).toBe(true);
    fireEvent.click(box("Include history"));
    expect(box("Include history").checked).toBe(false);
  });

  it("stays controlled when checked is passed", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Locked" />);
    fireEvent.click(box("Locked"));
    expect(box("Locked").checked).toBe(false);
  });

  it("shows a description and an invalid state", () => {
    render(<Checkbox label="Skip empty" description="Annotations with no result are left out." invalid />);
    expect(screen.getByText("Annotations with no result are left out.")).toBeTruthy();
    expect(box("Skip empty").getAttribute("aria-invalid")).toBe("true");
  });

  it("draws only the indeterminate mark when it is also checked", () => {
    render(<Checkbox checked indeterminate onChange={() => {}} label="Select all" />);
    const mark = box("Select all").nextElementSibling as HTMLElement;
    expect(mark.className).toContain("indeterminate");
    expect(mark.className).not.toContain("check_checked");
    expect(box("Select all").getAttribute("aria-checked")).toBe("mixed");
  });

  it("reads an undefined checked as unchecked, not as uncontrolled", () => {
    function Map() {
      const [map, setMap] = useState<Record<string, boolean>>({ a: true });
      return <Checkbox checked={map.a} onChange={() => setMap({})} label="From a map" />;
    }
    render(<Map />);
    expect(box("From a map").checked).toBe(true);
    fireEvent.click(box("From a map"));
    expect(box("From a map").checked).toBe(false);
  });
});
