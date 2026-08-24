import { fireEvent, render, screen } from "@testing-library/react";
import { AiChatPromptBar } from "./ai-chat-prompt-bar";

describe("AiChatPromptBar", () => {
  it("renders placeholder and submit control when idle", () => {
    render(<AiChatPromptBar placeholder="Ask anything…" />);
    expect(screen.getByPlaceholderText("Ask anything…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send/i })).toBeInTheDocument();
  });

  it("submits current value on send click and Enter without Shift", () => {
    const onSubmit = jest.fn();
    render(<AiChatPromptBar value="Hello agent" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));
    expect(onSubmit).toHaveBeenCalledWith("Hello agent");

    onSubmit.mockClear();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith("Hello agent");
  });

  it("does not submit on Shift+Enter", () => {
    const onSubmit = jest.fn();
    render(<AiChatPromptBar value="Line" onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows stop affordance while streaming and calls onStop", () => {
    const onStop = jest.fn();
    render(<AiChatPromptBar status="streaming" onStop={onStop} stopLabel="Stop" />);
    expect(screen.queryByRole("button", { name: /Send/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Stop/i }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("renders leading, trailing, and planToggle slots", () => {
    render(
      <AiChatPromptBar
        leadingSlot={<button type="button">Attach</button>}
        trailingSlot={<span>Model</span>}
        planToggleSlot={<button type="button">Plan</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Attach" })).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
  });

  it("places the Plan toggle in the trailing cluster before other trailing chrome", () => {
    render(
      <AiChatPromptBar
        leadingSlot={<button type="button">Attach</button>}
        trailingSlot={<button type="button">Mic</button>}
        planToggleSlot={<button type="button">Plan</button>}
        showPrimaryAction={false}
      />,
    );
    const attach = screen.getByRole("button", { name: "Attach" });
    const plan = screen.getByRole("button", { name: "Plan" });
    const mic = screen.getByRole("button", { name: "Mic" });
    expect(attach.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(plan.compareDocumentPosition(mic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(attach.parentElement).not.toBe(plan.parentElement);
  });

  it("notifies onValueChange for controlled typing", () => {
    const onValueChange = jest.fn();
    render(<AiChatPromptBar value="" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hi" } });
    expect(onValueChange).toHaveBeenCalledWith("Hi");
  });

  it("applies shape data attribute", () => {
    render(<AiChatPromptBar shape="pill" data-testid="prompt-bar" />);
    expect(screen.getByTestId("prompt-bar")).toHaveAttribute("data-shape", "pill");
  });

  it("defaults to stacked layout and supports inline", () => {
    const { rerender } = render(<AiChatPromptBar data-testid="prompt-bar" />);
    expect(screen.getByTestId("prompt-bar")).toHaveAttribute("data-layout", "stacked");
    rerender(<AiChatPromptBar layout="inline" data-testid="prompt-bar" />);
    expect(screen.getByTestId("prompt-bar")).toHaveAttribute("data-layout", "inline");
  });
});
