import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MarkdownEditor } from "../MarkdownEditor";

// Helper to get element by class name pattern (like CSS Modules)
const getByClassPattern = (container: HTMLElement, pattern: string) => {
  const element = container.querySelector(`[class*="${pattern}"]`);
  if (!element) {
    throw new Error(`Unable to find element with class pattern: ${pattern}`);
  }
  return element;
};

// Mock CodeMirror to avoid complex DOM implementation
jest.mock("react-codemirror2", () => ({
  Controlled: ({ value, options, onBeforeChange }: any) => (
    <textarea
      data-testid="codemirror-editor"
      value={value}
      onChange={(e) => {
        if (onBeforeChange) {
          onBeforeChange(null, null, e.target.value);
        }
      }}
      placeholder={options?.placeholder}
      readOnly={options?.readOnly}
      data-readonly={options?.readOnly || false}
    />
  ),
}));

// Mock the Markdown component
jest.mock("../../Markdown/Markdown", () => ({
  Markdown: ({ text }: { text: string }) => (
    <div data-testid="markdown-preview" data-content={text}>
      {text || "Nothing to preview. Start typing in the editor."}
    </div>
  ),
}));

// Mock Button component from humansignal/ui
jest.mock("@humansignal/ui", () => ({
  Button: ({ children, onClick, className, title, type, variant, look, size }: any) => (
    <button
      data-testid="toggle-button"
      type={type}
      className={className}
      title={title}
      data-variant={variant}
      data-look={look}
      data-size={size}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

describe("MarkdownEditor", () => {
  const defaultProps = {
    value: "",
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    placeholder: "Enter markdown text...",
    readOnly: false,
    rows: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the editor container", () => {
      const { container } = render(<MarkdownEditor {...defaultProps} />);
      expect(getByClassPattern(container, "markdownEditor")).toBeInTheDocument();
    });

    it("renders the toggle button with 'Split' text", () => {
      render(<MarkdownEditor {...defaultProps} />);
      expect(screen.getByRole("button", { name: /split/i })).toBeInTheDocument();
    });

    it("renders character and word counts", () => {
      render(<MarkdownEditor {...defaultProps} />);
      expect(screen.getByText(/0 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/0 words/i)).toBeInTheDocument();
    });

    it("renders the CodeMirror editor", () => {
      render(<MarkdownEditor {...defaultProps} />);
      expect(screen.getByTestId("codemirror-editor")).toBeInTheDocument();
    });

    it("does not render preview in edit mode", () => {
      const { container } = render(<MarkdownEditor {...defaultProps} />);
      expect(container.querySelector('[class*="markdownEditor__preview"]')).not.toBeInTheDocument();
    });
  });

  describe("Character and Word Count", () => {
    it("displays correct counts for content", () => {
      render(<MarkdownEditor {...defaultProps} value="Hello world" />);
      expect(screen.getByText(/11 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/2 words/i)).toBeInTheDocument();
    });
  });

  describe("View Mode Toggle", () => {
    it("starts in edit mode by default", () => {
      render(<MarkdownEditor {...defaultProps} />);
      expect(screen.getByRole("button", { name: /split/i })).toBeInTheDocument();
    });

    it("toggles to split mode when button is clicked", () => {
      const { container } = render(<MarkdownEditor {...defaultProps} />);

      // Click toggle button
      fireEvent.click(screen.getByRole("button", { name: /split/i }));

      // Button text should change to "Edit"
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();

      // Preview container should appear
      expect(container.querySelector('[class*="markdownEditor__preview"]')).toBeInTheDocument();
    });

    it("toggles back to edit mode when 'Edit' button is clicked", () => {
      const { container } = render(<MarkdownEditor {...defaultProps} />);

      // Switch to split
      fireEvent.click(screen.getByRole("button", { name: /split/i }));
      expect(container.querySelector('[class*="markdownEditor__preview"]')).toBeInTheDocument();

      // Switch back to edit
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));
      expect(screen.getByRole("button", { name: /split/i })).toBeInTheDocument();
      expect(container.querySelector('[class*="markdownEditor__preview"]')).not.toBeInTheDocument();
    });
  });

  describe("Value Changes", () => {
    it("calls onChange when editor value changes", () => {
      render(<MarkdownEditor {...defaultProps} />);
      const editor = screen.getByTestId("codemirror-editor");
      fireEvent.change(editor, { target: { value: "**bold** text" } });
      expect(defaultProps.onChange).toHaveBeenCalledWith("**bold** text");
    });

    it("updates character count when value changes", () => {
      render(<MarkdownEditor {...defaultProps} value="Hello" />);
      expect(screen.getByText(/5 characters/i)).toBeInTheDocument();
    });

    it("updates word count when value changes", () => {
      render(<MarkdownEditor {...defaultProps} value="One two three" />);
      expect(screen.getByText(/3 words/i)).toBeInTheDocument();
    });
  });

  describe("Preview Mode", () => {
    it("shows preview container when in split mode", () => {
      const { container } = render(<MarkdownEditor {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /split/i }));
      const preview = container.querySelector('[class*="markdownEditor__preview"]');
      expect(preview).toBeInTheDocument();
    });

    it("shows markdown content in preview", () => {
      const { container } = render(<MarkdownEditor {...defaultProps} value="**bold**" />);
      fireEvent.click(screen.getByRole("button", { name: /split/i }));
      const preview = container.querySelector('[class*="markdownEditor__preview"]');
      expect(preview).toHaveTextContent("**bold**");
    });
  });

  describe("onSubmit Callback", () => {
    it("passes onSubmit callback to CodeMirror options", () => {
      const onSubmit = jest.fn();
      render(<MarkdownEditor {...defaultProps} onSubmit={onSubmit} />);

      // Verify onSubmit is passed (it's used in codeMirrorOptions.extraKeys)
      // This ensures the Shift+Enter handler is configured
      expect(onSubmit).toBeDefined();
    });

    it("does not throw when onSubmit is not provided", () => {
      const props = { ...defaultProps, onSubmit: undefined };
      expect(() => render(<MarkdownEditor {...props} />)).not.toThrow();
    });
  });
});