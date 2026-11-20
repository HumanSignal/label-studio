import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

// Other editor tests mock @humansignal/ui and Infomodal for the whole run; these tests need the real ones.
const actualUi = requireActual("@humansignal/ui");
mockModule("@humansignal/ui", () => actualUi);
const { InfoModalRoot } = await import("../InfoModalRoot");
const { showConfirmModal, showInfoModal } = await import("../infomodal-dispatch");

describe("InfoModalRoot", () => {
  it("shows an info payload in the DS dialog and closes on OK", () => {
    render(<InfoModalRoot />);

    act(() => {
      showInfoModal({ variant: "warning", content: "Check the labels", title: "Heads up" });
    });
    expect(screen.getByTestId("editor-info-modal")).toBeInTheDocument();
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Check the labels")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("editor-info-modal-ok"));
    expect(screen.queryByTestId("editor-info-modal")).toBeNull();
  });

  it("stays open when focus moves to the page behind it (a focused dropdown must not dismiss a warning)", () => {
    render(
      <>
        <input data-testid="behind" />
        <InfoModalRoot />
      </>,
    );

    act(() => {
      showInfoModal({ variant: "warning", content: "Taxonomy is required", title: "Warning" });
    });
    act(() => {
      screen.getByTestId("behind").focus();
    });

    expect(screen.getByTestId("editor-info-modal")).toBeInTheDocument();
  });

  it("keeps keyboard focus inside the warning", async () => {
    render(
      <>
        <button type="button" data-testid="behind-trap" />
        <InfoModalRoot />
      </>,
    );
    act(() => {
      showInfoModal({ variant: "warning", content: "Taxonomy is required", title: "Warning" });
    });
    screen.getByTestId("editor-info-modal-ok").focus();

    act(() => {
      screen.getByTestId("behind-trap").focus();
    });

    await waitFor(() => expect(screen.getByTestId("editor-info-modal").contains(document.activeElement)).toBe(true));
  });

  it("asks in the confirm dialog and runs the action only on confirm", () => {
    const onOk = mock();
    render(<InfoModalRoot />);

    act(() => {
      showConfirmModal({ title: "Delete all regions", content: "Please confirm", okText: "Delete", onOk });
    });
    expect(screen.getByTestId("editor-confirm-modal")).toBeInTheDocument();
    expect(screen.getByText("Please confirm")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOk).not.toHaveBeenCalled();

    act(() => {
      showConfirmModal({ title: "Delete all regions", content: "Please confirm", okText: "Delete", onOk });
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onOk).toHaveBeenCalledTimes(1);
  });
});
