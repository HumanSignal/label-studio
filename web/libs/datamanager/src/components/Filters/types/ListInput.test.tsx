import { fireEvent, render, screen } from "@testing-library/react";
import { ListInput, parseListInput } from "./ListInput";

describe("parseListInput", () => {
  it("splits on newlines, commas, semicolons, tabs, and spaces", () => {
    const { valid, invalid } = parseListInput("a\nb,c;d\te f", "string");
    expect(valid).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(invalid).toEqual([]);
  });

  it("trims surrounding whitespace", () => {
    const { valid } = parseListInput("  abc  ,  def  ", "string");
    expect(valid).toEqual(["abc", "def"]);
  });

  it("strips matching surrounding quotes", () => {
    const { valid } = parseListInput('"abc","def",\'ghi\'', "string");
    expect(valid).toEqual(["abc", "def", "ghi"]);
  });

  it("dedupes case-sensitively, preserving order", () => {
    const { valid } = parseListInput("a,b,a,c,B,b", "string");
    expect(valid).toEqual(["a", "b", "c", "B"]);
  });

  it("ignores empty tokens", () => {
    const { valid } = parseListInput(",,a,,b,", "string");
    expect(valid).toEqual(["a", "b"]);
  });

  it("coerces numeric tokens to numbers and reports invalid ones", () => {
    const { valid, invalid } = parseListInput("1\n2.5\nfoo\n3\nbar", "number");
    expect(valid).toEqual([1, 2.5, 3]);
    expect(invalid).toEqual(["foo", "bar"]);
  });

  it("dedupes numbers across textual duplicates (1 and '1' are the same)", () => {
    const { valid } = parseListInput("1, 1, 1.0, 2", "number");
    expect(valid).toEqual([1, 2]);
  });

  it("returns empty arrays for empty input", () => {
    expect(parseListInput("", "string")).toEqual({ valid: [], invalid: [] });
    expect(parseListInput("   \n   ", "string")).toEqual({ valid: [], invalid: [] });
  });
});

describe("ListInput component", () => {
  it("renders the textarea with joined value on mount", () => {
    const onChange = () => {};
    render(<ListInput value={[1, 2, 3]} onChange={onChange} type="number" />);
    const textarea = screen.getByTestId("list-input-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("1\n2\n3");
  });

  it("calls onChange with the parsed valid array when typing", () => {
    let captured: unknown = "untouched";
    const onChange = (v: unknown) => {
      captured = v;
    };
    render(<ListInput value={null} onChange={onChange} type="number" />);
    const textarea = screen.getByTestId("list-input-textarea");
    fireEvent.change(textarea, { target: { value: "1, 2, 3" } });
    expect(captured).toEqual([1, 2, 3]);
  });

  it("calls onChange with an empty array when input is cleared (never null)", () => {
    // Sending null would PATCH the view with value=null, which the FilterSerializer
    // rejects with 400 ("`in_list`/`not_in_list` require a JSON array.") — and the
    // nested error structure crashes Error.tsx. Empty array passes the BE syntax
    // check; isValidFilter then blocks the PATCH separately while the user composes.
    let captured: unknown = "untouched";
    const onChange = (v: unknown) => {
      captured = v;
    };
    render(<ListInput value={["a"]} onChange={onChange} type="string" />);
    const textarea = screen.getByTestId("list-input-textarea");
    fireEvent.change(textarea, { target: { value: "" } });
    expect(captured).toEqual([]);
  });

  it("calls onChange with [] when only invalid tokens are typed for Number type", () => {
    let captured: unknown = "untouched";
    const onChange = (v: unknown) => {
      captured = v;
    };
    render(<ListInput value={null} onChange={onChange} type="number" />);
    const textarea = screen.getByTestId("list-input-textarea");
    fireEvent.change(textarea, { target: { value: "foo, bar" } });
    expect(captured).toEqual([]);
  });

  it("shows valid count badge", () => {
    render(<ListInput value={[1, 2, 3]} onChange={() => {}} type="number" />);
    expect(screen.getByText("3 valid")).toBeInTheDocument();
  });

  it("shows invalid count badge for Number when input has garbage", () => {
    render(<ListInput value={null} onChange={() => {}} type="number" />);
    const textarea = screen.getByTestId("list-input-textarea");
    fireEvent.change(textarea, { target: { value: "1, foo, 2, bar" } });
    expect(screen.getByText("2 valid")).toBeInTheDocument();
    expect(screen.getByText("2 invalid")).toBeInTheDocument();
    expect(screen.getByTestId("list-input-invalid-tokens").textContent).toContain("foo");
    expect(screen.getByTestId("list-input-invalid-tokens").textContent).toContain("bar");
  });

  it("never shows invalid badge for String type", () => {
    render(<ListInput value={null} onChange={() => {}} type="string" />);
    const textarea = screen.getByTestId("list-input-textarea");
    fireEvent.change(textarea, { target: { value: "abc, def" } });
    expect(screen.queryByText(/invalid/)).toBeNull();
  });
});
