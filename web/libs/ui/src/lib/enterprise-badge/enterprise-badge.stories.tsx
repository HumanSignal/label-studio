import type { Meta, StoryObj } from "@storybook/react";
import { EnterpriseBadge } from "./enterprise-badge";

const meta: Meta<typeof EnterpriseBadge> = {
  component: EnterpriseBadge,
  title: "UI/EnterpriseBadge",
  argTypes: {
    look: {
      control: "select",
      options: ["filled", "outline", "ghost", "solid"],
    },
    shape: {
      control: "select",
      options: ["rounded", "square"],
    },
    size: {
      control: "select",
      options: ["medium", "small"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EnterpriseBadge>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    children: "Enterprise",
    look: "filled",
  },
};

export const Ghost: Story = {
  args: {
    children: "Enterprise",
    look: "ghost",
  },
};

export const Outline: Story = {
  args: {
    children: "Enterprise",
    look: "outline",
  },
};

export const Solid: Story = {
  args: {
    children: "Enterprise",
    look: "solid",
  },
};

export const IconOnlyAndGhost: Story = {
  args: {
    children: "",
    look: "ghost",
  },
};

export const Small: Story = {
  args: {
    children: "Enterprise",
    size: "small",
  },
};

export const IconOnlySmall: Story = {
  args: {
    children: "",
    size: "small",
  },
};

export const Rounded: Story = {
  args: {
    children: "Enterprise",
    shape: "rounded",
  },
};

export const CustomLabel: Story = {
  args: {
    children: "Custom label",
    icon: null,
  },
};

export const AllStyles: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <EnterpriseBadge>Enterprise</EnterpriseBadge>
      <EnterpriseBadge look="outline">Enterprise</EnterpriseBadge>
      <EnterpriseBadge look="ghost">Enterprise</EnterpriseBadge>
      <EnterpriseBadge look="solid">Enterprise</EnterpriseBadge>
    </div>
  ),
};
