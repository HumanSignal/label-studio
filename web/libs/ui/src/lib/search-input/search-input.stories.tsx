import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SearchInput } from "./search-input";

const meta: Meta<typeof SearchInput> = {
  title: "Inputs/SearchInput",
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

/** With text, a clear button appears at the end of the field, sized with the control. */
export const WithText: Story = {
  render: (args) => (
    <div className="flex flex-col gap-base">
      <SearchInput {...args} size="medium" defaultValue="Vehicle" />
      <SearchInput {...args} size="small" defaultValue="Vehicle" />
      <SearchInput {...args} size="smaller" defaultValue="Vehicle" />
    </div>
  ),
};

/** `medium` 40px, `small` 32px, `smaller` 24px: the same heights as every other control. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-base">
      <SearchInput {...args} size="medium" placeholder="Medium · 40px" />
      <SearchInput {...args} size="small" placeholder="Small · 32px" />
      <SearchInput {...args} size="smaller" placeholder="Smaller · 24px" />
    </div>
  ),
};
