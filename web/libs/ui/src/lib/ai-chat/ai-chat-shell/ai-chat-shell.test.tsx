import { render, screen } from "@testing-library/react";
import { AiChatShell } from "./ai-chat-shell";

describe("AiChatShell", () => {
  it("composes header, body, and footer slots", () => {
    render(
      <AiChatShell header={<div>Tabs</div>} footer={<div>Composer</div>} data-testid="chat-shell">
        <div>Messages</div>
      </AiChatShell>,
    );
    expect(screen.getByText("Tabs")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Composer")).toBeInTheDocument();
  });

  it("renders emptyState when body has no children", () => {
    render(<AiChatShell emptyState={<div>Nothing here yet</div>} />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("prefers children over emptyState", () => {
    render(
      <AiChatShell emptyState={<div>Empty</div>}>
        <div>Has messages</div>
      </AiChatShell>,
    );
    expect(screen.getByText("Has messages")).toBeInTheDocument();
    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
  });

  it("accepts custom className", () => {
    render(<AiChatShell className="custom-shell" data-testid="chat-shell" />);
    expect(screen.getByTestId("chat-shell")).toHaveClass("custom-shell");
  });
});
