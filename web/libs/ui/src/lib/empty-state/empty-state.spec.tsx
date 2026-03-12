import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EmptyState, type EmptyStateProps } from "./empty-state";
import { IconInbox } from "@humansignal/icons";
import { Button } from "../button/button";

// Mock the styles since they're SCSS modules
jest.mock("./empty-state.module.css", () => ({
  base: "base",
  // Size classes
  "size-large": "size-large",
  "size-medium": "size-medium",
  "size-small": "size-small",
  // Variant classes
  "variant-primary": "variant-primary",
  "variant-neutral": "variant-neutral",
  "variant-negative": "variant-negative",
  "variant-positive": "variant-positive",
  "variant-warning": "variant-warning",
  "variant-gradient": "variant-gradient",
  // Element classes
  icon: "icon",
  title: "title",
  description: "description",
  additional: "additional",
  actions: "actions",
  footer: "footer",
  "text-wrapper": "text-wrapper",
  "actions-large": "actions-large",
  "actions-medium": "actions-medium",
  "actions-small": "actions-small",
}));

const defaultProps: EmptyStateProps = {
  icon: <IconInbox data-testid="test-icon" />,
  title: "Test Title",
  description: "Test Description",
};

describe("EmptyState Component", () => {
  it("renders with basic props", () => {
    render(<EmptyState {...defaultProps} />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("applies correct size classes", () => {
    const { rerender } = render(<EmptyState {...defaultProps} size="large" data-testid="empty-state" />);

    expect(screen.getByTestId("empty-state")).toHaveClass("size-large");

    rerender(<EmptyState {...defaultProps} size="medium" data-testid="empty-state" />);
    expect(screen.getByTestId("empty-state")).toHaveClass("size-medium");

    rerender(<EmptyState {...defaultProps} size="small" data-testid="empty-state" />);
    expect(screen.getByTestId("empty-state")).toHaveClass("size-small");
  });

  it("applies correct variant classes", () => {
    const { rerender } = render(<EmptyState {...defaultProps} variant="primary" data-testid="empty-state" />);

    expect(screen.getByTestId("empty-state")).toHaveClass("variant-primary");

    rerender(<EmptyState {...defaultProps} variant="gradient" data-testid="empty-state" />);
    expect(screen.getByTestId("empty-state")).toHaveClass("variant-gradient");

    rerender(<EmptyState {...defaultProps} variant="warning" data-testid="empty-state" />);
    expect(screen.getByTestId("empty-state")).toHaveClass("variant-warning");

    rerender(<EmptyState {...defaultProps} variant="negative" data-testid="empty-state" />);
    expect(screen.getByTestId("empty-state")).toHaveClass("variant-negative");
  });

  it("defaults to medium size and primary variant", () => {
    render(<EmptyState {...defaultProps} data-testid="empty-state" />);
    expect(screen.getByTestId("empty-state")).toHaveClass("size-medium");
    expect(screen.getByTestId("empty-state")).toHaveClass("variant-primary");
  });

  it("renders icon with correct size based on size prop", () => {
    const { rerender } = render(<EmptyState {...defaultProps} size="large" />);

    let icon = screen.getByTestId("test-icon");
    expect(icon).toHaveAttribute("width", "40");
    expect(icon).toHaveAttribute("height", "40");

    rerender(<EmptyState {...defaultProps} size="medium" />);
    icon = screen.getByTestId("test-icon");
    expect(icon).toHaveAttribute("width", "32");
    expect(icon).toHaveAttribute("height", "32");

    rerender(<EmptyState {...defaultProps} size="small" />);
    icon = screen.getByTestId("test-icon");
    expect(icon).toHaveAttribute("width", "24");
    expect(icon).toHaveAttribute("height", "24");
  });

  it("applies variant-based icon styling", () => {
    const { rerender } = render(<EmptyState {...defaultProps} variant="gradient" data-testid="empty-state" />);

    expect(screen.getByTestId("empty-state")).toHaveClass("variant-gradient");

    rerender(<EmptyState {...defaultProps} variant="warning" data-testid="empty-state" />);

    expect(screen.getByTestId("empty-state")).toHaveClass("variant-warning");

    rerender(<EmptyState {...defaultProps} variant="negative" data-testid="empty-state" />);

    expect(screen.getByTestId("empty-state")).toHaveClass("variant-negative");
  });

  it("renders single action with center alignment", () => {
    render(<EmptyState {...defaultProps} actions={<Button data-testid="single-action">Single Action</Button>} />);

    const actionContainer = screen.getByTestId("single-action").parentElement;
    expect(actionContainer).toHaveClass("justify-center");
  });

  it("renders multiple actions with default alignment", () => {
    render(
      <EmptyState
        {...defaultProps}
        actions={
          <>
            <Button data-testid="action-1">Action 1</Button>
            <Button data-testid="action-2">Action 2</Button>
          </>
        }
      />,
    );

    const actionContainer = screen.getByTestId("action-1").parentElement;
    expect(actionContainer).toHaveClass("flex", "gap-base", "w-full");
  });

  it("renders additional content", () => {
    render(
      <EmptyState
        {...defaultProps}
        additionalContent={<div data-testid="additional-content">Additional Content</div>}
      />,
    );

    expect(screen.getByTestId("additional-content")).toBeInTheDocument();
    expect(screen.getByText("Additional Content")).toBeInTheDocument();
  });

  it("renders footer content", () => {
    render(<EmptyState {...defaultProps} footer={<div data-testid="footer-content">Footer Content</div>} />);

    expect(screen.getByTestId("footer-content")).toBeInTheDocument();
    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<EmptyState {...defaultProps} className="custom-class" data-testid="empty-state" />);

    expect(screen.getByTestId("empty-state")).toHaveClass("custom-class");
  });

  it("sets proper ARIA attributes", () => {
    render(
      <EmptyState
        {...defaultProps}
        titleId="custom-title-id"
        descriptionId="custom-desc-id"
        aria-label="Custom aria label"
        data-testid="empty-state"
      />,
    );

    const emptyState = screen.getByTestId("empty-state");
    const title = screen.getByText("Test Title");
    const description = screen.getByText("Test Description");

    expect(emptyState).toHaveAttribute("aria-label", "Custom aria label");
    expect(title).toHaveAttribute("id", "custom-title-id");
    expect(description).toHaveAttribute("id", "custom-desc-id");
  });

  it("generates unique IDs when not provided", () => {
    render(<EmptyState {...defaultProps} />);

    const title = screen.getByText("Test Title");
    const description = screen.getByText("Test Description");

    expect(title).toHaveAttribute("id");
    expect(description).toHaveAttribute("id");

    // IDs should be different
    const titleId = title.getAttribute("id");
    const descriptionId = description.getAttribute("id");
    expect(titleId).not.toBe(descriptionId);
  });

  it("uses aria-labelledby when aria-label is not provided", () => {
    render(<EmptyState {...defaultProps} data-testid="empty-state" />);

    const emptyState = screen.getByTestId("empty-state");
    const title = screen.getByText("Test Title");

    expect(emptyState).toHaveAttribute("aria-labelledby", title.getAttribute("id"));
    expect(emptyState).not.toHaveAttribute("aria-label");
  });

  it("filters null/false values from actions", () => {
    render(
      <EmptyState
        {...defaultProps}
        actions={
          <>
            <Button data-testid="visible-action">Visible Action</Button>
            {false && <Button>Hidden Action 1</Button>}
            {null}
            <Button data-testid="another-visible-action">Another Visible Action</Button>
          </>
        }
      />,
    );

    expect(screen.getByTestId("visible-action")).toBeInTheDocument();
    expect(screen.getByTestId("another-visible-action")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Action 1")).not.toBeInTheDocument();

    // Should treat it as multiple actions (not single)
    const actionContainer = screen.getByTestId("visible-action").parentElement;
    expect(actionContainer).toHaveClass("flex", "gap-base", "w-full");
  });

  it("handles different typography variants based on size", () => {
    const { rerender } = render(<EmptyState {...defaultProps} size="large" />);

    let title = screen.getByText("Test Title");
    expect(title.tagName.toLowerCase()).toBe("h2"); // headline medium maps to h2

    rerender(<EmptyState {...defaultProps} size="medium" />);
    title = screen.getByText("Test Title");
    expect(title.tagName.toLowerCase()).toBe("h2"); // headline small maps to h2

    rerender(<EmptyState {...defaultProps} size="small" />);
    title = screen.getByText("Test Title");
    expect(title.tagName.toLowerCase()).toBe("p"); // body medium maps to p
  });

  it("forwards ref correctly", () => {
    const ref = { current: null };
    render(<EmptyState {...defaultProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional HTML attributes", () => {
    render(<EmptyState {...defaultProps} data-testid="empty-state" role="region" tabIndex={0} />);

    const emptyState = screen.getByTestId("empty-state");
    expect(emptyState).toHaveAttribute("role", "region");
    expect(emptyState).toHaveAttribute("tabIndex", "0");
  });
});
