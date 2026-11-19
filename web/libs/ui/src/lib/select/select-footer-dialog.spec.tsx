import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ConfirmDialog } from "../modal-window/confirm-dialog";
import { Select } from "./select";

/** A footer that confirms an action in a dialog, like the Data Manager's "Reset columns". */
function ConfirmingFooter({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reset
      </button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Reset columns?" okText="Reset columns" onOk={onReset} />
    </>
  );
}

describe("Select footer", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  it("keeps keys pressed in a dialog opened from the footer away from the options", async () => {
    const onChange = jest.fn();
    render(
      <Select
        multiple
        open
        value={["a"]}
        onChange={onChange}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
        footer={<ConfirmingFooter onReset={jest.fn()} />}
      />,
    );
    await act(async () => {
      screen.getByRole("button", { name: "Reset" }).click();
    });
    const cancel = screen.getByTestId("dialog-cancel-button");

    const notPrevented = fireEvent.keyDown(cancel, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
    // The browser still activates the focused button on Enter.
    expect(notPrevented).toBe(true);
  });

  it("still lets Enter pick the highlighted option from the list", () => {
    const onChange = jest.fn();
    render(
      <Select
        multiple
        open
        value={["a"]}
        onChange={onChange}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
        footer={<ConfirmingFooter onReset={jest.fn()} />}
      />,
    );

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
