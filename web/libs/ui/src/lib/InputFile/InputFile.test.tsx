import { describe, expect, it, mock } from "bun:test";
import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { InputFile } from "./InputFile";

describe("InputFile", () => {
  it("is labelled by its text and forwards the ref to the native file input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<InputFile ref={ref} text="Choose an image" name="avatar" accept="image/*" />);
    const input = screen.getByLabelText("Choose an image") as HTMLInputElement;

    expect(input.type).toBe("file");
    expect(ref.current).toBe(input);
    expect(input.name).toBe("avatar");
    expect(input.accept).toBe("image/*");
  });

  it("keeps its legacy default text", () => {
    render(<InputFile />);
    expect(screen.getByLabelText("Upload Image")).toBeTruthy();
  });

  it("reports the chosen files and shows their names", () => {
    const onChange = mock();
    render(<InputFile text="Choose files" multiple onChange={onChange} />);
    const input = screen.getByLabelText("Choose files");
    const files = [new File(["a"], "a.csv"), new File(["b"], "b.csv")];

    fireEvent.change(input, { target: { files } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText("a.csv, b.csv")).toBeTruthy();
  });

  it("marks an invalid choice", () => {
    render(<InputFile text="Upload CSV" invalid />);
    expect(screen.getByLabelText("Upload CSV").getAttribute("aria-invalid")).toBe("true");
  });

  it("drops the file names when the caller clears the input", () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = mock();
    render(<InputFile ref={ref} text="Choose a photo" onChange={onChange} />);
    const input = screen.getByLabelText("Choose a photo");

    fireEvent.change(input, { target: { files: [new File(["a"], "me.png")] } });
    expect(screen.getByText("me.png")).toBeTruthy();

    act(() => {
      (ref.current as HTMLInputElement).value = "";
    });
    expect(screen.queryByText("me.png")).toBeNull();

    fireEvent.change(input, { target: { files: [new File(["a"], "me.png")] } });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(screen.getByText("me.png")).toBeTruthy();
  });
});
