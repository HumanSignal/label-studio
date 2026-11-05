import type { Meta, StoryObj } from "@storybook/react";
import { Typography } from "../typography/typography";
import { StateChip } from "./state-chip";

const meta: Meta<typeof StateChip> = {
  component: StateChip,
  title: "UI/StateChip",
  argTypes: {
    variant: { control: "select", options: ["neutral", "primary", "warning", "plum", "positive", "negative"] },
    interactive: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof StateChip>;

export const InProgress: Story = {
  args: { label: "In progress", variant: "primary", description: "Annotation has started" },
};

export const NeedsReview: Story = {
  args: { label: "Needs review", variant: "warning", description: "Waiting for a reviewer" },
};

export const Completed: Story = {
  args: { label: "Completed", variant: "positive", description: "All annotations accepted" },
};

export const Interactive: Story = {
  args: {
    label: "In review",
    variant: "plum",
    interactive: true,
    popoverContent: <Typography>Reviewed twice, one change requested.</Typography>,
  },
};
