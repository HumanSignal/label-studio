import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BadgeGroup } from "./badge-group";

jest.mock("../badge/badge.module.css", () => ({
  badge: "badge",
  "variant-grape": "variant-grape",
  "variant-kale": "variant-kale",
  "variant-persimmon": "variant-persimmon",
  "variant-sand": "variant-sand",
}));
jest.mock("./badge-group.module.css", () => ({ container: "container" }));
jest.mock("./useBadgeOverflow", () => ({ useBadgeOverflow: () => 1 }));

describe("BadgeGroup per-item variant", () => {
  it("lets each item carry its own variant and icon", () => {
    render(
      <BadgeGroup
        truncate={false}
        variant="primary"
        items={[
          { id: 1, label: "Python", variant: "positive", icon: <span data-testid="check" /> },
          { id: 2, label: "Rust" },
        ]}
      />,
    );

    expect(screen.getByText("Python").closest(".badge")).toHaveClass("variant-kale");
    expect(screen.getByTestId("check")).toBeInTheDocument();
    expect(screen.getByText("Rust").closest(".badge")).toHaveClass("variant-grape");
  });

  it("keeps the +N overflow badge neutral when items bring their own variants", () => {
    render(
      <BadgeGroup
        items={[
          { id: 1, label: "Python", variant: "positive" },
          { id: 2, label: "Rust", variant: "negative" },
        ]}
      />,
    );

    expect(screen.getByText("+1").closest(".badge")).toHaveClass("variant-sand");
  });
});
