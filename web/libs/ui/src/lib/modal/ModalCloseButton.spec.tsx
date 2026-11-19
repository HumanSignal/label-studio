import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Modal } from "./ModalPopup";

describe("Modal.CloseButton", () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    error = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
  });

  it("reports that it cannot close anything outside a legacy Modal", () => {
    render(<Modal.CloseButton />);

    expect(screen.getByRole("button", { name: "Close modal" })).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("outside a legacy Modal"));
  });

  it("stays quiet inside a legacy Modal", () => {
    render(
      <Modal visible title="Report">
        body
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Close modal" })).toBeInTheDocument();
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining("outside a legacy Modal"));
  });
});
