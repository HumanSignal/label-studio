import { render, screen, fireEvent } from "@testing-library/react";
import { AiChatThinking } from "./ai-chat-thinking";

const steps = [{ primary: "Reading briefs" }, { primary: "Comparing notes", secondary: "6 items" }];

describe("AiChatThinking", () => {
  it("renders loading label when status is loading", () => {
    render(<AiChatThinking status="loading" label="Thinking" steps={steps} defaultExpanded />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("renders completed label when status is complete", () => {
    render(<AiChatThinking status="complete" label="Thinking" completedLabel="Thought for 4 seconds" steps={steps} />);
    expect(screen.getByText("Thought for 4 seconds")).toBeInTheDocument();
  });

  it("shows steps when expanded", () => {
    render(<AiChatThinking status="loading" label="Thinking" steps={steps} defaultExpanded />);
    expect(screen.getByText("Reading briefs")).toBeInTheDocument();
    expect(screen.getByText("Comparing notes")).toBeInTheDocument();
    expect(screen.getByText("6 items")).toBeInTheDocument();
  });

  it("toggles expanded state on header click", () => {
    render(<AiChatThinking status="loading" label="Thinking" steps={steps} defaultExpanded={false} />);
    expect(screen.queryByText("Reading briefs")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Thinking/i }));
    expect(screen.getByText("Reading briefs")).toBeInTheDocument();
  });

  it("renders idle state without steps visible by default", () => {
    render(<AiChatThinking status="idle" label="Ready" steps={steps} />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText("Reading briefs")).not.toBeInTheDocument();
  });

  it("renders a dots loading icon while status is loading", () => {
    render(<AiChatThinking status="loading" label="Building your interface..." />);
    expect(screen.getByTestId("ai-chat-loading-icon")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-loading-icon")).toHaveAttribute("data-variant", "dots");
  });

  it("does not show the dots loading icon when idle", () => {
    render(<AiChatThinking status="idle" label="Ready" />);
    expect(screen.queryByTestId("ai-chat-loading-icon")).not.toBeInTheDocument();
  });
});
