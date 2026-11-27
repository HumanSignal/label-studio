import { describe, expect, it, mock } from "bun:test";
import { createRef, useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("forwards its ref to the native input, so a form can read the value from the DOM", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} name="title" defaultValue="Sentiment" aria-label="Title" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.name).toBe("title");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Sentiment v2" } });
    expect(ref.current?.value).toBe("Sentiment v2");
  });

  it("passes native props and events through, the way a form library's register() spreads them", () => {
    const onChange = mock();
    const onBlur = mock();
    render(
      <Input
        aria-label="Email"
        name="email"
        type="email"
        placeholder="name@example.com"
        maxLength={50}
        onChange={onChange}
        onBlur={onBlur}
      />,
    );
    const input = screen.getByLabelText("Email") as HTMLInputElement;

    expect(input.type).toBe("email");
    expect(input.placeholder).toBe("name@example.com");
    expect(input.maxLength).toBe(50);
    fireEvent.change(input, { target: { value: "a@b.co" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as { target: HTMLInputElement }).target.value).toBe("a@b.co");
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("works controlled", () => {
    function Controlled() {
      const [value, setValue] = useState("Model");
      return <Input aria-label="Name" value={value} onChange={(event) => setValue(event.target.value.toUpperCase())} />;
    }
    render(<Controlled />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "model v2" } });
    expect(input.value).toBe("MODEL V2");
  });

  it("marks an invalid value for assistive technology and for styling", () => {
    render(<Input aria-label="URL" invalid />);
    const input = screen.getByLabelText("URL");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.closest("[data-invalid]")).not.toBeNull();
  });

  it("does not set aria-invalid when the value is valid", () => {
    render(<Input aria-label="URL" />);
    expect(screen.getByLabelText("URL").hasAttribute("aria-invalid")).toBe(false);
  });

  it("renders leading and trailing content beside the field", () => {
    render(<Input aria-label="Threshold" leading={<span>https://</span>} trailing={<span>%</span>} />);

    expect(screen.getByText("https://")).toBeTruthy();
    expect(screen.getByText("%")).toBeTruthy();
  });

  it("applies the size to the field", () => {
    const { container, rerender } = render(<Input aria-label="Size" />);
    expect(container.firstElementChild?.getAttribute("data-size")).toBe("medium");
    rerender(<Input aria-label="Size" size="smaller" />);
    expect(container.firstElementChild?.getAttribute("data-size")).toBe("smaller");
  });

  describe("clearable", () => {
    it("clears an uncontrolled value, fires onChange with an empty value and keeps focus in the field", () => {
      const onChange = mock();
      render(<Input aria-label="Search" defaultValue="annotator" clearable onChange={onChange} />);
      const input = screen.getByLabelText("Search") as HTMLInputElement;

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));

      expect(input.value).toBe("");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as { target: HTMLInputElement }).target.value).toBe("");
      expect(document.activeElement).toBe(input);
    });

    it("clears a controlled value through its onChange", () => {
      function Controlled() {
        const [value, setValue] = useState("annotator");
        return <Input aria-label="Search" clearable value={value} onChange={(event) => setValue(event.target.value)} />;
      }
      render(<Controlled />);

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      expect((screen.getByLabelText("Search") as HTMLInputElement).value).toBe("");
    });

    it("hides the clear button when there is nothing to clear, or the field cannot change", () => {
      const { rerender } = render(<Input aria-label="Search" clearable defaultValue="" />);
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();

      rerender(<Input aria-label="Search" clearable value="annotator" disabled onChange={() => {}} />);
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();

      rerender(<Input aria-label="Search" clearable value="annotator" readOnly />);
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    });

    it("shows the clear button once the user types into an empty uncontrolled field", () => {
      render(<Input aria-label="Search" clearable />);
      fireEvent.change(screen.getByLabelText("Search"), { target: { value: "a" } });
      expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
    });
  });

  describe("revealable", () => {
    it("shows and hides a password", () => {
      render(<Input aria-label="Password" type="password" revealable defaultValue="hunter2" />);
      const input = screen.getByLabelText("Password") as HTMLInputElement;
      const toggle = screen.getByRole("button", { name: "Show password" });

      expect(input.type).toBe("password");
      expect(toggle.getAttribute("aria-pressed")).toBe("false");
      fireEvent.click(toggle);
      expect(input.type).toBe("text");
      expect(screen.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("copyable", () => {
    it("copies the current value and confirms it", async () => {
      const writeText = mock(async () => {});
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      render(<Input aria-label="ACS URL" readOnly copyable value="https://app.example.com/sso/acs" />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      });

      expect(writeText).toHaveBeenCalledWith("https://app.example.com/sso/acs");
      await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy());
    });
  });

  describe("focus outline", () => {
    it("draws the keyboard outline after keyboard focus, and not after a click", () => {
      const { container } = render(<Input aria-label="Name" />);
      const root = container.firstElementChild as HTMLElement;
      const input = screen.getByLabelText("Name");

      fireEvent.pointerDown(input);
      fireEvent.focus(input);
      expect(root.hasAttribute("data-focus-visible")).toBe(false);

      fireEvent.blur(input);
      fireEvent.focus(input);
      expect(root.hasAttribute("data-focus-visible")).toBe(true);

      fireEvent.blur(input);
      expect(root.hasAttribute("data-focus-visible")).toBe(false);
    });
  });
});
