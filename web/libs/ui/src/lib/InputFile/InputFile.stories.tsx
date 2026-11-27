import type { Meta, StoryObj } from "@storybook/react";
import { InputFile } from "./InputFile";

const meta: Meta<typeof InputFile> = {
  component: InputFile,
  title: "Inputs/InputFile",
  argTypes: {
    onChange: { action: "changed" },
  },
};

export default meta;
type Story = StoryObj<typeof InputFile>;

export const Default: Story = {
  args: { text: "Choose a file" },
};

export const ImagesOnly: Story = {
  args: { text: "Choose an image", accept: "image/*" },
};

/** `medium` 40px, `small` 32px, `smaller` 24px: the same heights as every other control. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-base">
      <InputFile text="Medium" size="medium" />
      <InputFile text="Small" size="small" />
      <InputFile text="Smaller" size="smaller" />
    </div>
  ),
};
