import type { Meta, StoryObj } from "@storybook/react";
import { InstructionsModal } from "./InstructionsModal";

const INSTRUCTIONS =
  "Read the whole text before labeling.\nPick the sentiment that best fits the author's tone, not your own opinion.\nSkip the task when the text is not in English.";

const meta: Meta<typeof InstructionsModal> = {
  component: InstructionsModal,
  title: "Editor/InstructionsModal",
};
export default meta;

type Story = StoryObj<typeof InstructionsModal>;

/** The dialog as the classic editor shows it (Show instructions). */
export const Default: Story = {
  render: () => (
    <InstructionsModal title="Labeling Instructions" visible onCancel={() => {}}>
      {INSTRUCTIONS}
    </InstructionsModal>
  ),
};
