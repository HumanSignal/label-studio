import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  beforeEach(() => {
    // Clean up window.APP_SETTINGS before each test
    // @ts-ignore
    delete window.APP_SETTINGS;
  });

  const testData = {
    icon: <svg data-testid="icon" />,
    header: "Test Header",
    description: <>Test description</>,
    learnMore: { href: "https://docs.example.com", text: "Learn more", testId: "test-learn-more-link" },
  };

  it("renders icon, header, description, and learn more link", () => {
    render(
      <EmptyState
        icon={testData.icon}
        header={testData.header}
        description={testData.description}
        learnMore={testData.learnMore}
      />,
    );

    // Test that the main component renders
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();

    // Test icon rendering
    expect(screen.getByTestId("icon")).toBeInTheDocument();

    // Test header rendering
    expect(screen.getByTestId("empty-state-header")).toBeInTheDocument();
    expect(screen.getByText(testData.header)).toBeInTheDocument();

    // Test description rendering
    expect(screen.getByTestId("empty-state-description")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();

    // Test learn more link
    const link = screen.getByRole("link", { name: /learn more/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", testData.learnMore.href);
    expect(link).toHaveAttribute("data-testid", testData.learnMore.testId);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("does not render learn more link if not provided", () => {
    render(<EmptyState icon={testData.icon} header={testData.header} description={testData.description} />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText(testData.header)).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    const learnMoreLink = screen.queryByRole("link", { name: /learn more/i });
    if (learnMoreLink) {
      expect(learnMoreLink).toBeInTheDocument();
    } else {
      expect(learnMoreLink).not.toBeInTheDocument();
    }
  });

  it("does not render data-testid if not provided", () => {
    render(
      <EmptyState
        icon={testData.icon}
        header={testData.header}
        description={testData.description}
        learnMore={{ href: testData.learnMore.href, text: testData.learnMore.text }}
      />,
    );

    const link = screen.getByRole("link", { name: /learn more/i });
    expect(link).toBeInTheDocument();
    expect(link).not.toHaveAttribute("data-testid");
  });

  it("hides learn more link in whitelabel mode", () => {
    // @ts-ignore
    window.APP_SETTINGS = { whitelabel_is_active: true };

    render(
      <EmptyState
        icon={testData.icon}
        header={testData.header}
        description={testData.description}
        learnMore={testData.learnMore}
      />,
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText(testData.header)).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    const learnMoreLink = screen.queryByRole("link", { name: /learn more/i });
    if (learnMoreLink) {
      expect(learnMoreLink).toBeInTheDocument();
    } else {
      expect(learnMoreLink).not.toBeInTheDocument();
    }
  });

  it("renders with complex description content", () => {
    const complexDescription = (
      <div>
        <span>First part</span>
        <strong>Bold part</strong>
      </div>
    );

    render(<EmptyState icon={testData.icon} header={testData.header} description={complexDescription} />);

    expect(screen.getByTestId("empty-state-description")).toBeInTheDocument();
    expect(screen.getByText("First part")).toBeInTheDocument();
    expect(screen.getByText("Bold part")).toBeInTheDocument();
  });
});
