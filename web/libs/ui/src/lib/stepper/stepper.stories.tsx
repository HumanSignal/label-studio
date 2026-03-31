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
          'Linear progress navigation for wizards. Default layout is **vertical** (badge above label per column). Use `variant="horizontal"` for inline badge + label. The blue connector fill follows `currentStepIndex` only (filled between steps that are strictly before the active step). The check appears only when `completed: true`; otherwise the step number is shown. Steps before the active one use the primary badge (number or check). With `onStepSelect`, `canNavigate: true` allows activating that step; `canNavigate: false` blocks activation without greyed-out disabled styling (use `disabled: true` for that). Without `onStepSelect`, steps are read-only (skipped in tab order). Optional per-step **`tooltip`** shows on hover (e.g. why a step is locked).',
      },
    },
  },
  argTypes: {
    steps: { control: "object" },
    currentStepIndex: { control: { type: "number", min: 0 } },
    variant: { control: "radio", options: ["vertical", "horizontal"] },
    onStepSelect: { action: "stepSelect" },
  },
};

export default meta;

type Story = StoryObj<typeof Stepper>;

/** Mid-wizard: completed, active, and future steps; future steps use `canNavigate: false` (no jump-ahead, not greyed out). */
export const VerticalDefault: Story = {
  args: {
    variant: "vertical",
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

export const Horizontal: Story = {
  args: {
    variant: "horizontal",
    currentStepIndex: 1,
    steps: [
      { label: "Select", canNavigate: true, completed: true },
      { label: "Configure", canNavigate: true },
      { label: "Preview", canNavigate: false },
    ],
    onStepSelect: () => {},
  },
};

/** Future step with `canNavigate: false` and a **tooltip** (e.g. wizard guard). */
export const VerticalWithStepTooltip: Story = {
  name: "Vertical With Step Tooltip",
  args: {
    variant: "vertical",
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
