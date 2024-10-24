import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";
import { action } from "@storybook/addon-actions";

const meta: Meta<typeof Checkbox> = {
  component: Checkbox,
  title: "Checkbox",
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean" },
    indeterminate: { control: "boolean" },
    onChange: { action: "changed" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    children: "Default Checkbox",
  },
};

export const Checked: Story = {
  args: {
    children: "Checked Checkbox",
    checked: true,
  },
};

export const Unchecked: Story = {
  args: {
    children: "Unchecked Checkbox",
    checked: false,
  },
};

export const Indeterminate: Story = {
  args: {
    children: "Indeterminate Checkbox",
    indeterminate: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Checkbox",
    disabled: true,
  },
};

export const WithoutLabel: Story = {
  args: {},
};

export const WithCustomStyle: Story = {
  args: {
    children: "Custom Style Checkbox",
    style: { backgroundColor: "lightblue", padding: "10px" },
  },
};

export const WithChangeHandler: Story = {
  args: {
    children: "Checkbox with Change Handler",
    onChange: action("Checkbox changed"),
  },
};
