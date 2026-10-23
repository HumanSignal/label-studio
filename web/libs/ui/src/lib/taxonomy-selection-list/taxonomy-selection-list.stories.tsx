import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TaxonomySelectionList } from "./taxonomy-selection-list";

const meta: Meta<typeof TaxonomySelectionList> = {
  component: TaxonomySelectionList,
  title: "UI/Taxonomy Selection List",
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TaxonomySelectionList>;

export const Default: Story = {
  args: {
    items: [
      { value: "technology/os", label: "Technology / Operating System" },
      { value: "technology/custom", label: "Technology / Custom Label", isUserAdded: true },
    ],
  },
  render: (args) => {
    const [items, setItems] = useState(args.items);
    return (
      <TaxonomySelectionList
        items={items}
        onRemove={(value) => setItems((previous) => previous.filter((item) => item.value !== value))}
      />
    );
  },
};

export const LargeSelection: Story = {
  ...Default,
  args: {
    items: Array.from({ length: 500 }, (_, index) => ({
      value: `category-${index}`,
      label: `Category / Selected Label ${index + 1}`,
    })),
  },
};

export const ReadOnly: Story = {
  args: Default.args,
};
