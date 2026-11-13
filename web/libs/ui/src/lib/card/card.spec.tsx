import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

const slot = (el: HTMLElement | null, name: string) => el?.closest(`[data-slot="${name}"]`) as HTMLElement | null;

describe("Card", () => {
  it("defaults to the regular size, flat and full width", () => {
    render(<Card title="Section">Body</Card>);

    const card = slot(screen.getByText("Body"), "card");
    expect(card).toHaveAttribute("data-size", "regular");
    expect(card?.className).not.toMatch(/shadow|w-\[/);
    expect(slot(screen.getByText("Body"), "card-content")).toHaveClass("p-6", "pt-0");
  });

  it("renders the compact size with its padding", () => {
    render(
      <Card size="compact" title="Totals" description="Last 30 days">
        42
      </Card>,
    );

    expect(slot(screen.getByText("42"), "card")).toHaveAttribute("data-size", "compact");
    expect(slot(screen.getByText("Totals"), "card-header")).toHaveClass("px-4", "pt-4", "pb-2");
    expect(screen.getByText("Last 30 days")).toHaveAttribute("data-slot", "card-description");
  });

  it("lets a className override the padding", () => {
    render(
      <Card size="compact" title="Totals" contentClassName="p-0">
        Flush
      </Card>,
    );

    const content = slot(screen.getByText("Flush"), "card-content");
    expect(content).toHaveClass("p-0");
    expect(content).not.toHaveClass("p-4");
  });

  it("renders composed parts as given, with the size from the card", () => {
    render(
      <Card size="compact">
        <CardHeader>
          <CardTitle>Composed</CardTitle>
        </CardHeader>
        <CardContent>Parts</CardContent>
      </Card>,
    );

    expect(slot(screen.getByText("Composed"), "card-header")).toHaveClass("px-4");
    expect(slot(screen.getByText("Parts"), "card-content")).toHaveClass("p-4");
  });

  it("renders the content without a header when the title is empty", () => {
    render(<Card title="">Only content</Card>);

    expect(document.querySelector('[data-slot="card-header"]')).toBeNull();
    expect(slot(screen.getByText("Only content"), "card-content")).toHaveClass("p-6");
  });
});
