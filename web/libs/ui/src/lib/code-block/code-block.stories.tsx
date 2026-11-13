import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "./code-block";

const meta: Meta<typeof CodeBlock> = {
  component: CodeBlock,
  title: "UI/CodeBlock",
  argTypes: {
    variant: { control: "select", options: ["neutral", "warning", "negative"] },
    allowCopy: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

const code = `<View>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
  </Choices>
</View>`;

export const Default: Story = {
  args: { code, title: "Labeling config" },
};

export const WithDescription: Story = {
  args: { code, title: "Labeling config", description: "Paste this into the project settings", allowCopy: true },
};

export const Warning: Story = {
  args: { code: "LABEL_STUDIO_HOST is not set", variant: "warning" },
};

export const Negative: Story = {
  args: { code: "ValidationError: toName must reference an existing tag", variant: "negative" },
};
