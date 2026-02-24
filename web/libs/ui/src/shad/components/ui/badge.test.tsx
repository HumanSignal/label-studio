import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Badge, badgeVariants } from "./badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("applies default variant and shape", () => {
    const { container } = render(<Badge>Default</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/bg-primary|primary/);
    expect(el.className).toMatch(/rounded-full/);
  });

  it("applies variant when provided", () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/destructive|bg-destructive/);
  });

  it("applies shape when provided", () => {
    const { container } = render(<Badge shape="squared">Squared</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/rounded-sm/);
  });

  it("applies custom className", () => {
    const { container } = render(<Badge className="custom-class">X</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("custom-class");
  });

  it("forwards ref", () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("spreads extra props", () => {
    render(
      <Badge data-testid="badge" aria-label="Test badge">
        X
      </Badge>,
    );
    const el = screen.getByTestId("badge");
    expect(el).toHaveAttribute("aria-label", "Test badge");
  });
});

describe("badgeVariants", () => {
  it("returns default classes when called with no args", () => {
    const result = badgeVariants({});
    expect(result).toMatch(/inline-flex|items-center|border/);
  });

  it("returns variant-specific classes", () => {
    expect(badgeVariants({ variant: "secondary" })).toMatch(/secondary/);
    expect(badgeVariants({ variant: "success" })).toMatch(/positive|success/);
    expect(badgeVariants({ variant: "warning" })).toMatch(/warning/);
    expect(badgeVariants({ variant: "info" })).toMatch(/primary|accent-grape|info/);
    expect(badgeVariants({ variant: "outline" })).toMatch(/outline|neutral/);
    expect(badgeVariants({ variant: "beta" })).toMatch(/plum|beta/);
  });

  it("returns shape-specific classes", () => {
    expect(badgeVariants({ shape: "rounded" })).toMatch(/rounded-full/);
    expect(badgeVariants({ shape: "squared" })).toMatch(/rounded-sm/);
  });
});
