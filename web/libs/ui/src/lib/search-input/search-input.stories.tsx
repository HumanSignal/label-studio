import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SearchInput } from "./search-input";

const meta: Meta<typeof SearchInput> = {
  title: "UI/SearchInput",
  component: SearchInput,
  args: { "aria-label": "Search labels", placeholder: "Search labels..." },
  decorators: [
    (Story) => (
      <div style={{ width: 320, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { value: "Vehicle", readOnly: true } };
export const Controlled: Story = {
  render: function ControlledSearch(args) {
    const [value, setValue] = useState("");
    return <SearchInput {...args} value={value} onChange={(event) => setValue(event.target.value)} />;
  },
};
