import type { Meta, StoryObj } from "@storybook/react";
import { InputFile } from "./InputFile";

const meta: Meta<typeof InputFile> = {
  component: InputFile,
  title: "UI/InputFile",
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
