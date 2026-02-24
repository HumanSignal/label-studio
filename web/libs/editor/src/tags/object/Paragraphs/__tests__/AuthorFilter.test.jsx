import { render } from "@testing-library/react";
import { AuthorFilter } from "../AuthorFilter";

jest.mock("@humansignal/ui", () => ({
  Select: function MockSelect({ options, placeholder, onChange }) {
    return (
      <div data-testid="author-filter-select">
        {placeholder}
        {options?.length > 0 && (
          <ul>
            {options.map((opt, i) => (
              <li key={i}>
                <button type="button" data-value={opt.value} onClick={() => onChange?.(opt.value)}>
                  {opt.value}
                </button>
                {opt.children?.map((c, j) => (
                  <button key={j} type="button" data-value={c.value} onClick={() => onChange?.(c.value)}>
                    {c.value}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
}));

describe("AuthorFilter", () => {
  it("renders with empty value and all option", () => {
    const item = {
      _value: [],
      namekey: "author",
      setAuthorFilter: jest.fn(),
    };
    const { getByTestId } = render(<AuthorFilter item={item} />);
    expect(getByTestId("author-filter-select")).toBeInTheDocument();
  });

  it("renders options from item._value", () => {
    const item = {
      _value: [{ author: "Alice" }, { author: "Bob" }],
      namekey: "author",
      setAuthorFilter: jest.fn(),
    };
    const { getByText } = render(<AuthorFilter item={item} />);
    expect(getByText("all")).toBeInTheDocument();
  });

  it("calls setAuthorFilter with empty array when all is selected", () => {
    const setAuthorFilter = jest.fn();
    const item = {
      _value: [{ author: "Alice" }],
      namekey: "author",
      setAuthorFilter,
    };
    const { getByText } = render(<AuthorFilter item={item} />);
    getByText("all").click();
    expect(setAuthorFilter).toHaveBeenCalledWith([]);
  });

  it("calls setAuthorFilter with value when author is selected", () => {
    const setAuthorFilter = jest.fn();
    const item = {
      _value: [{ author: "Alice" }],
      namekey: "author",
      setAuthorFilter,
    };
    const { getByText } = render(<AuthorFilter item={item} />);
    const aliceBtn = getByText("Alice");
    aliceBtn.click();
    expect(setAuthorFilter).toHaveBeenCalledWith("Alice");
  });

  it("calls onChange when provided", () => {
    const onChange = jest.fn();
    const item = {
      _value: [{ author: "Alice" }],
      namekey: "author",
      setAuthorFilter: jest.fn(),
    };
    const { getByText } = render(<AuthorFilter item={item} onChange={onChange} />);
    getByText("all").click();
    expect(onChange).toHaveBeenCalled();
  });
});
