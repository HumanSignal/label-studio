import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Badge } from "./badge";

jest.mock("./badge.module.css", () => ({
  badge: "badge",
  label: "label",
  closeButton: "closeButton",
}));

describe("Badge close button", () => {
  it("names itself after plain text content", () => {
    render(<Badge onClose={() => {}}>Fluent</Badge>);

    expect(screen.getByRole("button", { name: "Remove Fluent" })).toBeInTheDocument();
  });

  it("prefers an explicit closeLabel when content is not plain text", () => {
    render(
      <Badge onClose={() => {}} closeLabel="Remove Web & Mobile Development">
        <span>Web & Mobile Development</span>
        <span>Expert</span>
      </Badge>,
    );

    expect(screen.getByRole("button", { name: "Remove Web & Mobile Development" })).toBeInTheDocument();
  });

  it("falls back to a generic name when content is not plain text", () => {
    render(
      <Badge onClose={() => {}}>
        <span>Composed content</span>
      </Badge>,
    );

    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("calls onClose without submitting a surrounding form", () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();

    render(
      <form onSubmit={onSubmit}>
        <Badge onClose={onClose}>Apple</Badge>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
