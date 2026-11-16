import { fireEvent, render, screen } from "@testing-library/react";
import { Popover } from "./popover";

describe("Popover", () => {
  it("opens the content from the trigger prop", () => {
    render(
      <Popover trigger={<button type="button">Open</button>}>
        <p>Simple content</p>
      </Popover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByText("Simple content").closest('[data-slot="popover-content"]')).toHaveClass(
      "bg-neutral-background",
    );
  });

  it("composes Root, Trigger and Content with the same styled content", () => {
    const onOpenChange = mock();
    render(
      <Popover.Root onOpenChange={onOpenChange}>
        <span>
          <Popover.Trigger asChild>
            <button type="button">Filter</button>
          </Popover.Trigger>
        </span>
        <Popover.Content side="right" className="custom-panel">
          <p>Compound content</p>
        </Popover.Content>
      </Popover.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    const content = screen.getByText("Compound content").closest('[data-slot="popover-content"]');
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(content).toHaveClass("bg-neutral-background", "custom-panel");
    expect(content).toHaveAttribute("data-side", "right");
  });
});
