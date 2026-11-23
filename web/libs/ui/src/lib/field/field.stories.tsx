import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../input/input";
import { NumberInput } from "../number-input/number-input";
import { Select } from "../select/select";
import { Toggle } from "../toggle/toggle";
import { Field } from "./field";

const meta: Meta<typeof Field> = {
  title: "Inputs/Field",
  component: Field,
  decorators: [(Story) => <div style={{ width: 480, maxWidth: "100%" }}>{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof Field>;

/** Controls take label, description, hint and error directly; this is what they render. */
export const OnAControl: Story = {
  render: () => (
    <div className="flex flex-col gap-wide">
      <Input label="Project name" defaultValue="Sentiment review Q4" />
      <Input
        label="Delivery email"
        required
        description="Reports go here."
        defaultValue="reports@acme"
        error="Enter a valid email address"
      />
      <Input label="API token" info="Create one in Account settings." hint="Paste the whole token." />
    </div>
  ),
};

/** Field around a control that has no label props of its own. */
export const AroundAnyControl: Story = {
  render: () => (
    <Field
      label="Workspace"
      required
      description="Members of the workspace can open the project."
      error="Choose a workspace"
    >
      <Select options={["Research", "Production"]} placeholder="Choose a workspace" />
    </Field>
  ),
};

/** Control at the right; the error runs full width under the label and description. */
export const Horizontal: Story = {
  render: () => (
    <div className="flex flex-col gap-wide">
      <NumberInput
        layout="horizontal"
        label="Minimum acceptance score"
        description="Annotators with an acceptance score below this are failed."
        defaultValue={150}
        unit="%"
        stepper="none"
        error="Score cannot exceed 100"
      />
      <Field layout="horizontal" label="Reveal annotator names" description="Reviewers see who labeled each task.">
        <Toggle aria-label="Reveal annotator names" />
      </Field>
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Field label="Secret key" action={<a href="#rotate">Rotate</a>}>
      <Input type="password" revealable defaultValue="sk-live-8d7f" />
    </Field>
  ),
};
