import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./select";
import { Badge } from "../badge/badge";
import { BadgeGroup } from "../badge-group";
import { Button } from "../button/button";

const thousandOptions = (() => {
  return Array.from({ length: 1000 }, (_, i) => `Option ${i}`);
})();

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: {
    layout: "centered",
    // Keep declaration order: without this, Storybook alphabetizes and buries `size`.
    controls: { sort: "none" },
  },
  args: {
    size: "medium",
  },
  // Select's generic forwardRef signature defeats docgen, so controls must be declared by hand.
  // `size` is first so it stays at the top of the Controls panel.
  argTypes: {
    size: {
      control: "select",
      options: ["smaller", "small", "medium"],
      description: "Heights match the Button of the same name: smaller 24px, small 32px, medium 40px.",
      table: { defaultValue: { summary: "medium" } },
    },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    searchable: { control: "boolean" },
    multiple: { control: "boolean" },
    isInline: { control: "boolean" },
    isLoading: { control: "boolean" },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    size: "medium",
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

/**
 * Read-only: trigger stays clickable so the dropdown can open for inspection,
 * but options and bulk actions cannot change the value. Search remains available.
 * Contrast with `Disabled`, which greys out the trigger and blocks opening.
 */
export const ReadOnly: Story = {
  args: {
    placeholder: "Select columns",
    options: [
      { key: "id", title: "ID", value: "id" },
      { key: "agreement", title: "Agreement", value: "agreement", group: "Agreement" },
      { key: "dim_1", title: "Dimension 1", value: "dim_1", group: "Agreement" },
      { key: "annot_completed", title: "Annotation Completed At", value: "annot_completed", group: "Annotations" },
    ] as any[],
    value: ["id", "agreement"],
    multiple: true,
    searchable: true,
    searchPlaceholder: "Search columns",
    groupBy: "group",
    showGroupActions: true,
    readOnly: true,
    label: "read-only select (openable, non-editable)",
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

/**
 * Flat options with groupBy: options include a field (e.g. `parent`) and `groupBy="parent"` renders
 * subtle headers above each group. Options without the field go in an ungrouped leading section.
 */
export const WithGroupBy: Story = {
  args: {
    placeholder: "Select a column",
    searchable: true,
    searchPlaceholder: "Search columns",
    groupBy: "group",
    options: [
      { key: "id", title: "ID", value: "id" },
      { key: "inner_id", title: "Inner ID", value: "inner_id" },
      { key: "task_state", title: "Task State", value: "task_state" },
      { key: "agreement", title: "Agreement", value: "agreement", group: "Agreement" },
      { key: "dim_1", title: "Dimension 1", value: "dim_1", group: "Agreement" },
      { key: "annot_completed", title: "Annotation Completed At", value: "annot_completed", group: "Annotations" },
      { key: "lead_time", title: "Lead Time", value: "lead_time", group: "Annotations" },
      { key: "summary", title: "summary", value: "summary", group: "Data", readableType: "TextArea" },
      { key: "rating", title: "rating", value: "rating", group: "Data", readableType: "Rating" },
      { key: "heading", title: "heading", value: "heading", group: "Data", readableType: "str" },
      { key: "author", title: "author", value: "author", group: "Data", readableType: "str" },
    ] as any[],
    label: "With groupBy (single-select)",
  },
};

export const WithGroupByMultiple: Story = {
  args: {
    ...WithGroupBy.args,
    multiple: true,
    value: ["id", "task_state"],
    label: "With groupBy (multi-select)",
  },
};

/**
 * Multi-select with groupBy and showGroupActions enabled.
 * Hovering a group header or any of its items reveals "All" / "None" buttons
 * that bulk-select or deselect the entire group in a single onChange call.
 * Disabled items are skipped by the bulk actions.
 */
export const WithGroupByMultipleAndGroupActions: Story = {
  args: {
    ...WithGroupBy.args,
    multiple: true,
    value: ["id", "task_state"],
    showGroupActions: true,
    label: "With groupBy + group actions (All / None)",
    options: [
      { key: "id", title: "ID", value: "id" },
      { key: "inner_id", title: "Inner ID", value: "inner_id" },
      { key: "task_state", title: "Task State", value: "task_state" },
      { key: "agreement", title: "Agreement", value: "agreement", group: "Agreement" },
      { key: "dim_1", title: "Dimension 1", value: "dim_1", group: "Agreement" },
      {
        key: "dim_2",
        title: "Dimension 2 (disabled)",
        value: "dim_2",
        group: "Agreement",
        disabled: true,
      },
      { key: "annot_completed", title: "Annotation Completed At", value: "annot_completed", group: "Annotations" },
      { key: "lead_time", title: "Lead Time", value: "lead_time", group: "Annotations" },
      { key: "summary", title: "summary", value: "summary", group: "Data", readableType: "TextArea" },
      { key: "rating", title: "rating", value: "rating", group: "Data", readableType: "Rating" },
      { key: "heading", title: "heading", value: "heading", group: "Data", readableType: "str" },
      { key: "author", title: "author", value: "author", group: "Data", readableType: "str" },
    ] as any[],
  },
};

/**
 * groupBy with custom option content via optionRenderer (e.g. type badges).
 */
export const WithGroupByAndOptionRenderer: Story = {
  args: {
    placeholder: "Select a column",
    searchable: true,
    searchPlaceholder: "Search columns",
    groupBy: "group",
    options: [
      { key: "summary", title: "summary", value: "summary", group: "Data", readableType: "TextArea" },
      { key: "rating", title: "rating", value: "rating", group: "Data", readableType: "Rating" },
      { key: "heading", title: "heading", value: "heading", group: "Data", readableType: "str" },
      { key: "author", title: "author", value: "author", group: "Data", readableType: "str" },
    ] as any[],
    optionRenderer: ({ option }) => (
      <span className="flex w-full items-center justify-between gap-2">
        <span>{option?.title ?? option?.label ?? option?.value}</span>
        {option?.readableType && (
          <Badge variant="secondary" shape="squared" className="text-[10px]">
            {option.readableType}
          </Badge>
        )}
      </span>
    ),
    label: "With groupBy and optionRenderer (type badges)",
  },
};

/**
 * Demonstrates the controlled `open` prop with a footer Apply button.
 *
 * The dropdown stays open while the user makes selections. Clicking Apply
 * commits the pending selection and closes the dropdown by setting
 * `open={false}` via the controlled prop. Clicking outside or pressing
 * Escape also closes via the `onClose` callback.
 */
export const ControlledOpenWithFooterApply: Story = {
  render: () => {
    const options = [
      { value: "javascript", label: "JavaScript" },
      { value: "typescript", label: "TypeScript" },
      { value: "react", label: "React" },
      { value: "vue", label: "Vue" },
      { value: "angular", label: "Angular" },
      { value: "node", label: "Node.js" },
      { value: "python", label: "Python" },
      { value: "django", label: "Django" },
    ];

    const [isOpen, setIsOpen] = useState(false);
    const [pending, setPending] = useState<string[]>([]);
    const [applied, setApplied] = useState<string[]>([]);

    const handleApply = () => {
      setApplied(pending);
      setIsOpen(false);
    };

    const hasChanges = pending.length !== applied.length || pending.some((v) => !applied.includes(v));

    return (
      <div className="flex flex-col gap-4 w-[350px]">
        <Select
          multiple
          searchable
          open={isOpen}
          value={isOpen ? pending : applied}
          options={options as any[]}
          placeholder="Select technologies..."
          label="Controlled open + footer Apply"
          onOpen={() => {
            setPending(applied);
            setIsOpen(true);
          }}
          onClose={() => setIsOpen(false)}
          onChange={(vals: any) => setPending(Array.isArray(vals) ? vals.map((v: any) => v?.value ?? v) : [])}
          footer={
            <Button
              variant="primary"
              look="filled"
              size="small"
              className="w-full"
              disabled={!hasChanges}
              onClick={handleApply}
            >
              Apply
            </Button>
          }
        />
        <p className="text-sm text-neutral-content">Applied: {applied.length > 0 ? applied.join(", ") : "none"}</p>
      </div>
    );
  },
};

/**
 * The trigger keeps its declared height whichever axis the parent flexes along. Column-flex and
 * grid parents used to hand the block axis to the trigger's own `flex` basis/grow, which stretched
 * or collapsed it away from that height.
 */
export const TriggerHeightInFlexParents: Story = {
  render: () => {
    const options = ["Apple", "Banana", "Blueberry"] as any[];

    return (
      <div className="flex flex-col gap-6 w-[420px]">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-content-subtler">Column-flex parent</span>
          <Select placeholder="Select a fruit" options={options} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-content-subtler">Row-flex parent, sharing space</span>
          <div className="flex flex-row gap-2">
            <Select placeholder="Select a fruit" options={options} />
            <Button look="outlined">Action</Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-content-subtler">Grid parent</span>
          <div className="grid grid-cols-2 gap-2">
            <Select placeholder="Select a fruit" options={options} />
            <Select placeholder="Select a fruit" options={options} size="small" />
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Each size matches the Button of the same name — medium 40px, small 32px, smaller 24px — so the
 * two line up when they sit side by side. `triggerClassName` still wins for the rare layout that
 * needs a height outside the scale.
 */
export const SizesMatchButton: Story = {
  render: () => {
    const options = ["Apple", "Banana", "Blueberry"] as any[];
    const sizes = ["medium", "small", "smaller"] as const;

    return (
      <div className="flex flex-col gap-6 w-[480px]">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col gap-2">
            <span className="text-sm text-neutral-content-subtler">{size}</span>
            <div className="flex flex-row items-center gap-2">
              <Select placeholder="Select a fruit" options={options} size={size} />
              <Button look="outlined" size={size}>
                Action
              </Button>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-content-subtler">Custom height via triggerClassName</span>
          <Select placeholder="Select a fruit" options={options} triggerClassName="!h-[36px]" />
        </div>
      </div>
    );
  },
};
