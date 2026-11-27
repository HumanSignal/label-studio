import { fireEvent, render, screen } from "@testing-library/react";
import { AiChatApprovalCard } from "./ai-chat-approval-card";

const options = [
  { id: "three", label: "Three (core line)" },
  { id: "five", label: "Five (full case)" },
  { id: "one", label: "Just one hero" },
];

describe("AiChatApprovalCard", () => {
  it("renders question and options", () => {
    render(<AiChatApprovalCard question="How many flavors should we launch?" options={options} />);
    expect(screen.getByText("How many flavors should we launch?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Three (core line)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Five (full case)" })).toBeInTheDocument();
  });

  it("calls onSelect when an option is chosen", () => {
    const onSelect = jest.fn();
    render(<AiChatApprovalCard question="Pick one" options={options} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Five (full case)" }));
    expect(onSelect).toHaveBeenCalledWith("five");
  });

  it("supports controlled selectedId and confirm callback", () => {
    const onConfirm = jest.fn();
    render(
      <AiChatApprovalCard
        question="Pick one"
        options={options}
        selectedId="three"
        confirmLabel="Approve"
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("button", { name: "Three (core line)" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onConfirm).toHaveBeenCalledWith("three");
  });

  it("renders actions and children slots", () => {
    render(
      <AiChatApprovalCard question="Custom" actions={<button type="button">Skip</button>} data-testid="approval-card">
        <span>Custom body</span>
      </AiChatApprovalCard>,
    );
    expect(screen.getByText("Custom body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("accepts custom className", () => {
    render(<AiChatApprovalCard question="Q" className="custom-approval" data-testid="approval-card" />);
    expect(screen.getByTestId("approval-card")).toHaveClass("custom-approval");
  });
});
