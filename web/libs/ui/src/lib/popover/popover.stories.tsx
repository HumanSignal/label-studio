import type { Meta, StoryObj } from "@storybook/react";
import { Popover } from "./popover";
import { Button, Tooltip } from "@humansignal/ui";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  args: {
    trigger: <Button>Click me</Button>,
    children: <div className="p-4">Popover content</div>,
  },
};

export const WithForm: Story = {
  args: {
    trigger: <Button>Open Form</Button>,
    children: (
      <div className="p-4 w-80">
        <h4 className="mb-4 font-medium">Settings</h4>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Enter your name" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Enter your email" />
          </div>
          <Button className="w-full">Save</Button>
        </div>
      </div>
    ),
  },
};

export const WithList: Story = {
  args: {
    trigger: <Button>View Options</Button>,
    children: (
      <div className="p-2 w-48">
        <ul className="space-y-1">
          <li>
            <span className="block w-full px-2 py-1.5 text-left hover:bg-accent rounded-sm cursor-pointer">
              Option 1
            </span>
          </li>
          <li>
            <span className="block w-full px-2 py-1.5 text-left hover:bg-accent rounded-sm cursor-pointer">
              Option 2
            </span>
          </li>
          <li>
            <span className="block w-full px-2 py-1.5 text-left hover:bg-accent rounded-sm cursor-pointer">
              Option 3
            </span>
          </li>
        </ul>
      </div>
    ),
  },
};

export const WithCustomAlignment: Story = {
  args: {
    trigger: <Button>Custom Alignment</Button>,
    align: "start",
    sideOffset: 8,
    children: (
      <div className="p-4">
        <p>This popover is aligned to the start and has a larger offset.</p>
      </div>
    ),
  },
};

export const Compound: Story = {
  render: () => (
    <Popover.Root>
      <Tooltip title="Filter annotations">
        <span className="inline-flex">
          <Popover.Trigger asChild>
            <Button>Filter</Button>
          </Popover.Trigger>
        </span>
      </Tooltip>
      <Popover.Content side="right" className="p-4">
        <p>The trigger sits inside a Tooltip, so it is composed with Popover.Root and Popover.Trigger.</p>
      </Popover.Content>
    </Popover.Root>
  ),
};
