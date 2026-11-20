import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ErrorDialog } from "./ErrorDialog";

describe("ErrorDialog", () => {
  it("renders nothing without an error", () => {
    render(<ErrorDialog error={null} />);

    expect(screen.queryByTestId("error-dialog")).toBeNull();
  });

  it("shows the error's title, message and id", () => {
    render(<ErrorDialog error={{ title: "Error 500: Server Error", message: "It broke", errorId: "500" }} />);

    const dialog = screen.getByTestId("error-dialog");
    expect(dialog).toHaveTextContent("Error 500: Server Error");
    expect(dialog).toHaveTextContent("It broke");
    expect(dialog).toHaveTextContent("Error ID: 500");
  });

  it("closes on Escape when the owner allows it", async () => {
    const onClose = mock();
    render(<ErrorDialog error={{ title: "Runtime error", message: "It broke" }} onClose={onClose} />);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("has a close button when the owner allows closing", async () => {
    const onClose = mock();
    render(<ErrorDialog error={{ title: "Runtime error", message: "It broke" }} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    // The error body carries the visible title; the header only adds the close button
    expect(screen.getAllByText("Runtime error").filter((node) => !node.classList.contains("sr-only"))).toHaveLength(1);
  });

  it("cannot be dismissed when the owner gives no way to close it", async () => {
    render(<ErrorDialog error={{ title: "Connection refused", message: "Server not responding." }} />);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(screen.getByTestId("error-dialog")).toHaveTextContent("Connection refused");
    expect(screen.queryByTestId("modal-window-close-button")).toBeNull();
  });

  it("keeps showing the last error while it closes", () => {
    const { rerender } = render(<ErrorDialog error={{ title: "Runtime error", message: "It broke" }} />);

    rerender(<ErrorDialog error={null} />);

    // Radix keeps the content mounted for the exit animation; it must not go blank meanwhile.
    const dialog = screen.queryByTestId("error-dialog");
    if (dialog) expect(dialog).toHaveTextContent("It broke");
  });
});
