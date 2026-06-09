import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Stepper } from "./stepper";

jest.mock("./stepper.module.css", () => ({
  stepperRoot: "stepperRoot",
  stepperListStacked: "stepperListStacked",
  step: "step",
  stepNavigable: "stepNavigable",
  stepNonNavigable: "stepNonNavigable",
  stepLayoutDefault: "stepLayoutDefault",
  stepLayoutCompact: "stepLayoutCompact",
  stepItemStacked: "stepItemStacked",
  stepStackedButton: "stepStackedButton",
  stackedBadgeCell: "stackedBadgeCell",
  stackedTextCell: "stackedTextCell",
  stackedConnectorCell: "stackedConnectorCell",
  stepHasDescription: "stepHasDescription",
  stepTextBlock: "stepTextBlock",
  badgeWrap: "badgeWrap",
  badgeEntryRipple: "badgeEntryRipple",
  badge: "badge",
  badgeNumber: "badgeNumber",
  badgePrimary: "badgePrimary",
  badgeCompletedStamp: "badgeCompletedStamp",
  badgeStamp: "badgeStamp",
  badgeStampEnter: "badgeStampEnter",
  badgeIcon: "badgeIcon",
  badgeIconEnter: "badgeIconEnter",
  label: "label",
  labelActive: "labelActive",
  description: "description",
  connector: "connector",
  connectorVertical: "connectorVertical",
  connectorTrack: "connectorTrack",
  connectorFill: "connectorFill",
  connectorFillComplete: "connectorFillComplete",
  connectorFillIncomplete: "connectorFillIncomplete",
}));

describe("Stepper", () => {
  const steps = [
    { label: "One", canNavigate: true },
    { label: "Two", canNavigate: true },
    { label: "Three", canNavigate: false },
  ];

  it("renders step labels", () => {
    render(<Stepper steps={steps} currentStepIndex={1} onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("sets aria-current=step on the active step button", () => {
    render(<Stepper steps={steps} currentStepIndex={1} onStepSelect={() => {}} data-testid="stepper" />);
    const active = screen.getByTestId("stepper-step-1");
    expect(active).toHaveAttribute("aria-current", "step");
    const first = screen.getByTestId("stepper-step-0");
    expect(first).not.toHaveAttribute("aria-current", "step");
  });

  it("blocks navigation without native disabled when canNavigate is false", () => {
    render(<Stepper steps={steps} currentStepIndex={1} onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByTestId("stepper-step-0").className).toContain("stepNavigable");
    expect(screen.getByTestId("stepper-step-1").className).toContain("stepNavigable");
    expect(screen.getByTestId("stepper-step-0")).not.toBeDisabled();
    expect(screen.getByTestId("stepper-step-1")).not.toBeDisabled();
    const last = screen.getByTestId("stepper-step-2");
    expect(last).not.toBeDisabled();
    expect(last).toHaveAttribute("aria-disabled", "true");
    expect(last).toHaveAttribute("tabindex", "-1");
    expect(last.className).toContain("stepNonNavigable");
  });

  it("does not call onStepSelect for non-navigable steps", () => {
    const onStepSelect = jest.fn();
    render(<Stepper steps={steps} currentStepIndex={1} onStepSelect={onStepSelect} data-testid="stepper" />);
    fireEvent.click(screen.getByTestId("stepper-step-2"));
    expect(onStepSelect).not.toHaveBeenCalled();
  });

  it("calls onStepSelect with index for navigable steps", () => {
    const onStepSelect = jest.fn();
    render(<Stepper steps={steps} currentStepIndex={1} onStepSelect={onStepSelect} data-testid="stepper" />);
    fireEvent.click(screen.getByTestId("stepper-step-0"));
    expect(onStepSelect).toHaveBeenCalledWith(0);
  });

  it("omitting onStepSelect skips tab focus but keeps steps out of native disabled state", () => {
    render(<Stepper steps={steps} currentStepIndex={1} data-testid="stepper" />);
    for (const id of ["stepper-step-0", "stepper-step-1", "stepper-step-2"] as const) {
      const btn = screen.getByTestId(id);
      expect(btn).not.toBeDisabled();
      expect(btn).toHaveAttribute("tabindex", "-1");
      expect(btn).not.toHaveAttribute("aria-disabled", "true");
      expect(btn.className).toContain("stepNonNavigable");
    }
  });

  it("renders nothing when steps is empty", () => {
    render(<Stepper steps={[]} currentStepIndex={0} aria-label="Progress" />);
    expect(screen.queryByRole("navigation", { name: "Progress" })).not.toBeInTheDocument();
  });

  it("shows check badge when completed is true (primary surface on active step)", () => {
    const withCompleted = [
      { label: "One", completed: true as const, canNavigate: true },
      { label: "Two", canNavigate: true },
    ];
    render(<Stepper steps={withCompleted} currentStepIndex={0} onStepSelect={() => {}} data-testid="stepper" />);
    const badge0 = screen.getByTestId("stepper-step-0").querySelector("[data-stepper-badge]");
    expect(badge0).toHaveAttribute("data-stepper-badge-tone", "primary");
    expect(badge0).toHaveAttribute("data-stepper-badge-check", "true");
    expect(screen.getByTestId("stepper-step-0").querySelector("svg")).toBeInTheDocument();
  });

  it("uses primary badge tone for completed steps before the active step (check + primary surface)", () => {
    const stepsWithChecks = [
      { label: "One", completed: true as const, canNavigate: true },
      { label: "Two", completed: true as const, canNavigate: true },
      { label: "Three", canNavigate: true },
    ];
    render(<Stepper steps={stepsWithChecks} currentStepIndex={2} onStepSelect={() => {}} data-testid="stepper" />);
    const badge0 = screen.getByTestId("stepper-step-0").querySelector("[data-stepper-badge]");
    const badge1 = screen.getByTestId("stepper-step-1").querySelector("[data-stepper-badge]");
    expect(badge0).toHaveAttribute("data-stepper-badge-tone", "primary");
    expect(badge1).toHaveAttribute("data-stepper-badge-tone", "primary");
    expect(badge0).toHaveAttribute("data-stepper-badge-check", "true");
    expect(badge1).toHaveAttribute("data-stepper-badge-check", "true");
    expect(screen.getByTestId("stepper-step-0").querySelector("svg")).toBeInTheDocument();
    expect(screen.getByTestId("stepper-step-1").querySelector("svg")).toBeInTheDocument();
  });

  it("does not show check when completed is false even if index is before currentStepIndex", () => {
    const stepsExplicit = [
      { label: "One", completed: false as const, canNavigate: true },
      { label: "Two", completed: false as const, canNavigate: true },
      { label: "Three", canNavigate: true },
    ];
    render(<Stepper steps={stepsExplicit} currentStepIndex={2} onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByTestId("stepper-step-0").querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("stepper-step-1").querySelector("svg")).not.toBeInTheDocument();
  });

  it("fills connector segments from currentStepIndex only, not the completed prop", () => {
    const stepsExplicit = [
      { label: "One", completed: false as const, canNavigate: true },
      { label: "Two", completed: false as const, canNavigate: true },
      { label: "Three", canNavigate: true },
    ];
    render(<Stepper steps={stepsExplicit} currentStepIndex={1} onStepSelect={() => {}} data-testid="stepper" />);
    const nav = screen.getByTestId("stepper");
    expect(nav.querySelectorAll(".connectorFillComplete")).toHaveLength(1);
    expect(nav.querySelectorAll(".connectorFillIncomplete")).toHaveLength(1);
  });

  it("does not fill connector after the active step when completed is true on that step", () => {
    const withCompleted = [
      { label: "One", completed: true as const, canNavigate: true },
      { label: "Two", canNavigate: true },
    ];
    render(<Stepper steps={withCompleted} currentStepIndex={0} onStepSelect={() => {}} data-testid="stepper" />);
    const nav = screen.getByTestId("stepper");
    expect(nav.querySelectorAll(".connectorFillIncomplete")).toHaveLength(1);
    expect(nav.querySelectorAll(".connectorFillComplete")).toHaveLength(0);
    expect(screen.getByTestId("stepper-step-0").querySelector("svg")).toBeInTheDocument();
  });

  it("does not show check when completed is omitted even if index is before currentStepIndex", () => {
    render(<Stepper steps={steps} currentStepIndex={2} onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByTestId("stepper-step-0").querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("stepper-step-1").querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("stepper-step-0").querySelector("[data-stepper-badge]")).toHaveTextContent("1");
    expect(screen.getByTestId("stepper-step-1").querySelector("[data-stepper-badge]")).toHaveTextContent("2");
  });

  it("exposes data-stepper-badge and data-stepper-label for styling hooks", () => {
    render(<Stepper steps={steps} currentStepIndex={0} onStepSelect={() => {}} data-testid="stepper" />);
    const btn = screen.getByTestId("stepper-step-0");
    expect(btn.querySelector("[data-stepper-badge]")).toBeInTheDocument();
    expect(btn.querySelector("[data-stepper-label]")).toHaveTextContent("One");
  });

  it("uses per-step data-testid on the step button when provided", () => {
    const withTestIds = [
      { label: "One", canNavigate: true, "data-testid": "wizard-step-details" },
      { label: "Two", canNavigate: true, "data-testid": "wizard-step-review" },
    ];
    render(<Stepper steps={withTestIds} currentStepIndex={0} onStepSelect={() => {}} data-testid="wizard" />);
    expect(screen.getByTestId("wizard-step-details")).toHaveTextContent("One");
    expect(screen.getByTestId("wizard-step-review")).toHaveTextContent("Two");
  });

  it("uses primary badge for steps before the active step when completed is false", () => {
    const stepsExplicit = [
      { label: "One", completed: false as const, canNavigate: true },
      { label: "Two", completed: false as const, canNavigate: true },
      { label: "Three", canNavigate: true },
    ];
    render(<Stepper steps={stepsExplicit} currentStepIndex={1} onStepSelect={() => {}} data-testid="stepper" />);
    const badge0 = screen.getByTestId("stepper-step-0").querySelector("[data-stepper-badge]");
    expect(badge0).toHaveAttribute("data-stepper-badge-tone", "primary");
    expect(badge0).toHaveTextContent("1");
  });

  it("uses native disabled when step.disabled is true", () => {
    const withDisabled = [
      { label: "One", canNavigate: true },
      { label: "Two", disabled: true as const, canNavigate: true },
    ];
    render(<Stepper steps={withDisabled} currentStepIndex={0} onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByTestId("stepper-step-0")).not.toBeDisabled();
    expect(screen.getByTestId("stepper-step-1")).toBeDisabled();
  });

  it("shows step tooltip on hover when step.tooltip is set", async () => {
    const withTooltip = [
      { label: "One", canNavigate: true },
      { label: "Two", canNavigate: false, tooltip: "Complete the previous step first" },
    ];
    render(<Stepper steps={withTooltip} currentStepIndex={0} onStepSelect={() => {}} data-testid="stepper" />);
    fireEvent.mouseEnter(screen.getByTestId("stepper-step-1"));
    expect(await screen.findByTestId("tooltip-body")).toHaveTextContent("Complete the previous step first");
  });

  it("applies stepLayoutCompact when size is compact", () => {
    render(<Stepper steps={steps} currentStepIndex={0} size="compact" onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByTestId("stepper-step-0").className).toContain("stepLayoutCompact");
    expect(screen.getByTestId("stepper-step-0").className).not.toContain("stepLayoutDefault");
  });

  it("applies stepLayoutDefault by default for horizontal variant", () => {
    render(<Stepper steps={steps} currentStepIndex={0} onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByTestId("stepper-step-0").className).toContain("stepLayoutDefault");
  });

  it("renders vertical connectors in the badge column when variant is vertical", () => {
    render(
      <Stepper
        steps={steps}
        currentStepIndex={1}
        variant="vertical"
        size="compact"
        onStepSelect={() => {}}
        data-testid="stepper"
      />,
    );
    const nav = screen.getByTestId("stepper");
    const connectorCells = nav.querySelectorAll(".stackedConnectorCell");
    expect(connectorCells).toHaveLength(2);
    expect(connectorCells[0]?.querySelector(".connectorVertical")).toBeInTheDocument();
    expect(connectorCells[0]?.closest(".stackedBadgeCell")).toBeInTheDocument();
    expect(screen.getByTestId("stepper-step-1").className).toContain("stepStackedButton");
    expect(screen.getByTestId("stepper-step-1").querySelector(".stackedBadgeCell")).toBeInTheDocument();
  });

  it("renders description below the label", () => {
    const withDescription = [{ label: "Intro", description: "Course overview", canNavigate: true }];
    render(<Stepper steps={withDescription} currentStepIndex={0} onStepSelect={() => {}} data-testid="stepper" />);
    expect(screen.getByText("Course overview")).toBeInTheDocument();
    expect(screen.getByTestId("stepper-step-0").querySelector("[data-stepper-description]")).toHaveTextContent(
      "Course overview",
    );
  });
});
