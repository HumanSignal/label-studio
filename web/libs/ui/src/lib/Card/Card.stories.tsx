import type { Meta, StoryObj } from "@storybook/react";
import { Typography } from "../typography/typography";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
  component: Card,
  title: "UI/Card",
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Legacy: Story = {
  args: { header: "Project settings", children: null },
  render: (args) => (
    <Card {...args}>
      <Typography variant="body" size="small">
        Deprecated: new code uses SimpleCard.
      </Typography>
    </Card>
  ),
};
