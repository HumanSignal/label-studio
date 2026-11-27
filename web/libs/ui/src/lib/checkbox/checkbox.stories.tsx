import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox } from "./checkbox";
import { action } from "storybook/actions";

const meta: Meta<typeof Checkbox> = {
  component: Checkbox,
  title: "Inputs/Checkbox",
  argTypes: {
    checked: { control: "boolean" },
    indeterminate: { control: "boolean" },
    onChange: { action: "changed" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    children: "Default Checkbox",
  },
};

export const Checked: Story = {
  args: {
    children: "Checked Checkbox",
    checked: true,
  },
};

export const Unchecked: Story = {
  args: {
    children: "Unchecked Checkbox",
    checked: false,
  },
};

/** A "select all" box is indeterminate while only some of its items are checked. */
export const Indeterminate: Story = {
  render: function SelectAll() {
    const items = ["Images", "Audio", "Text"];
    const [selected, setSelected] = useState<string[]>(["Images"]);
    const all = selected.length === items.length;
    return (
      <div className="flex flex-col gap-tight">
        <Checkbox
          checked={all}
          indeterminate={selected.length > 0 && !all}
          onChange={() => setSelected(all ? [] : items)}
        >
          Select all
        </Checkbox>
        <div className="flex flex-col gap-tight pl-base">
          {items.map((item) => (
            <Checkbox
              key={item}
              checked={selected.includes(item)}
              onChange={(event) =>
                setSelected(event.target.checked ? [...selected, item] : selected.filter((other) => other !== item))
              }
            >
              {item}
            </Checkbox>
          ))}
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Checkbox",
    disabled: true,
  },
};

export const WithoutLabel: Story = {
  args: {},
};

export const WithCustomStyle: Story = {
  args: {
    children: "Custom Style Checkbox",
    style: { backgroundColor: "lightblue", padding: "10px" },
  },
};

export const WithChangeHandler: Story = {
  args: {
    children: "Checkbox with Change Handler",
    onChange: action("Checkbox changed"),
  },
};
