import type { Meta, StoryObj } from "@storybook/react";
import { AiChatThinking } from "./ai-chat-thinking";

const meta: Meta<typeof AiChatThinking> = {
  component: AiChatThinking,
  title: "UI/AI Chat/Thinking",
  parameters: {
    docs: {
      description: {
        component:
          "Expandable thinking / reasoning traces for AI chat. Inspired by Beautiful UI Thinking; styled with HumanSignal semantic tokens.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatThinking>;

const steps = [
  { primary: "Reading labeling config" },
  { primary: "Scanning sample tasks", secondary: "12 tasks" },
  { primary: "Drafting interface suggestions" },
];

export const Loading: Story = {
  args: {
    status: "loading",
    label: "Thinking",
    steps,
    defaultExpanded: true,
  },
};

export const Complete: Story = {
  args: {
    status: "complete",
    label: "Thinking",
    completedLabel: "Thought for 4 seconds",
    steps,
    defaultExpanded: true,
  },
};

export const IdleCollapsed: Story = {
  args: {
    status: "idle",
    label: "Ready",
    steps,
    defaultExpanded: false,
  },
};

export const SearchStyle: Story = {
  args: {
    status: "complete",
    completedLabel: "Searched knowledge",
    defaultExpanded: true,
    steps: [
      { primary: "Label Studio docs", secondary: "labelstud.io", href: "https://labelstud.io" },
      { primary: "Interface tags", secondary: "tags reference" },
    ],
  },
};
