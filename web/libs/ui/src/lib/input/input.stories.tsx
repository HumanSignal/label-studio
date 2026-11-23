import type { Meta, StoryObj } from "@storybook/react";
import { MagnifyingGlassIcon } from "@humansignal/icons";
import { useState } from "react";
import { Typography } from "../typography/typography";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "Inputs/Input",
  component: Input,
  args: { "aria-label": "Project name", placeholder: "Project name" },
  argTypes: {
    size: { control: "inline-radio", options: ["medium", "small", "smaller"] },
    type: { control: "select", options: ["text", "email", "url", "password", "number"] },
  },
};
export default meta;

/** Single-field stories render at a typical field width; grids set their own. */
const fieldWidth = (Story: () => React.ReactNode) => <div style={{ width: 320, maxWidth: "100%" }}>{Story()}</div>;
type Story = StoryObj<typeof Input>;

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
  decorators: [(Story) => <div style={{ width: 720, maxWidth: "100%" }}>{Story()}</div>],
  render: () => (
    <div className="grid grid-cols-2 gap-base">
      <Cell label="Empty">
        <Input aria-label="Empty" placeholder="Project name" />
      </Cell>
      <Cell label="Filled">
        <Input aria-label="Filled" defaultValue="Sentiment review Q4" />
      </Cell>
      <Cell label="Invalid">
        <Input aria-label="Invalid" defaultValue="sentiment review!" invalid />
      </Cell>
      <Cell label="Disabled">
        <Input aria-label="Disabled" defaultValue="Managed by your organization" disabled />
      </Cell>
      <Cell label="Read-only">
        <Input aria-label="Read-only" value="org-2291-sentiment" readOnly />
      </Cell>
      <Cell label="Placeholder only">
        <Input aria-label="Placeholder only" placeholder="name@example.com" type="email" />
      </Cell>
    </div>
  ),
};

/** Heights match Button and Select: 40, 32 and 24px. */
export const Sizes: Story = {
  decorators: [fieldWidth],
  render: () => (
    <div className="flex flex-col gap-base">
      <Input aria-label="Medium" size="medium" defaultValue="Medium · 40px" />
      <Input aria-label="Small" size="small" defaultValue="Small · 32px" />
      <Input aria-label="Smaller" size="smaller" defaultValue="Smaller · 24px" />
    </div>
  ),
};

export const LeadingAndTrailing: Story = {
  decorators: [fieldWidth],
  render: () => (
    <div className="flex flex-col gap-base">
      <Input aria-label="Search members" placeholder="Search members" leading={<MagnifyingGlassIcon />} clearable />
      <Input aria-label="Webhook URL" leading="https://" defaultValue="hooks.example.com/ls" />
      <Input aria-label="Agreement threshold" type="number" defaultValue="80" trailing="%" />
    </div>
  ),
};

export const Clearable: Story = {
  decorators: [fieldWidth],
  render: function ClearableInput() {
    const [value, setValue] = useState("annotator");
    return <Input aria-label="Search" clearable value={value} onChange={(event) => setValue(event.target.value)} />;
  },
};

export const Password: Story = {
  decorators: [fieldWidth],
  args: { "aria-label": "Password", type: "password", revealable: true, defaultValue: "correct-horse-battery" },
};

export const Copyable: Story = {
  decorators: [fieldWidth],
  args: {
    "aria-label": "ACS URL",
    readOnly: true,
    copyable: true,
    value: "https://app.humansignal.com/sso/acs",
  },
};
