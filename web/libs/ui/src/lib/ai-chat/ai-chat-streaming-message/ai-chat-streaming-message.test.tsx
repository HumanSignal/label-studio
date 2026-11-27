import { render, screen } from "@testing-library/react";
import { AiChatStreamingMessage } from "./ai-chat-streaming-message";

describe("AiChatStreamingMessage", () => {
  it("renders idle content without cursor", () => {
    render(<AiChatStreamingMessage status="idle" content="Hello world" data-testid="streaming-message" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-chat-streaming-cursor")).not.toBeInTheDocument();
  });

  it("shows streaming cursor while streaming", () => {
    render(<AiChatStreamingMessage status="streaming" content="Partial answer" />);
    expect(screen.getByText("Partial answer")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-streaming-cursor")).toBeInTheDocument();
  });

  it("hides cursor when complete", () => {
    render(<AiChatStreamingMessage status="complete" content="Done" />);
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-chat-streaming-cursor")).not.toBeInTheDocument();
  });

  it("renders sources, actions, and follow-ups slots", () => {
    render(
      <AiChatStreamingMessage
        status="complete"
        content="Answer"
        sources={<span>3 sources</span>}
        actions={<button type="button">Copy</button>}
        followUps={<button type="button">Ask more</button>}
      />,
    );
    expect(screen.getByText("3 sources")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask more" })).toBeInTheDocument();
  });

  it("prefers children over content string", () => {
    render(
      <AiChatStreamingMessage status="complete" content="ignored">
        <strong>Rich content</strong>
      </AiChatStreamingMessage>,
    );
    expect(screen.getByText("Rich content")).toBeInTheDocument();
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });
});
