import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs";
import { Typography } from "../../typography/typography";
import { AiChatApprovalCard } from "../ai-chat-approval-card";
import { AiChatPromptBar } from "../ai-chat-prompt-bar";
import { AiChatStreamingMessage } from "../ai-chat-streaming-message";
import { AiChatThinking } from "../ai-chat-thinking";
import { AiChatShell } from "./ai-chat-shell";

const meta: Meta<typeof AiChatShell> = {
  component: AiChatShell,
  title: "UI/AI Chat/Chat Shell",
  parameters: {
    docs: {
      description: {
        component:
          "Composition shell for AI chat (header / messages / prompt bar). Inspired by Beautiful UI Chat; HumanSignal semantic tokens only.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatShell>;

export const Empty: Story = {
  args: {
    header: (
      <Typography variant="label" size="small" as="span">
        Interfaces Agent
      </Typography>
    ),
    emptyState: (
      <Typography variant="body" size="small" className="text-neutral-content-subtle">
        Ask anything about your labeling interface.
      </Typography>
    ),
    footer: <AiChatPromptBar placeholder="Message the agent…" />,
  },
};

export const ComposedSession: Story = {
  render: function ComposedSessionRender() {
    const [tab, setTab] = useState("flavors");
    const [value, setValue] = useState("");

    return (
      <AiChatShell
        header={
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="flavors">Flavors</TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            </TabsList>
            <TabsContent value="flavors" />
            <TabsContent value="suppliers" />
          </Tabs>
        }
        footer={
          <AiChatPromptBar
            value={value}
            onValueChange={setValue}
            placeholder="Compare mint chip to last summer"
            onSubmit={() => setValue("")}
          />
        }
      >
        <AiChatThinking
          status="complete"
          completedLabel="Thought for 4s"
          defaultExpanded={false}
          steps={[{ primary: "Pulled summer sales" }, { primary: "Compared weekend peaks" }]}
        />
        <AiChatStreamingMessage status="complete" content="Mint chip is up 12% with stronger weekend peaks." />
        <AiChatApprovalCard
          question="How many flavors should we launch?"
          options={[
            { id: "three", label: "Three (core line)" },
            { id: "five", label: "Five (full case)" },
            { id: "one", label: "Just one hero" },
          ]}
        />
      </AiChatShell>
    );
  },
};
