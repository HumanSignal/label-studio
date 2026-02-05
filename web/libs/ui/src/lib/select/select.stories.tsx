import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./select";
import { BadgeGroup } from "../badge-group";

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

export const MultipleWithBadges: Story = {
  render: () => {
    return (
      <div className="w-[350px] border border-dashed border-neutral-border p-tight">
        <Select
          multiple
          searchable
          value={["javascript", "react", "typescript", "vue", "angular"]}
          options={[
            { value: "javascript", label: "JavaScript" },
            { value: "typescript", label: "TypeScript" },
            { value: "react", label: "React" },
            { value: "vue", label: "Vue" },
            { value: "angular", label: "Angular" },
            { value: "node", label: "Node.js" },
            { value: "python", label: "Python" },
            { value: "django", label: "Django" },
          ]}
          placeholder="Choose technologies..."
          renderSelected={(selectedOptions) => {
            if (!selectedOptions || selectedOptions?.length === 0) return null;
            return (
              <BadgeGroup
                items={
                  selectedOptions?.map((opt: any) => ({
                    id: opt?.value ?? opt,
                    label: opt?.label ?? opt?.value ?? opt,
                  })) ?? []
                }
                variant="info"
                shape="squared"
              />
            );
          }}
        />
      </div>
    );
  },
};

const techOptions = Array.from({ length: 100 }, (_, i) => ({
  value: `tech-${i}`,
  label: `Technology ${i}`,
}));

/**
 * Multiple Select with Virtual List and Search - Base Demo
 *
 * This story demonstrates the new "Selected Items Group" feature that appears
 * at the top of the dropdown when:
 * - multiple={true}
 * - searchable={true}
 * - isVirtualList={true}
 * - Items are selected
 *
 * The group starts collapsed by default. Click the caret to expand and see
 * all selected items. Selected items also appear in their normal position
 * in the list (dual representation).
 */
export const MultipleSelectWithVirtualListAndSearch: Story = {
  args: {
    multiple: true,
    searchable: true,
    isVirtualList: true,
    value: ["tech-5", "tech-12", "tech-23", "tech-45", "tech-67"],
    options: techOptions as any[],
    placeholder: "Select technologies...",
    label: "Multiple Select with Selected Items Group",
  },
};
