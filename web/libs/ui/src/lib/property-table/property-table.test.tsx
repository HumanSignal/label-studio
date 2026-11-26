import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PropertyList, PropertyTable, PropertyTableInput, PropertyTableRow, PropertySection } from "./property-table";

afterEach(cleanup);

describe("shared inspector properties", () => {
  it("uses the same labeled table and rows for text properties and geometry", () => {
    render(
      <PropertyList
        aria-label="Entity information"
        items={[
          { label: "Text", value: "Ada Lovelace" },
          { label: "Start", value: 0 },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Entity information" });
    expect(within(table).getByRole("rowheader", { name: "Text" })).toBeTruthy();
    expect(within(table).getByRole("cell", { name: "Ada Lovelace" })).toBeTruthy();
    expect(within(table).getByRole("cell", { name: "0" })).toBeTruthy();
  });
  it("keeps row details accessible and numeric focus/change handlers owned by the caller", () => {
    const focus = mock(() => {});
    const change = mock(() => {});
    render(
      <PropertyTable aria-label="Point coordinates" columns={["#", "X px", "Y px"]}>
        <PropertyTableRow
          label="1"
          active
          onFocusCapture={focus}
          values={[
            <PropertyTableInput key="x" aria-label="Vertex 1 X (px)" defaultValue="192" onChange={change} />,
            <PropertyTableInput key="y" aria-label="Vertex 1 Y (px)" value="20" disabled />,
          ]}
          details={<div role="alert">Keep coordinates inside the image.</div>}
        />
      </PropertyTable>,
    );
    const x = screen.getByRole("spinbutton", { name: "Vertex 1 X (px)" });
    fireEvent.focus(x);
    fireEvent.change(x, { target: { value: "193" } });
    expect(focus).toHaveBeenCalled();
    expect(change).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain("inside the image");
    expect((screen.getByRole("spinbutton", { name: "Vertex 1 Y (px)" }) as HTMLInputElement).disabled).toBe(true);
  });
});

describe("inspector sections", () => {
  it("collapses independently without discarding an unfinished field draft", () => {
    render(
      <>
        <PropertySection title="Geometry">
          <PropertyTableInput aria-label="X" defaultValue="32" />
        </PropertySection>
        <PropertySection title="Properties">Ada Lovelace</PropertySection>
      </>,
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "X" }), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Geometry" }));
    expect(screen.queryByRole("spinbutton", { name: "X" })).toBeNull();
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Geometry" }));
    expect((screen.getByRole("spinbutton", { name: "X" }) as HTMLInputElement).value).toBe("42");
  });
});
