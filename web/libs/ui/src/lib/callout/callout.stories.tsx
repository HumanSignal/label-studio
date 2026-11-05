import type { Meta, StoryObj } from "@storybook/react";
import { WarningIcon } from "@humansignal/icons";
import { Callout, CalloutContent, CalloutHeader, CalloutIcon, CalloutTitle } from "./callout";

const meta: Meta<typeof Callout> = {
  component: Callout,
  title: "UI/Callout",
  argTypes: {
    variant: { control: "select", options: ["warning"] },
  },
};

export default meta;
type Story = StoryObj<typeof Callout>;

export const Warning: Story = {
  args: { variant: "warning" },
  render: (args) => (
    <Callout {...args}>
      <CalloutHeader>
        <CalloutIcon>
          <WarningIcon size={18} weight="bold" />
        </CalloutIcon>
        <CalloutTitle>Storage sync is paused</CalloutTitle>
      </CalloutHeader>
      <CalloutContent>New tasks will not be imported until the bucket credentials are updated.</CalloutContent>
    </Callout>
  ),
};
