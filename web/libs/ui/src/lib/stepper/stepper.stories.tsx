import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Stepper } from "./stepper";
import { Button } from "../button/button";

const meta: Meta<typeof Stepper> = {
  title: "UI/Stepper",
  component: Stepper,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          'Linear progress navigation for wizards and sidebars. **`variant`** controls step list direction (`horizontal` row vs `vertical` stack). **`size`** controls per-step density (`default` badge above label vs `compact` badge beside label). Vertical lists always use compact per-step layout — prefer `variant="vertical"` with `size="compact"`. The connector fill follows `currentStepIndex` only. The check appears when `completed: true`. With `onStepSelect`, `canNavigate: true` allows activation; `canNavigate: false` blocks without greyed-out styling (`disabled: true` for that). Optional per-step **`description`** renders below the label. Optional **`tooltip`** explains locked steps.',
      },
    },
  },
  argTypes: {
    steps: { control: "object" },
    currentStepIndex: { control: { type: "number", min: 0 } },
    variant: { control: "radio", options: ["horizontal", "vertical"] },
    size: { control: "radio", options: ["default", "compact"] },
    onStepSelect: { action: "stepSelect" },
  },
};

export default meta;

type Story = StoryObj<typeof Stepper>;

/** Mid-wizard: badge above label in a horizontal row (SSO / storage setup default). */
export const HorizontalDefault: Story = {
  name: "Horizontal Default",
  args: {
    currentStepIndex: 2,
    steps: [
      { id: "a", label: "Account", canNavigate: true, completed: true },
      { id: "b", label: "Profile", canNavigate: true, completed: true },
      { id: "c", label: "Billing", canNavigate: true },
      { id: "d", label: "Review", canNavigate: false },
      { id: "e", label: "Done", canNavigate: false },
    ],
    onStepSelect: () => {},
  },
};

export const HorizontalCompact: Story = {
  name: "Horizontal Compact",
  args: {
    size: "compact",
    currentStepIndex: 1,
    steps: [
      { label: "Select", canNavigate: true, completed: true },
      { label: "Configure", canNavigate: true },
      { label: "Preview", canNavigate: false },
    ],
    onStepSelect: () => {},
  },
};

/** Stacked sidebar-style list with badge-left rows (course page nav). */
export const VerticalStacked: Story = {
  name: "Vertical Stacked",
  args: {
    variant: "vertical",
    size: "compact",
    currentStepIndex: 1,
    steps: [
      { id: "intro", label: "Introduction", canNavigate: true, completed: true },
      { id: "basics", label: "Labeling basics", canNavigate: true },
      { id: "review", label: "Review", canNavigate: false },
    ],
    onStepSelect: () => {},
  },
  decorators: [
    (StoryComponent) => (
      <div className="w-64 border border-neutral-border p-base">
        <StoryComponent />
      </div>
    ),
  ],
};

export const VerticalStackedWithDescriptions: Story = {
  name: "Vertical Stacked With Descriptions",
  args: {
    variant: "vertical",
    size: "compact",
    currentStepIndex: 0,
    steps: [
      {
        id: "intro",
        label: "Welcome",
        description: "Overview of the course goals",
        canNavigate: true,
      },
      {
        id: "setup",
        label: "Project setup",
        description: "Configure your labeling interface",
        canNavigate: false,
      },
      {
        id: "label",
        label: "Start labeling",
        description: "Apply what you learned",
        canNavigate: false,
      },
    ],
    onStepSelect: () => {},
  },
  decorators: [
    (StoryComponent) => (
      <div className="w-64 border border-neutral-border p-base">
        <StoryComponent />
      </div>
    ),
  ],
};

/** Future step with `canNavigate: false` and a **tooltip** (e.g. wizard guard). */
export const HorizontalWithStepTooltip: Story = {
  name: "Horizontal With Step Tooltip",
  args: {
    currentStepIndex: 0,
    steps: [
      { label: "Account", canNavigate: true },
      { label: "Billing", canNavigate: false, tooltip: "Complete the previous step first" },
      { label: "Review", canNavigate: false, tooltip: "Complete the previous step first" },
    ],
    onStepSelect: () => {},
  },
};

function WizardWithButtonsInner() {
  const stepDefs = [
    { label: "Details", canNavigate: true },
    { label: "Options", canNavigate: true },
    { label: "Confirm", canNavigate: true },
  ] as const;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedByIndex, setCompletedByIndex] = useState<Record<number, boolean>>({});

  const currentCompleted = completedByIndex[currentStepIndex] === true;

  return (
    <div className="flex max-w-2xl flex-col gap-wide">
      <Stepper
        aria-label="Example wizard"
        steps={stepDefs.map((s, i) => ({
          ...s,
          canNavigate: i <= currentStepIndex,
          completed: completedByIndex[i] === true,
        }))}
        currentStepIndex={currentStepIndex}
        onStepSelect={setCurrentStepIndex}
        data-testid="stepper-wizard-demo"
      />
      <div className="flex flex-row flex-wrap gap-tight">
        <Button
          type="button"
          variant="neutral"
          look="outlined"
          disabled={currentStepIndex === 0}
          data-testid="wizard-prev"
          onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={currentStepIndex >= stepDefs.length - 1}
          data-testid="wizard-next"
          onClick={() => setCurrentStepIndex((i) => Math.min(stepDefs.length - 1, i + 1))}
        >
          Next
        </Button>
        <Button
          type="button"
          variant="positive"
          look="outlined"
          disabled={currentCompleted}
          data-testid="wizard-complete-step"
          onClick={() =>
            setCompletedByIndex((prev) => ({
              ...prev,
              [currentStepIndex]: true,
            }))
          }
        >
          Complete Step
        </Button>
        <Button
          type="button"
          variant="negative"
          look="outlined"
          disabled={!currentCompleted}
          data-testid="wizard-reset-step"
          onClick={() =>
            setCompletedByIndex((prev) => {
              const next = { ...prev };
              delete next[currentStepIndex];
              return next;
            })
          }
        >
          Reset Step
        </Button>
      </div>
      <p className="text-body-small text-neutral-content-subtle">
        Step content for index {currentStepIndex} would render here. Use <strong>Complete Step</strong> to mark the
        current step finished (check icon); <strong>Reset Step</strong> clears that for the current step. Move with
        Previous / Next. Completed and current steps are clickable; future steps are not navigable until you advance
        with Next (they stay visually normal).
      </p>
    </div>
  );
}

/** Drive `currentStepIndex` with Previous / Next; step clicks jump back within allowed range. */
export const WizardWithNavigation: Story = {
  name: "Wizard With Navigation",
  render: () => <WizardWithButtonsInner />,
};
