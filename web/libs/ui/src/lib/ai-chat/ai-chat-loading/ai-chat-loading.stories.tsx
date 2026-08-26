import type { Meta, StoryObj } from "@storybook/react";
import { AiChatLoading } from "./ai-chat-loading";

const meta: Meta<typeof AiChatLoading> = {
  component: AiChatLoading,
  title: "UI/AI Chat/Loading",
  parameters: {
    docs: {
      description: {
        component:
          "Pixel-grid loading indicator for AI chat. Inspired by Beautiful UI Loading State; styled with HumanSignal semantic tokens for light and dark themes.",
      },
    },
  },
  argTypes: {
    variant: { control: "select", options: ["drive", "dots", "orbit"] },
    showElapsed: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatLoading>;

export const Drive: Story = {
  args: {
    label: "Churning",
    variant: "drive",
    elapsed: "1.4s",
  },
};

export const Dots: Story = {
  args: {
    label: "Working",
    variant: "dots",
    elapsed: "0.8s",
  },
};

export const Orbit: Story = {
  args: {
    label: "Generating",
    variant: "orbit",
    elapsed: "3.2s",
  },
};

export const WithoutElapsed: Story = {
  args: {
    label: "Preparing",
    variant: "drive",
    showElapsed: false,
  },
};
