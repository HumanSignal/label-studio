import type { Meta, StoryObj } from "@storybook/react";
import { Typography } from "../../typography/typography";
import { AiChatToolActivity } from "./ai-chat-tool-activity";

const meta: Meta<typeof AiChatToolActivity> = {
  component: AiChatToolActivity,
  title: "UI/AI Chat/Tool Activity",
  parameters: {
    docs: {
      description: {
        component:
          "Collapsible tool / activity list for agent runs. Inspired by Beautiful UI Tool Chips and Task Rows; HumanSignal semantic tokens only.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatToolActivity>;

const items = [
  { id: "1", label: "Read project config", detail: "label_config.xml", status: "completed" as const },
  { id: "2", label: "Propose interface XML", detail: "interface.xml", status: "running" as const },
  { id: "3", label: "Validate tags", status: "pending" as const },
  { id: "4", label: "Apply hotkeys", status: "failed" as const },
];

export const Expanded: Story = {
  args: {
    summary: "4 tool calls, 1 message",
    items,
    defaultExpanded: true,
  },
};

export const Collapsed: Story = {
  args: {
    summary: "4 tool calls, 1 message",
    items,
    defaultExpanded: false,
  },
};

export const CustomChildren: Story = {
  args: {
    summary: "Custom activity",
    defaultExpanded: true,
    children: (
      <Typography variant="body" size="small">
        Custom activity body via children slot
      </Typography>
    ),
  },
};
