import { fireEvent, render, screen } from "@testing-library/react";
import { CollectionUploader } from "./collection-uploader";
import { MediaCard } from "./media-card";

function pickFiles(count: number) {
  const input = screen.getByTestId("collection-uploader-input") as HTMLInputElement;
  const files = Array.from({ length: count }, (_, i) => new File(["x"], `file-${i}.png`, { type: "image/png" }));
  fireEvent.change(input, { target: { files } });
  return files;
}

describe("CollectionUploader (single-file default)", () => {
  it("renders the full dropzone and no bundle chrome", () => {
    render(<CollectionUploader rows={[]} onPick={() => undefined} />);
    expect(screen.getByTestId("collection-uploader-dropzone")).toBeInTheDocument();
    expect(screen.queryByTestId("collection-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("collection-uploader-grid")).not.toBeInTheDocument();
  });

  it("passes every picked file through unclamped", () => {
    const onPick = jest.fn();
    render(<CollectionUploader rows={[]} onPick={onPick} />);
    pickFiles(3);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0]).toHaveLength(3);
  });
});

describe("CollectionUploader (bundle mode)", () => {
  const bundleProps = { rows: [], minFiles: 3, maxFiles: 8 };

  it("empty bundle shows the full dropzone plus the count chip", () => {
    render(<CollectionUploader {...bundleProps} onPick={() => undefined} fileCount={0} storedCount={0} />);
    expect(screen.getByTestId("collection-uploader-dropzone")).toBeInTheDocument();
    expect(screen.getByText("0 / 3–8")).toBeInTheDocument();
  });

  it("with members the dropzone collapses into the grid with an add-tile", () => {
    render(
      <CollectionUploader {...bundleProps} onPick={() => undefined} fileCount={2} storedCount={2}>
        <MediaCard state="uploaded" file={{ name: "a.png" }} kind="image" />
        <MediaCard state="uploaded" file={{ name: "b.png" }} kind="image" />
      </CollectionUploader>,
    );
    expect(screen.queryByTestId("collection-uploader-dropzone")).not.toBeInTheDocument();
    expect(screen.getByTestId("collection-uploader-grid")).toBeInTheDocument();
    expect(screen.getAllByTestId("media-card-uploaded")).toHaveLength(2);
    expect(screen.getByTestId("collection-uploader-strip")).toHaveTextContent("Add at least 1 more");
  });

  it("strip switches to optional wording once the minimum is met", () => {
    render(<CollectionUploader {...bundleProps} onPick={() => undefined} fileCount={4} storedCount={4} />);
    expect(screen.getByTestId("collection-uploader-strip")).toHaveTextContent("Up to 4 more — optional");
  });

  it("strip disappears when the bundle is full", () => {
    render(<CollectionUploader {...bundleProps} onPick={() => undefined} fileCount={8} storedCount={8} />);
    expect(screen.queryByTestId("collection-uploader-strip")).not.toBeInTheDocument();
  });

  it("view toggle switches the cards between grid and rows", () => {
    render(
      <CollectionUploader {...bundleProps} onPick={() => undefined} fileCount={1} storedCount={1}>
        <MediaCard state="uploaded" file={{ name: "a.png" }} kind="image" />
      </CollectionUploader>,
    );
    expect(screen.getByTestId("collection-uploader-grid")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("List view"));
    expect(screen.getByTestId("collection-uploader-list")).toBeInTheDocument();
    expect(screen.getByTestId("media-card-uploaded")).toHaveAttribute("data-layout", "row");
    fireEvent.click(screen.getByLabelText("Grid view"));
    expect(screen.getByTestId("collection-uploader-grid")).toBeInTheDocument();
  });

  it("count chip turns positive at the minimum", () => {
    const { rerender } = render(
      <CollectionUploader {...bundleProps} onPick={() => undefined} fileCount={2} storedCount={2} />,
    );
    expect(screen.getByText("2 / 3–8")).toBeInTheDocument();
    rerender(<CollectionUploader {...bundleProps} onPick={() => undefined} fileCount={3} storedCount={3} />);
    expect(screen.getByText(/3 \/ 3–8/)).toBeInTheDocument();
  });

  it("exact-count bundles label the chip with the single number", () => {
    render(
      <CollectionUploader rows={[]} minFiles={8} maxFiles={8} onPick={() => undefined} fileCount={5} storedCount={5} />,
    );
    expect(screen.getByText(/5 \/ 8/)).toBeInTheDocument();
  });

  it("over-pick fills the remaining slots in order and says what was skipped", () => {
    const onPick = jest.fn();
    render(<CollectionUploader {...bundleProps} onPick={onPick} fileCount={6} storedCount={6} />);
    const files = pickFiles(5);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0]).toEqual(files.slice(0, 2));
    expect(screen.getByTestId("collection-uploader-overpick")).toHaveTextContent("3 skipped");
  });

  it("a pick against a full bundle is refused with a notice, not silently dropped", () => {
    const onPick = jest.fn();
    render(<CollectionUploader {...bundleProps} onPick={onPick} fileCount={8} storedCount={8} />);
    const input = screen.getByTestId("collection-uploader-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "extra.png", { type: "image/png" })] } });
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByTestId("collection-uploader-overpick")).toHaveTextContent("bundle is full");
  });

  it("legacy row list never renders in bundle mode", () => {
    render(
      <CollectionUploader
        {...bundleProps}
        rows={[{ clientRef: "r1", filename: "f.png", size: 10, status: "failed", progress: 0, error: "boom" }]}
        onPick={() => undefined}
        fileCount={1}
        storedCount={0}
      />,
    );
    expect(screen.queryByTestId("collection-uploader-row-failed")).not.toBeInTheDocument();
  });
});

describe("MediaCard row layout", () => {
  it("renders the horizontal row with chip and actions", () => {
    render(
      <MediaCard
        state="uploaded"
        file={{ name: "a.png", size: 1000, contentType: "image/png" }}
        kind="image"
        previewUrl="blob:x"
        layout="row"
        storedHint
        onReplace={() => undefined}
        onRemove={() => undefined}
      />,
    );
    const card = screen.getByTestId("media-card-uploaded");
    expect(card).toHaveAttribute("data-layout", "row");
    expect(screen.getByText("a.png")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Replace")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });
});
