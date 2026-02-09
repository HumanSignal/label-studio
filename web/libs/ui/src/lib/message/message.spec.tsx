import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Message, type MessageProps } from "./message";
import { IconUpload } from "@humansignal/icons";

// Mock the styles since they're SCSS modules
jest.mock("./message.module.scss", () => ({
  base: "base",
  // Size classes
  "size-medium": "size-medium",
  "size-small": "size-small",
  // Variant classes
  "variant-primary": "variant-primary",
  "variant-neutral": "variant-neutral",
  "variant-negative": "variant-negative",
  "variant-positive": "variant-positive",
  "variant-warning": "variant-warning",
  // Element classes
  icon: "icon",
  content: "content",
  title: "title",
  body: "body",
  close: "close",
}));

const defaultProps: MessageProps = {
  children: "Test message content",
};

describe("Message Component", () => {
  it("renders with basic props", () => {
    render(<Message {...defaultProps} />);

    expect(screen.getByText("Test message content")).toBeInTheDocument();
  });

  it("applies correct variant classes", () => {
    const { rerender } = render(<Message {...defaultProps} variant="primary" data-testid="message" />);

    expect(screen.getByTestId("message")).toHaveClass("variant-primary");

    rerender(<Message {...defaultProps} variant="neutral" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-neutral");

    rerender(<Message {...defaultProps} variant="negative" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-negative");

    rerender(<Message {...defaultProps} variant="positive" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-positive");

    rerender(<Message {...defaultProps} variant="warning" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-warning");
  });

  it("defaults to primary variant", () => {
    render(<Message {...defaultProps} data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-primary");
  });

  it("applies correct size classes", () => {
    const { rerender } = render(<Message {...defaultProps} size="medium" data-testid="message" />);

    expect(screen.getByTestId("message")).toHaveClass("size-medium");

    rerender(<Message {...defaultProps} size="small" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("size-small");
  });

  it("defaults to medium size", () => {
    render(<Message {...defaultProps} data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("size-medium");
  });

  it("normalizes variant aliases to primary variants", () => {
    const { rerender } = render(<Message {...defaultProps} variant="info" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-primary");

    rerender(<Message {...defaultProps} variant="error" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-negative");

    rerender(<Message {...defaultProps} variant="success" data-testid="message" />);
    expect(screen.getByTestId("message")).toHaveClass("variant-positive");
  });

  it("renders custom icon", () => {
    render(<Message {...defaultProps} icon={<IconUpload data-testid="custom-icon" />} />);

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders default icon when not provided", () => {
    render(<Message {...defaultProps} variant="primary" />);

    // Default icon should be rendered (IconInfoOutline for primary)
    const iconContainer = screen.getByRole("alert").querySelector(".icon");
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer?.querySelector("svg")).toBeInTheDocument();
  });

  it("renders icon with correct size", () => {
    render(<Message {...defaultProps} icon={<IconUpload data-testid="icon" />} />);

    const icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("width", "24");
    expect(icon).toHaveAttribute("height", "24");
  });

  it("renders icon with custom size", () => {
    render(<Message {...defaultProps} icon={<IconUpload data-testid="icon" />} iconSize={32} />);

    const icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("width", "32");
    expect(icon).toHaveAttribute("height", "32");
  });

  it("uses default icon size based on size prop", () => {
    const { rerender } = render(<Message {...defaultProps} size="medium" icon={<IconUpload data-testid="icon" />} />);

    let icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("width", "24");
    expect(icon).toHaveAttribute("height", "24");

    rerender(<Message {...defaultProps} size="small" icon={<IconUpload data-testid="icon" />} />);
    icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("width", "20");
    expect(icon).toHaveAttribute("height", "20");
  });

  it("renders title when provided", () => {
    render(<Message {...defaultProps} title="Test Title" />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("renders title as ReactNode with rich content", () => {
    render(
      <Message
        {...defaultProps}
        title={
          <>
            This is a <strong>bold</strong> title
          </>
        }
      />,
    );

    expect(screen.getByText("bold")).toBeInTheDocument();
    const boldElement = screen.getByText("bold");
    expect(boldElement.tagName).toBe("STRONG");

    // Verify the full title text is present
    const titleElement = screen.getByText((content, element) => {
      return element?.textContent === "This is a bold title";
    });
    expect(titleElement).toBeInTheDocument();
  });

  it("does not render title when not provided", () => {
    render(<Message {...defaultProps} />);

    const titleElement = screen.queryByText("Test Title");
    expect(titleElement).not.toBeInTheDocument();
  });

  it("renders children content", () => {
    render(<Message {...defaultProps}>Custom content here</Message>);

    expect(screen.getByText("Custom content here")).toBeInTheDocument();
  });

  it("renders close button when closable is true", () => {
    render(<Message {...defaultProps} closable />);

    expect(screen.getByTestId("message-dismiss-button")).toBeInTheDocument();
  });

  it("does not render close button when closable is false", () => {
    render(<Message {...defaultProps} closable={false} />);

    expect(screen.queryByTestId("message-dismiss-button")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<Message {...defaultProps} closable onClose={onClose} />);

    const closeButton = screen.getByTestId("message-dismiss-button");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    render(<Message {...defaultProps} className="custom-class" data-testid="message" />);

    expect(screen.getByTestId("message")).toHaveClass("custom-class");
  });

  it("sets proper ARIA attributes", () => {
    render(<Message {...defaultProps} title="Test Title" aria-label="Custom aria label" data-testid="message" />);

    const message = screen.getByTestId("message");
    expect(message).toHaveAttribute("role", "alert");
    expect(message).toHaveAttribute("aria-live", "polite");
    expect(message).toHaveAttribute("aria-label", "Custom aria label");
  });

  it("generates unique IDs for title and content", () => {
    render(<Message {...defaultProps} title="Test Title" data-testid="message" />);

    const title = screen.getByText("Test Title");
    const message = screen.getByTestId("message");

    expect(title).toHaveAttribute("id");

    // Get the content wrapper by class
    const contentWrapper = message.querySelector(".message__body");
    expect(contentWrapper).toHaveAttribute("id");

    // IDs should be different
    const titleId = title.getAttribute("id");
    const contentId = contentWrapper?.getAttribute("id");
    expect(titleId).not.toBe(contentId);
  });

  it("uses aria-labelledby when title is provided and aria-label is not", () => {
    render(<Message {...defaultProps} title="Test Title" data-testid="message" />);

    const message = screen.getByTestId("message");
    const title = screen.getByText("Test Title");

    expect(message).toHaveAttribute("aria-labelledby", title.getAttribute("id"));
    expect(message).not.toHaveAttribute("aria-label");
  });

  it("uses aria-describedby for content", () => {
    render(<Message {...defaultProps} data-testid="message" />);

    const message = screen.getByTestId("message");

    // Get the content wrapper by class
    const contentWrapper = message.querySelector(".message__body");
    const contentId = contentWrapper?.getAttribute("id");

    expect(contentId).toBeTruthy();
    expect(message).toHaveAttribute("aria-describedby", contentId);
  });

  it("forwards ref correctly", () => {
    const ref = { current: null };
    render(<Message {...defaultProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional HTML attributes", () => {
    render(<Message {...defaultProps} data-testid="message" tabIndex={0} />);

    const message = screen.getByTestId("message");
    expect(message).toHaveAttribute("tabIndex", "0");
  });

  it("renders with all features combined", () => {
    const onClose = jest.fn();
    render(
      <Message
        variant="warning"
        title="Warning Title"
        icon={<IconUpload data-testid="icon" />}
        closable
        onClose={onClose}
        data-testid="message"
      >
        Warning content
      </Message>,
    );

    expect(screen.getByTestId("message")).toHaveClass("variant-warning");
    expect(screen.getByText("Warning Title")).toBeInTheDocument();
    expect(screen.getByText("Warning content")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByTestId("message-dismiss-button")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("message-dismiss-button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles complex children content", () => {
    render(
      <Message {...defaultProps}>
        <div>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </div>
      </Message>,
    );

    expect(screen.getByText("First paragraph")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });

  it("applies correct ARIA role and live region", () => {
    render(<Message {...defaultProps} data-testid="message" />);

    const message = screen.getByTestId("message");
    expect(message).toHaveAttribute("role", "alert");
    expect(message).toHaveAttribute("aria-live", "polite");
  });
});
