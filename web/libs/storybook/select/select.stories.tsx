import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "../../ui/src/lib/select/select";

const thousandOptions = (() => {
  return Array.from({ length: 1000 }, (_, i) => `Option ${i}`);
})();

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    placeholder: "Select a fruit",
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    label: "default",
  },
};

export const Searchable: Story = {
  args: {
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    placeholder: "searchable select",
    searchable: true,
  },
};

export const Inline: Story = {
  args: {
    placeholder: "inline select",
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    isInline: true,
  },
};

export const Required: Story = {
  args: {
    placeholder: "Select a fruit",
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    label: "required",
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Select a fruit",
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    label: "disabled select",
    disabled: true,
  },
};

export const WithComplexOptions: Story = {
  args: {
    placeholder: "Select a fruit",
    value: "Blueberry",
    searchable: true,
    options: [
      {
        value: "Apple",
        disabled: true,
      },
      {
        value: "Banana",
        label: (
          <>
            <span>Banana</span>
            <span className="text-sm"> - 10</span>
            <span className="text-lg"> other element</span>
          </>
        ),
      },
      {
        value: "Blueberry",
        label: (
          <>
            <span>Blueberry</span>
            <span className="text-sm"> - 15</span>
          </>
        ),
        disabled: true,
      },
      "Grapes",
      "Pineapple",
    ] as any[],
    label: "Fancy option",
  },
};

export const WithCustomTestId: Story = {
  args: {
    placeholder: "custom testid",
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    "data-testid": "my-select",
  } as any,
};

export const WithManyOptions: Story = {
  args: {
    options: thousandOptions as any[],
    label: "Thousand options",
  },
};

export const WithManyOptionsSearchableVirtualList: Story = {
  args: {
    options: thousandOptions as any[],
    label: "Thousand options (searchable + virtual list)",
    searchable: true,
    isVirtualList: true,
  },
};

export const Loading: Story = {
  args: {
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    label: "In progress",
    isLoading: true,
  },
};

export const MultipleSelect: Story = {
  args: {
    placeholder: "Multiple Selector",
    options: [
      "Apple",
      "Banana",
      "Blueberry",
      { label: "Grapes", children: ["Small", "Large", "Green", "Red"] },
      "Pineapple",
    ] as any[],
    multiple: true,
    searchable: true,
  },
};

export const MultipleSelectWithValues: Story = {
  args: {
    value: ["Blueberry", "Banana"],
    options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"] as any[],
    multiple: true,
  },
};

export const BooleanValues: Story = {
  args: {
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ] as any[],
    label: "Boolean values",
  },
};

export const WithRenderSelected: Story = {
  args: {
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ] as any[],
    label: "Boolean values with renderSelected",
    renderSelected: (selectedOptions, placeholder) => {
      if (selectedOptions.length > 0) {
        return `${selectedOptions
          .map((option) => (typeof option === "string" ? option : (option as any).label))
          .join(", ")} and such`;
      }
      return placeholder;
    },
    multiple: true,
  },
};

export const WithCustomRenderSelected: Story = {
  args: {
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ] as any[],
    label: "Boolean values with renderSelected",
    renderSelected: () => "Always show this",
  },
};
