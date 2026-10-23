import { describe, expect, it, mock } from "bun:test";
import { createRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchInput } from "./search-input";
import { Command, CommandInput } from "../../shad/components/ui/command";

describe("SearchInput", () => {
  it("uses accessible placeholder contrast", async () => {
    const css = await Bun.file(new URL("./search-input.module.css", import.meta.url)).text();
    const placeholder = css.slice(css.indexOf(".input::placeholder"));
    expect(placeholder.slice(0, placeholder.indexOf("}"))).toContain("var(--color-neutral-content-subtle)");
  });
  it("forwards focus, input changes and keyboard events to a named search field", () => {
    const ref = createRef<HTMLInputElement>();
    const onKeyDown = mock();
    function Example() {
      const [value, setValue] = useState("");
      return (
        <SearchInput
          ref={ref}
          aria-label="Filter labels"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
      );
    }
    render(<Example />);
    const input = screen.getByRole("searchbox", { name: "Filter labels" });
    fireEvent.change(input, { target: { value: "Vehicle" } });
    expect(input).toHaveValue("Vehicle");
    ref.current?.focus();
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("supports labeled, disabled and read-only native input states", () => {
    const { rerender } = render(<SearchInput placeholder="Find a label" disabled />);
    expect(screen.getByRole("searchbox", { name: "Find a label" })).toBeDisabled();
    rerender(
      <>
        <label id="search-label">Search objects</label>
        <SearchInput aria-labelledby="search-label" value="Person" readOnly />
      </>,
    );
    const input = screen.getByRole("searchbox", { name: "Search objects" });
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveValue("Person");
  });

  it("does not inject native search defaults into a slotted input", () => {
    render(
      <>
        <span id="options-label">Options</span>
        <SearchInput asChild>
          <input aria-labelledby="options-label" />
        </SearchInput>
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Options" });
    expect(input).not.toHaveAttribute("aria-label");
    expect(input).not.toHaveAttribute("placeholder");
    expect(input).not.toHaveAttribute("type");
  });

  it("preserves the command wrapper and caller-provided input semantics", () => {
    render(
      <Command label="Find labels">
        <CommandInput placeholder="Filter labels" />
      </Command>,
    );
    const input = screen.getByRole("combobox", { name: "Find labels" });
    expect(input).toHaveAttribute("placeholder", "Filter labels");
    expect(input).not.toHaveAttribute("aria-label");
    expect(input).not.toHaveAttribute("type", "search");
    expect(input.parentElement).toHaveAttribute("data-slot", "command-input-wrapper");
  });

  it("composes with a specialized input without replacing its semantics or handlers", () => {
    const onChange = mock();
    const ref = createRef<HTMLInputElement>();
    render(
      <SearchInput asChild ref={ref}>
        <input role="combobox" aria-label="Find an option" aria-expanded={false} onChange={onChange} />
      </SearchInput>,
    );
    const input = screen.getByRole("combobox", { name: "Find an option" });
    fireEvent.change(input, { target: { value: "Car" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ref.current).toBe(input);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
