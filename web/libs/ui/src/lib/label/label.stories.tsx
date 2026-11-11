import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";

const meta: Meta<typeof Label> = {
  component: Label,
  title: "UI/Label",
  argTypes: {
    required: { control: "boolean" },
    size: { control: "select", options: ["large", "small"] },
    placement: { control: "select", options: ["right", "left"] },
  },
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: { text: "Project name" },
};

export const Required: Story = {
  args: { text: "Project name", required: true },
};

export const WithDescription: Story = {
  args: { text: "Sampling", description: "How tasks are handed out to annotators" },
};

export const Small: Story = {
  args: { text: "Page size", size: "small" },
};
