import { describe, expect, it, mock } from "bun:test";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TextArea } from "./text-area";

const setScrollHeight = (element: HTMLElement, height: number) =>
  Object.defineProperty(element, "scrollHeight", { configurable: true, get: () => height });

describe("TextArea", () => {
  it("forwards its ref to the native textarea and passes native props through", () => {
    const ref = createRef<HTMLTextAreaElement>();
    const onChange = mock();
    render(
      <TextArea ref={ref} aria-label="Description" name="description" rows={4} maxLength={255} onChange={onChange} />,
    );
    const textarea = screen.getByLabelText("Description") as HTMLTextAreaElement;

    expect(ref.current).toBe(textarea);
    expect(textarea.name).toBe("description");
    expect(textarea.rows).toBe(4);
    expect(textarea.maxLength).toBe(255);
    fireEvent.change(textarea, { target: { value: "Reviews from Q4" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ref.current?.value).toBe("Reviews from Q4");
  });

  it("defaults to three rows", () => {
    render(<TextArea aria-label="Notes" />);
    expect((screen.getByLabelText("Notes") as HTMLTextAreaElement).rows).toBe(3);
  });

  it("marks an invalid value", () => {
    render(<TextArea aria-label="Notes" invalid />);
    const textarea = screen.getByLabelText("Notes");

    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.closest("[data-invalid]")).not.toBeNull();
  });

  it("grows with its content when autosize is on, up to maxHeight", () => {
    render(<TextArea aria-label="Notes" autosize maxHeight={120} />);
    const textarea = screen.getByLabelText("Notes") as HTMLTextAreaElement;

    setScrollHeight(textarea, 90);
    fireEvent.change(textarea, { target: { value: "one\ntwo\nthree\nfour" } });
    expect(textarea.style.height).toBe("90px");

    setScrollHeight(textarea, 400);
    fireEvent.change(textarea, { target: { value: "a lot more text" } });
    expect(textarea.style.height).toBe("120px");
  });

  it("follows a controlled value when autosize is on", () => {
    const { rerender } = render(<TextArea aria-label="Notes" autosize value="short" onChange={() => {}} />);
    const textarea = screen.getByLabelText("Notes") as HTMLTextAreaElement;

    setScrollHeight(textarea, 70);
    rerender(<TextArea aria-label="Notes" autosize value={"longer\ntext"} onChange={() => {}} />);
    expect(textarea.style.height).toBe("70px");
  });

  it("does not resize itself when autosize is off", () => {
    render(<TextArea aria-label="Notes" />);
    const textarea = screen.getByLabelText("Notes") as HTMLTextAreaElement;

    setScrollHeight(textarea, 300);
    fireEvent.change(textarea, { target: { value: "text" } });
    expect(textarea.style.height).toBe("");
  });

  it("lets the user resize vertically by default, and never when resize is none", () => {
    const { container, rerender } = render(<TextArea aria-label="Notes" />);
    expect(container.firstElementChild?.getAttribute("data-resize")).toBe("vertical");
    rerender(<TextArea aria-label="Notes" resize="none" />);
    expect(container.firstElementChild?.getAttribute("data-resize")).toBe("none");
  });
});
