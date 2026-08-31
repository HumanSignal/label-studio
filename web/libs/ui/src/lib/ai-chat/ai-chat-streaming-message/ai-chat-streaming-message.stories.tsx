import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../../badge/badge";
import { Button } from "../../button/button";
import { AiChatStreamingMessage } from "./ai-chat-streaming-message";

const meta: Meta<typeof AiChatStreamingMessage> = {
  component: AiChatStreamingMessage,
  title: "UI/AI Chat/Streaming Message",
  parameters: {
    docs: {
      description: {
        component:
          "Streaming assistant message with optional sources, actions, and follow-ups. Inspired by Beautiful UI Streaming Text; HS tokens only.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatStreamingMessage>;

export const Streaming: Story = {
  args: {
    status: "streaming",
    content: "Here is a suggested labeling interface for your image classification project —",
  },
};

export const Complete: Story = {
  args: {
    status: "complete",
    content:
      "Here is a suggested labeling interface for your image classification project. Use Choices for mutually exclusive labels and add Hotkeys for faster labeling.",
    sources: (
      <Badge variant="neutral" size="small" look="outline">
        3 sources
      </Badge>
    ),
    actions: (
      <>
        <Button size="small" variant="neutral" look="string">
          Copy
        </Button>
        <Button size="small" variant="neutral" look="string">
          Regenerate
        </Button>
      </>
    ),
    followUps: (
      <>
        <Button size="small" variant="neutral" look="outlined">
          Add bounding boxes
        </Button>
        <Button size="small" variant="neutral" look="outlined">
          Include nested taxonomy
        </Button>
      </>
    ),
  },
};

export const Idle: Story = {
  args: {
    status: "idle",
    content: "Waiting for the next message…",
  },
};
