import type { Meta, StoryObj } from "@storybook/react";
import { Typography } from "../typography/typography";
import { TextArea } from "./text-area";

const meta: Meta<typeof TextArea> = {
  title: "Inputs/TextArea",
  component: TextArea,
  args: { "aria-label": "Description", placeholder: "Describe the project for annotators" },
  argTypes: { resize: { control: "inline-radio", options: ["vertical", "none"] } },
};
export default meta;

/** Single-field stories render at a typical field width; grids set their own. */
const fieldWidth = (Story: () => React.ReactNode) => <div style={{ width: 420, maxWidth: "100%" }}>{Story()}</div>;
type Story = StoryObj<typeof TextArea>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-tighter">
    <Typography variant="label" size="smaller" className="text-neutral-content-subtler">
      {label}
    </Typography>
    {children}
  </div>
);

export const Default: Story = { decorators: [fieldWidth] };

/** Every state side by side. Tab into a field to see the keyboard outline; a click only darkens the border. */
export const States: Story = {
  decorators: [(Story) => <div style={{ width: 860, maxWidth: "100%" }}>{Story()}</div>],
  render: () => (
    <div className="grid grid-cols-2 gap-base">
      <Cell label="Empty">
        <TextArea aria-label="Empty" placeholder="What is this project for?" />
      </Cell>
      <Cell label="Filled">
        <TextArea aria-label="Filled" defaultValue="Product reviews from the Q4 survey, three labels." />
      </Cell>
      <Cell label="Invalid">
        <TextArea aria-label="Invalid" defaultValue="Instructions that run past the limit of the field" invalid />
      </Cell>
      <Cell label="Disabled">
        <TextArea aria-label="Disabled" defaultValue="Managed by your organization" disabled />
      </Cell>
      <Cell label="Read-only">
        <TextArea aria-label="Read-only" value="Set by the project template." readOnly />
      </Cell>
      <Cell label="Fixed size">
        <TextArea aria-label="Fixed size" resize="none" placeholder="The user cannot resize this one" />
      </Cell>
    </div>
  ),
};

/** Grows with its content and scrolls past maxHeight. */
export const Autosize: Story = {
  decorators: [fieldWidth],
  args: {
    "aria-label": "Instructions",
    autosize: true,
    maxHeight: 200,
    rows: 2,
    defaultValue:
      "Label each review as positive, negative or neutral.\nSkip reviews that are not in English.\nFlag anything that mentions a person by name.",
  },
};

/** One row is as tall as the Input of the same size: 40, 32 and 24px. The text and the padding follow. */
export const Sizes: Story = {
  decorators: [fieldWidth],
  render: () => (
    <div className="flex flex-col gap-base">
      <TextArea aria-label="Medium" size="medium" rows={1} defaultValue="Medium · one row is 40px" />
      <TextArea aria-label="Small" size="small" rows={1} defaultValue="Small · one row is 32px" />
      <TextArea aria-label="Smaller" size="smaller" rows={1} defaultValue="Smaller · one row is 24px" />
    </div>
  ),
};
