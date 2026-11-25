import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SummaryLabel, summarizeLabels } from "./summary-label";

const items = ["Alpha", "Beta", "Gamma", "Delta"].map((label, id) => ({ id, label }));
const many = Array.from({ length: 1_250 }, (_, id) => ({ id, label: `Item ${id}` }));
const visibleText = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("[data-inline-item]:not([aria-hidden])"), (el) => el.textContent).join("");

describe("SummaryLabel", () => {
  it("shows the first value and the count before measuring", () => {
    render(<SummaryLabel items={items} data-testid="summary" countTestId="count" />);
    expect(visibleText(screen.getByTestId("summary"))).toBe("Alpha");
    expect(screen.getByTestId("count")).toHaveTextContent("+3");
  });

  it("shortens the count from a thousand up", () => {
    render(<SummaryLabel items={many} countTestId="count" />);
    expect(screen.getByTestId("count")).toHaveTextContent("+1.2k");
  });

  it("takes a custom count label", () => {
    render(<SummaryLabel items={items} countLabel={(n) => `+${n} selected`} countTestId="count" />);
    expect(screen.getByTestId("count")).toHaveTextContent("+3 selected");
  });

  it("shows every value, comma-separated, when not truncated", () => {
    render(<SummaryLabel items={items} truncate={false} data-testid="summary" countTestId="count" />);
    expect(visibleText(screen.getByTestId("summary"))).toBe("Alpha, Beta, Gamma, Delta");
    expect(screen.queryByTestId("count")).not.toBeInTheDocument();
  });

  it("shows one value and no count when there is only one", () => {
    render(<SummaryLabel items={items.slice(0, 1)} countTestId="count" />);
    expect(screen.queryByTestId("count")).not.toBeInTheDocument();
  });

  it("starts from initialVisible values, capped by max", () => {
    const { rerender } = render(
      <SummaryLabel items={items} initialVisible={2} data-testid="summary" countTestId="count" />,
    );
    expect(visibleText(screen.getByTestId("summary"))).toBe("Alpha, Beta");
    rerender(<SummaryLabel items={items} max={1} initialVisible={3} data-testid="summary" countTestId="count" />);
    expect(screen.getByTestId("count")).toHaveTextContent("+3");
  });

  it("renders badges in badge mode and keeps the count as text", () => {
    render(<SummaryLabel items={items} badges data-testid="summary" countTestId="count" />);
    const root = screen.getByTestId("summary");
    expect(root.querySelectorAll("[data-inline-item]").length).toBe(4);
    expect(screen.getByTestId("count").tagName).toBe("SPAN");
    expect(screen.getByTestId("count")).not.toHaveAttribute("data-slot", "badge");
  });

  it("reports truncation", () => {
    const onTruncationChange = mock();
    render(<SummaryLabel items={items} onTruncationChange={onTruncationChange} />);
    expect(onTruncationChange).toHaveBeenCalledWith(true);
  });

  it("titles the whole list for hover", () => {
    render(<SummaryLabel items={items} data-testid="summary" />);
    expect(screen.getByTestId("summary")).toHaveAttribute("title", "Alpha, Beta, Gamma, Delta");
  });

  it("does not render values past max", () => {
    render(<SummaryLabel items={items} max={1} data-testid="summary" countTestId="count" />);
    expect(screen.getByTestId("summary").querySelectorAll("[data-inline-item]").length).toBe(1);
    expect(screen.getByTestId("count")).toHaveTextContent("+3");
  });

  it("summarizes as text for sentences", () => {
    expect(summarizeLabels(["A", "B", "C", "D", "E"], { max: 3 })).toBe("A, B, C +2");
    expect(summarizeLabels(["A", "B"], { max: 3 })).toBe("A, B");
    expect(
      summarizeLabels(
        Array.from({ length: 1_203 }, (_, i) => `P${i}`),
        { max: 3 },
      ),
    ).toBe("P0, P1, P2 +1.2k");
    expect(summarizeLabels(["A", "B"], { max: 1, total: 10 })).toBe("A +9");
    expect(summarizeLabels(["A", "B", "C"], { max: 1, countLabel: (n) => `+${n} more` })).toBe("A +2 more");
  });

  it("renders nothing without values", () => {
    const { container } = render(<SummaryLabel items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
