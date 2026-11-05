import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../button/button";
import { Space } from "./space";

const meta: Meta<typeof Space> = {
  component: Space,
  title: "UI/Space",
  argTypes: {
    direction: { control: "select", options: ["horizontal", "vertical"] },
    size: { control: "select", options: ["small", "large"] },
    spread: { control: "boolean" },
    stretch: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Space>;

const children = (
  <>
    <Button variant="neutral" look="outlined">
      Cancel
    </Button>
    <Button variant="primary" look="filled">
      Save
    </Button>
  </>
);

export const Horizontal: Story = {
  args: { children },
};

export const Vertical: Story = {
  args: { direction: "vertical", children },
};

export const Spread: Story = {
  args: { spread: true, children },
};
