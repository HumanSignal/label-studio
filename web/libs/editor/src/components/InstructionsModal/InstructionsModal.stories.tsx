import { FF_MODAL_WINDOW_APP_CHROME } from "@humansignal/core/lib/utils/feature-flags";
import type { Meta, StoryObj } from "@storybook/react";
import { InstructionsModal } from "./InstructionsModal";

const INSTRUCTIONS =
  "Read the whole text before labeling.\nPick the sentiment that best fits the author's tone, not your own opinion.\nSkip the task when the text is not in English.";

const withModalWindowFlag = (Story: () => JSX.Element) => {
  const settings = ((window as any).APP_SETTINGS ??= {});
  settings.feature_flags = { ...(settings.feature_flags ?? {}), [FF_MODAL_WINDOW_APP_CHROME]: true };
  return <Story />;
};

const meta: Meta<typeof InstructionsModal> = {
  component: InstructionsModal,
  title: "Editor/InstructionsModal",
  decorators: [withModalWindowFlag],
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
