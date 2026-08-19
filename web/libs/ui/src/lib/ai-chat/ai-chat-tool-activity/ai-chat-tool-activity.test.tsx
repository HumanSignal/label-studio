import { render, screen, fireEvent } from "@testing-library/react";
import { AiChatToolActivity } from "./ai-chat-tool-activity";

const items = [
  { id: "1", label: "Read flavors.ts", detail: "flavors.ts", status: "completed" as const },
  { id: "2", label: "Edit schedule", detail: "schedule.tsx", status: "running" as const },
  { id: "3", label: "Draft email", status: "failed" as const },
];

describe("AiChatToolActivity", () => {
  it("renders summary and collapses items by default", () => {
    render(<AiChatToolActivity summary="2 tool calls, 1 message" items={items} />);
    expect(screen.getByRole("button", { name: /2 tool calls, 1 message/i })).toBeInTheDocument();
    expect(screen.queryByText("Read flavors.ts")).not.toBeInTheDocument();
  });

  it("expands to show activity items", () => {
    render(<AiChatToolActivity summary="2 tool calls" items={items} defaultExpanded />);
    expect(screen.getByText("Read flavors.ts")).toBeInTheDocument();
    expect(screen.getByText("Edit schedule")).toBeInTheDocument();
    expect(screen.getByText("Draft email")).toBeInTheDocument();
  });

  it("toggles expansion from the summary button", () => {
    render(<AiChatToolActivity summary="Tools" items={items} defaultExpanded={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Tools/i }));
    expect(screen.getByText("Read flavors.ts")).toBeInTheDocument();
  });

  it("exposes status on each item for styling and a11y", () => {
    render(<AiChatToolActivity summary="Tools" items={items} defaultExpanded />);
    expect(screen.getByTestId("ai-chat-tool-item-1")).toHaveAttribute("data-status", "completed");
    expect(screen.getByTestId("ai-chat-tool-item-2")).toHaveAttribute("data-status", "running");
    expect(screen.getByTestId("ai-chat-tool-item-3")).toHaveAttribute("data-status", "failed");
  });

  it("renders children slot instead of items when provided", () => {
    render(
      <AiChatToolActivity summary="Custom" defaultExpanded>
        <div>Custom activity body</div>
      </AiChatToolActivity>,
    );
    expect(screen.getByText("Custom activity body")).toBeInTheDocument();
  });

  it("shows a busy dots icon on the summary while tools are running", () => {
    render(<AiChatToolActivity summary="Generating…" items={items} />);
    const summary = screen.getByRole("button", { name: /Generating/i });
    expect(summary).toHaveAttribute("aria-busy", "true");
    expect(summary.querySelector("[data-testid='ai-chat-loading-icon']")).toBeInTheDocument();
  });

  it("uses dots loading icon for in-progress rows instead of a custom icon", () => {
    render(
      <AiChatToolActivity
        summary="Tools"
        defaultExpanded
        items={[{ id: "run", label: "artifact_create", status: "running", icon: <span>custom</span> }]}
      />,
    );
    expect(screen.queryByText("custom")).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-tool-item-run")).toHaveAttribute("data-status", "running");
    expect(
      screen.getByTestId("ai-chat-tool-item-run").querySelector("[data-testid='ai-chat-loading-icon']"),
    ).toBeInTheDocument();
  });
});
