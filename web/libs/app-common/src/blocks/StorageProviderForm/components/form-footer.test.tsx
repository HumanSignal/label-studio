import { render, screen } from "@testing-library/react";
import { FormFooter } from "./form-footer";

const renderFooter = (connectionChecked: boolean) =>
  render(
    <FormFooter
      currentStep={1}
      totalSteps={4}
      onPrevious={mock()}
      onNext={mock()}
      isEditMode={false}
      connectionChecked={connectionChecked}
      filesPreview={null}
      testConnection={{ isLoading: false, mutate: mock() }}
      loadPreview={{ isLoading: false, mutate: mock() }}
      createStorage={{ isLoading: false }}
    />,
  );

describe("FormFooter connection test button", () => {
  it("turns into the standard positive button once the connection is verified", () => {
    renderFooter(true);

    const button = screen.getByRole("button", { name: "Connection Verified" });
    expect(button).toHaveAttribute("data-variant", "positive");
    expect(button.className).not.toContain("bg-positive-surface-content-subtle");
    expect(button.className).not.toContain("text-positive-content");
  });

  it("is a primary button before the connection is tested", () => {
    renderFooter(false);

    expect(screen.getByRole("button", { name: "Test Connection" })).toHaveAttribute("data-variant", "primary");
  });
});
