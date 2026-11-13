import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../button/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Regular: Story = {
  args: {
    title: "Session timeout",
    description: "Sign members out after a period without activity.",
    children: "Card content",
  },
};

export const Compact: Story = {
  args: {
    size: "compact",
    title: "Agreement",
    description: "Across the last 30 days",
    children: "Card content",
  },
};

export const Composed: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Email notifications</CardTitle>
        <CardDescription>Choose which emails members receive.</CardDescription>
      </CardHeader>
      <CardContent>Settings go here.</CardContent>
      <CardContent className="flex items-center justify-end pt-0">
        <Button>Save</Button>
      </CardContent>
    </Card>
  ),
};
