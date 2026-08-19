import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "../../button/button";
import { Toggle } from "../../toggle/toggle";
import { Typography } from "../../typography/typography";
import { AiChatPromptBar } from "./ai-chat-prompt-bar";

const meta: Meta<typeof AiChatPromptBar> = {
  component: AiChatPromptBar,
  title: "UI/AI Chat/Prompt Bar",
  parameters: {
    docs: {
      description: {
        component:
          "Composer with slots for attach, stop, plan toggle, and model picker. Inspired by Beautiful UI Prompt Bar; HumanSignal semantic tokens only.",
      },
    },
  },
  argTypes: {
    shape: { control: "select", options: ["rounded", "pill"] },
    layout: { control: "select", options: ["stacked", "inline"] },
    status: { control: "select", options: ["idle", "submitting", "streaming"] },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatPromptBar>;

export const Rounded: Story = {
  args: {
    placeholder: "Ask the Interfaces agent…",
    shape: "rounded",
    leadingSlot: (
      <Button type="button" size="smaller" variant="neutral" look="string" aria-label="Attach">
        +
      </Button>
    ),
    trailingSlot: (
      <Typography variant="label" size="smaller" as="span">
        Model
      </Typography>
    ),
  },
};

export const Pill: Story = {
  args: {
    ...Rounded.args,
    shape: "pill",
  },
};

export const StreamingWithStop: Story = {
  args: {
    placeholder: "Generating…",
    status: "streaming",
    value: "Compare mint chip to last summer",
    onStop: () => undefined,
  },
};

export const WithPlanToggle: Story = {
  render: function WithPlanToggleRender() {
    const [value, setValue] = useState("");
    const [planMode, setPlanMode] = useState(false);
    const [status, setStatus] = useState<"idle" | "streaming">("idle");

    return (
      <AiChatPromptBar
        value={value}
        onValueChange={setValue}
        status={status}
        placeholder="Compose a message…"
        leadingSlot={
          <Button type="button" size="smaller" variant="neutral" look="string" aria-label="Attach">
            +
          </Button>
        }
        planToggleSlot={
          <Toggle
            label="Plan"
            checked={planMode}
            onChange={(event) => setPlanMode(event.target.checked)}
            aria-label="Plan mode"
          />
        }
        trailingSlot={
          <Typography variant="label" size="smaller" as="span">
            {planMode ? "Plan" : "Chat"}
          </Typography>
        }
        onSubmit={() => {
          setStatus("streaming");
          setValue("");
        }}
        onStop={() => setStatus("idle")}
      />
    );
  },
};
