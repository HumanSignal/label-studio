import { render, screen } from "@testing-library/react";
import { AiChatLoading, AiChatLoadingIcon } from "./ai-chat-loading";

describe("AiChatLoading", () => {
  it("renders idle label without elapsed when showElapsed is false", () => {
    render(<AiChatLoading label="Preparing" showElapsed={false} />);
    expect(screen.getByRole("status", { name: /Preparing/i })).toBeInTheDocument();
    expect(screen.queryByText(/s$/)).not.toBeInTheDocument();
  });

  it("renders controlled elapsed text", () => {
    render(<AiChatLoading label="Churning" elapsed="1.2s" />);
    expect(screen.getByRole("status")).toHaveAccessibleName(/Churning.*1\.2s/i);
    expect(screen.getByText("1.2s")).toBeInTheDocument();
  });

  it("applies variant class for dots pattern", () => {
    render(<AiChatLoading label="Loading" variant="dots" data-testid="ai-chat-loading" />);
    const root = screen.getByTestId("ai-chat-loading");
    expect(root.querySelector("[data-variant='dots']")).toBeInTheDocument();
  });

  it("accepts custom className", () => {
    render(<AiChatLoading label="Loading" className="custom-loading" data-testid="ai-chat-loading" />);
    expect(screen.getByTestId("ai-chat-loading")).toHaveClass("custom-loading");
  });
});

describe("AiChatLoadingIcon", () => {
  it("defaults to the dots variant for highwater rows", () => {
    render(<AiChatLoadingIcon />);
    expect(screen.getByTestId("ai-chat-loading-icon")).toHaveAttribute("data-variant", "dots");
  });
});
