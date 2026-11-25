import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircleIcon, UsersThreeIcon } from "@humansignal/icons";
import { Radio, RadioGroup } from "./radio-group";

const meta: Meta<typeof RadioGroup> = {
  title: "Inputs/RadioGroup",
  component: RadioGroup,
  decorators: [(Story) => <div style={{ width: 460, maxWidth: "100%" }}>{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const List: Story = {
  render: () => (
    <RadioGroup label="Task sampling" defaultValue="random">
      <Radio value="sequential" label="Sequential" description="Tasks are shown in the order they were imported." />
      <Radio value="random" label="Random" description="Each annotator gets tasks in a random order." />
      <Radio
        value="uncertainty"
        label="Uncertainty"
        description="Needs a connected model with prediction scores."
        disabled
      />
    </RadioGroup>
  ),
};

export const Cards: Story = {
  render: () => (
    <RadioGroup label="Agreement methodology" variant="card" defaultValue="consensus">
      <Radio
        value="consensus"
        icon={<CheckCircleIcon />}
        label="Consensus"
        description="Agreement is the share of annotators who chose the majority answer."
      />
      <Radio
        value="pairwise"
        icon={<UsersThreeIcon />}
        label="Pairwise"
        description="Agreement is the average score between every pair of annotations."
      />
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup label="CSV holds" orientation="horizontal" defaultValue="tasks">
      <Radio value="tasks" label="List of tasks" />
      <Radio value="timeseries" label="Time series" />
    </RadioGroup>
  ),
};

export const Invalid: Story = {
  render: () => (
    <RadioGroup label="Role" required orientation="horizontal" error="Choose a role">
      <Radio value="annotator" label="Annotator" />
      <Radio value="reviewer" label="Reviewer" />
    </RadioGroup>
  ),
};
