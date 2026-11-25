import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "../checkbox/checkbox";
import { CheckboxGroup } from "./checkbox-group";

const meta: Meta<typeof CheckboxGroup> = {
  title: "Inputs/CheckboxGroup",
  component: CheckboxGroup,
  decorators: [(Story) => <div style={{ width: 460, maxWidth: "100%" }}>{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

export const Default: Story = {
  render: () => (
    <CheckboxGroup label="Send payload for" defaultValue={["TASK_CREATED", "ANNOTATION_CREATED"]}>
      <Checkbox value="TASK_CREATED" label="Task created" />
      <Checkbox value="TASK_DELETED" label="Task deleted" />
      <Checkbox value="ANNOTATION_CREATED" label="Annotation submitted" description="Fires once per submission." />
      <Checkbox value="REVIEW_ACCEPTED" label="Review accepted" disabled />
    </CheckboxGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <CheckboxGroup label="Include" orientation="horizontal" defaultValue={["annotations"]}>
      <Checkbox value="annotations" label="Annotations" />
      <Checkbox value="predictions" label="Predictions" />
      <Checkbox value="history" label="History" />
    </CheckboxGroup>
  ),
};

export const Invalid: Story = {
  render: () => (
    <CheckboxGroup label="Confirm" required error="Confirm to continue">
      <Checkbox value="reassign" label="I understand that my tasks will be reassigned" />
    </CheckboxGroup>
  ),
};
