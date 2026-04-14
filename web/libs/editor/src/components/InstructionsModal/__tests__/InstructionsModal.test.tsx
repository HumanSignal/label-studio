import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { InstructionsModal } from "../InstructionsModal";
import { FF_MODAL_WINDOW_APP_CHROME } from "@humansignal/core/lib/utils/feature-flags";

describe("InstructionsModal Component", () => {
  const ff = mockFF();

  beforeEach(() => {
    ff.reset();
  });

  afterEach(() => {
    ff.reset();
  });

  it("should render the title and children", () => {
    const title = "Test Title";
    const children = <p>Test Children</p>;
    const { getByText } = render(
      <InstructionsModal title={title} visible={true} onCancel={() => {}}>
        {children}
      </InstructionsModal>,
    );

    expect(document.body.contains(getByText(title))).toBe(true);
    expect(document.body.contains(getByText("Test Children"))).toBe(true);
  });

  it("should render html", () => {
    const title = "Test Title";
    const children = '<h1 style="color: red;">Test Children</h1>';

    render(
      <InstructionsModal title={title} visible={true} onCancel={() => {}}>
        {children}
      </InstructionsModal>,
    );

    expect(screen.queryByText("Test Children")).toBeTruthy();
    expect(screen.queryByText("color: red")).toBeNull();
  });

  it("should call onCancel when the modal is cancelled", () => {
    const onCancel = mock();
    const { getByLabelText } = render(
      <InstructionsModal title="Test Title" visible={true} onCancel={onCancel}>
        <p>Test Children</p>
      </InstructionsModal>,
    );

    fireEvent.click(getByLabelText("Close"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  describe("when FF_MODAL_WINDOW_APP_CHROME is enabled", () => {
    beforeEach(() => {
      ff.set({ [FF_MODAL_WINDOW_APP_CHROME]: true });
    });

    it("renders ModalWindow with editor test id and content", () => {
      render(
        <InstructionsModal title="Test Title" visible={true} onCancel={() => {}}>
          <p>Test Children</p>
        </InstructionsModal>,
      );

      expect(screen.getByTestId("editor-instructions-modal")).toBeInTheDocument();
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Children")).toBeInTheDocument();
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
});
