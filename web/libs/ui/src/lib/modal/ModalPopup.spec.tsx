import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Modal } from "./ModalPopup";

/**
 * Nested modals: a dialog opened from inside another dialog.
 *
 * Every modal portals its overlay to ``document.body``, so a nested modal's overlay is a DOM SIBLING of
 * its opener's rather than a descendant. React still propagates the click through the component tree,
 * so the opener's click-outside handler saw the child's backdrop click as "a click outside my content"
 * and closed too — dismissing a nested dialog took the whole report with it.
 *
 * These tests must pass with NODE_ENV=development too: LSO bun unit CI sets that, and jsdom never
 * emits CSS transitionend, so hide() used to hang and onHide never fired.
 */
describe("Modal click-outside with a nested modal", () => {
  function NestedModals({ onParentHide, onChildHide }: { onParentHide: () => void; onChildHide: () => void }) {
    return (
      <Modal visible title="Batch report" data-testid="parent-modal" onHide={onParentHide} closeOnClickOutside>
        <div data-testid="parent-body">report body</div>
        <Modal visible title="Set estimated time" data-testid="child-modal" onHide={onChildHide} closeOnClickOutside>
          <div data-testid="child-body">estimate form</div>
        </Modal>
      </Modal>
    );
  }

  it("closes only the nested modal when its own backdrop is clicked", () => {
    const onParentHide = jest.fn();
    const onChildHide = jest.fn();
    render(<NestedModals onParentHide={onParentHide} onChildHide={onChildHide} />);

    fireEvent.click(screen.getByTestId("child-modal"));

    expect(onChildHide).toHaveBeenCalledTimes(1);
    expect(onParentHide).not.toHaveBeenCalled();
  });

  it("still closes on its own backdrop click", () => {
    const onParentHide = jest.fn();
    const onChildHide = jest.fn();
    render(<NestedModals onParentHide={onParentHide} onChildHide={onChildHide} />);

    fireEvent.click(screen.getByTestId("parent-modal"));

    expect(onParentHide).toHaveBeenCalledTimes(1);
  });

  it("does not close when the click lands inside its own content", () => {
    const onParentHide = jest.fn();
    const onChildHide = jest.fn();
    render(<NestedModals onParentHide={onParentHide} onChildHide={onChildHide} />);

    fireEvent.click(screen.getByTestId("child-body"));

    expect(onChildHide).not.toHaveBeenCalled();
    expect(onParentHide).not.toHaveBeenCalled();
  });
});

/**
 * Escape has the same portal-sibling problem as the backdrop: both modals listen on ``document``, and the
 * opener registered first, so Escape aimed at the nested dialog took the whole report down with it.
 */
describe("Modal Escape with a nested modal", () => {
  it("closes only the nested modal", () => {
    const onParentHide = jest.fn();
    const onChildHide = jest.fn();
    render(
      <Modal visible title="Batch report" data-testid="parent-modal" onHide={onParentHide}>
        <div data-testid="parent-body">report body</div>
        <Modal visible title="Set estimated time" data-testid="child-modal" onHide={onChildHide}>
          <div data-testid="child-body">estimate form</div>
        </Modal>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onChildHide).toHaveBeenCalledTimes(1);
    expect(onParentHide).not.toHaveBeenCalled();
  });

  it("closes the opener once the nested modal is gone", () => {
    const onParentHide = jest.fn();
    const { rerender } = render(
      <Modal visible title="Batch report" data-testid="parent-modal" onHide={onParentHide}>
        <div data-testid="parent-body">report body</div>
        <Modal visible title="Set estimated time" data-testid="child-modal" onHide={jest.fn()}>
          <div data-testid="child-body">estimate form</div>
        </Modal>
      </Modal>,
    );

    rerender(
      <Modal visible title="Batch report" data-testid="parent-modal" onHide={onParentHide}>
        <div data-testid="parent-body">report body</div>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onParentHide).toHaveBeenCalledTimes(1);
  });

  it("closes only the confirm a dialog raised beside itself", () => {
    // The estimate dialog raises its unsaved-changes confirm as a JSX SIBLING, so neither is the other's
    // descendant. The confirm opened last, and it is the one the operator is answering.
    const onDialogHide = jest.fn();
    const onConfirmHide = jest.fn();
    function DialogWithConfirm({ confirmOpen }: { confirmOpen: boolean }) {
      return (
        <Modal visible title="Batch report" data-testid="parent-modal" onHide={jest.fn()}>
          <Modal visible title="Set estimated time" data-testid="dialog-modal" onHide={onDialogHide}>
            <div data-testid="dialog-body">estimate form</div>
          </Modal>
          <Modal visible={confirmOpen} title="Discard changes?" data-testid="confirm-modal" onHide={onConfirmHide}>
            <div data-testid="confirm-body">discard?</div>
          </Modal>
        </Modal>
      );
    }

    const { rerender } = render(<DialogWithConfirm confirmOpen={false} />);
    rerender(<DialogWithConfirm confirmOpen />);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onConfirmHide).toHaveBeenCalledTimes(1);
    expect(onDialogHide).not.toHaveBeenCalled();
  });

  it("still closes a lone modal", () => {
    const onHide = jest.fn();
    render(
      <Modal visible title="Batch report" data-testid="solo-modal" onHide={onHide}>
        <div data-testid="solo-body">report body</div>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
