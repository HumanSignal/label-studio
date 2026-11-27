import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { InstructionsModal } from "../InstructionsModal";

describe("InstructionsModal Component", () => {
  it("renders the title and children in the editor instructions dialog", () => {
    render(
      <InstructionsModal title="Test Title" visible={true} onCancel={() => {}}>
        <p>Test Children</p>
      </InstructionsModal>,
    );

    expect(screen.getByTestId("editor-instructions-modal")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Children")).toBeInTheDocument();
  });

  it("renders sanitized html", () => {
    render(
      <InstructionsModal title="Test Title" visible={true} onCancel={() => {}}>
        {'<h1 style="color: red;">Test Children</h1>'}
      </InstructionsModal>,
    );

    expect(screen.queryByText("Test Children")).toBeTruthy();
    expect(screen.queryByText("color: red")).toBeNull();
  });

  it("pads the content inside the edge-to-edge dialog body", () => {
    const { unmount } = render(
      <InstructionsModal title="Test Title" visible={true} onCancel={() => {}}>
        <span>Test Children</span>
      </InstructionsModal>,
    );
    expect(screen.getByText("Test Children").parentElement?.className).toContain("px-wide");
    unmount();

    render(
      <InstructionsModal title="Test Title" visible={true} onCancel={() => {}}>
        {"<b>Html instructions</b>"}
      </InstructionsModal>,
    );
    expect(screen.getByText("Html instructions").parentElement?.className).toContain("px-wide");
  });

  it("calls onCancel when the close button is activated", () => {
    const onCancel = mock();
    render(
      <InstructionsModal title="Test Title" visible={true} onCancel={onCancel}>
        <p>Test Children</p>
      </InstructionsModal>,
    );

    fireEvent.click(screen.getByTestId("modal-window-close-button"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
