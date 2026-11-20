import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import { ModalWindow } from "../modal-window/modal-window";
import { ReaderViewModal } from "./reader-view-modal";

function SourceDialogWithReader() {
  const [readerOpen, setReaderOpen] = useState(false);
  return (
    <ModalWindow open onOpenChange={() => {}} title="Source for task 1" dataTestId="source-dialog">
      <button type="button" onClick={() => setReaderOpen(true)}>
        Open Reader View
      </button>
      <ReaderViewModal content="A long value" isOpen={readerOpen} onClose={() => setReaderOpen(false)} />
    </ModalWindow>
  );
}

describe("ReaderViewModal", () => {
  it("opens as a nested dialog on top of the dialog it is opened from, and closes back to it", async () => {
    render(<SourceDialogWithReader />);
    fireEvent.click(await screen.findByRole("button", { name: "Open Reader View" }));

    const reader = await screen.findByTestId("reader-view-modal");
    expect(within(reader).getByLabelText("Plain text content")).toHaveTextContent("A long value");
    expect(screen.getByTestId("source-dialog")).toBeInTheDocument();

    fireEvent.click(within(reader).getByTestId("modal-window-close-button"));
    await waitFor(() => expect(screen.queryByTestId("reader-view-modal")).not.toBeInTheDocument());
    expect(screen.getByTestId("source-dialog")).toBeInTheDocument();
  });
});
