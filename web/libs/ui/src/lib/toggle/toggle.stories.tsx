import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "./toggle";

const meta: Meta<typeof Toggle> = {
  component: Toggle,
  title: "UI/Toggle",
  argTypes: {
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
    onChange: { action: "changed" },
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

const noop = () => {};

export const Default: Story = {
  args: { label: "Enable notifications", onChange: noop },
};

export const Checked: Story = {
  args: { label: "Auto-save drafts", checked: true, onChange: noop },
};

export const WithDescription: Story = {
  args: { label: "Auto-save drafts", description: "Drafts are saved while you annotate", onChange: noop },
};

export const Disabled: Story = {
  args: { label: "Managed by your organization", disabled: true, checked: true, onChange: noop },
};
