import type { Meta, StoryObj } from "@storybook/react";
import { Typography } from "../typography/typography";
import { SimpleCard } from "./index";

const meta: Meta<typeof SimpleCard> = {
  component: SimpleCard,
  title: "UI/SimpleCard",
  argTypes: {
    flushContent: { control: "boolean" },
    flushHeader: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof SimpleCard>;

export const Default: Story = {
  args: {
    title: "Annotation settings",
    description: "How tasks are distributed and reviewed",
    children: <Typography>Sampling: sequential · Overlap: 1 · Skip: allowed</Typography>,
  },
};

export const TitleOnly: Story = {
  args: {
    title: "Members",
    children: <Typography>12 annotators, 2 reviewers</Typography>,
  },
};

export const FlushContent: Story = {
  args: {
    title: "Recent activity",
    flushContent: true,
    children: <Typography className="p-base">Rows fill the card edge to edge.</Typography>,
  },
};
