import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { DropZone } from "./drop-zone";

const fileList = (...names: string[]) => {
  const files = names.map((name) => new File(["x"], name));
  return Object.assign(files, { item: (i: number) => files[i] }) as unknown as FileList;
};

describe("DropZone", () => {
  it("passes dropped files and stops the drop from reaching the page", () => {
    const onFiles = mock();
    const onPageDrop = mock();
    render(
      <div onDrop={onPageDrop}>
        <DropZone onFiles={onFiles}>Drop here</DropZone>
      </div>,
    );
    const zone = screen.getByRole("button", { name: "Drop here" });
    const drop = createEvent.drop(zone);
    Object.defineProperty(drop, "dataTransfer", { value: { files: fileList("a.png", "b.png") } });
    fireEvent(zone, drop);

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(Array.from(onFiles.mock.calls[0][0] as FileList, (f) => f.name)).toEqual(["a.png", "b.png"]);
    expect(onPageDrop).not.toHaveBeenCalled();
  });

  it("highlights while files are dragged over it, and when active", () => {
    const { rerender } = render(<DropZone onFiles={mock()}>Drop here</DropZone>);
    const zone = screen.getByRole("button", { name: "Drop here" });
    expect(zone).toHaveAttribute("data-state", "idle");
    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute("data-state", "active");
    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute("data-state", "idle");

    rerender(
      <DropZone onFiles={mock()} active>
        Drop here
      </DropZone>,
    );
    expect(screen.getByRole("button", { name: "Drop here" })).toHaveAttribute("data-state", "active");
  });

  it("opens the file dialog on click and passes picked files", () => {
    const onFiles = mock();
    const { container } = render(
      <DropZone onFiles={onFiles} accept=".csv" multiple>
        Browse
      </DropZone>,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Browse" }));
    expect(click).toHaveBeenCalled();
    expect(input).toHaveAttribute("accept", ".csv");

    Object.defineProperty(input, "files", { value: fileList("rates.csv"), configurable: true });
    fireEvent.change(input);
    expect(Array.from(onFiles.mock.calls[0][0] as FileList, (f) => f.name)).toEqual(["rates.csv"]);
  });

  it("ignores drops and clicks while disabled", () => {
    const onFiles = mock();
    render(
      <DropZone onFiles={onFiles} disabled>
        Full
      </DropZone>,
    );
    const zone = screen.getByRole("button", { name: "Full" });
    const drop = createEvent.drop(zone);
    Object.defineProperty(drop, "dataTransfer", { value: { files: fileList("a.png") } });
    fireEvent(zone, drop);
    expect(onFiles).not.toHaveBeenCalled();
    expect(zone).toBeDisabled();
  });
});
