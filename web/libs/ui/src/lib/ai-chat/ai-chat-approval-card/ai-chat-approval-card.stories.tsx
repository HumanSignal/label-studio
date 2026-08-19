import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Badge } from "../../badge/badge";
import { Button } from "../../button/button";
import { AiChatApprovalCard } from "./ai-chat-approval-card";

const meta: Meta<typeof AiChatApprovalCard> = {
  component: AiChatApprovalCard,
  title: "UI/AI Chat/Approval Card",
  parameters: {
    docs: {
      description: {
        component:
          "Human-in-the-loop approval choices for AI chat. Inspired by Beautiful UI Approval Card; HumanSignal semantic tokens only.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatApprovalCard>;

const flavorOptions = [
  { id: "three", label: "Three (core line)", description: "Launch mint, vanilla, pistachio" },
  { id: "five", label: "Five (full case)", description: "Add two seasonal SKUs" },
  { id: "one", label: "Just one hero", description: "Ship a single flagship flavor" },
];

export const Default: Story = {
  args: {
    question: "How many flavors should we launch?",
    description: "The agent will wait for your choice before changing the interface.",
    options: flavorOptions,
    badge: (
      <Badge variant="primary" size="small" look="outline">
        Needs approval
      </Badge>
    ),
  },
};

export const WithConfirm: Story = {
  render: function WithConfirmRender() {
    const [selectedId, setSelectedId] = useState<string | undefined>("three");
    const [confirmed, setConfirmed] = useState<string | null>(null);
    return (
      <AiChatApprovalCard
        question="Apply this labeling config change?"
        options={[
          { id: "apply", label: "Apply to project" },
          { id: "draft", label: "Save as draft" },
          { id: "reject", label: "Reject" },
        ]}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onConfirm={(id) => setConfirmed(id)}
        confirmLabel="Confirm"
        actions={
          confirmed ? (
            <Badge variant="positive" size="small">
              Confirmed: {confirmed}
            </Badge>
          ) : undefined
        }
      />
    );
  },
};

export const CustomActions: Story = {
  args: {
    question: "Publish interface revisions?",
    options: [
      { id: "yes", label: "Yes, publish" },
      { id: "no", label: "Not yet" },
    ],
    actions: (
      <>
        <Button type="button" size="small" variant="neutral" look="outlined">
          Cancel
        </Button>
        <Button type="button" size="small" variant="primary">
          Continue
        </Button>
      </>
    ),
  },
};
