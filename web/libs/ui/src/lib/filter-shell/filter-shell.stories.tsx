import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FilterShell } from "./filter-shell";
import { formatFilterOverflowLabel } from "./filter-value-label";
import type { FilterShellAddOption, FilterShellItem } from "./types";

const control = (label: ReactNode, controlId: string) => (
  <button type="button" id={controlId}>
    {label}
  </button>
);

const item = (
  partial: Omit<FilterShellItem, "controlId" | "control" | "valueLabel"> & {
    valueLabel: FilterShellItem["valueLabel"];
  },
): FilterShellItem => {
  const controlId = `filter-shell-${partial.id}-control`;
  return {
    ...partial,
    controlId,
    control: control(partial.valueLabel, controlId),
  };
};

const meta = {
  title: "UI/FilterShell",
  component: FilterShell,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof FilterShell>;

export default meta;
type Story = StoryObj<typeof FilterShell>;

export const PinnedFilters: Story = {
  args: {
    filters: [
      item({
        id: "role",
        label: "Role",
        pinned: true,
        active: true,
        valueLabel: formatFilterOverflowLabel("Owner", 4),
      }),
      item({ id: "type", label: "Type", pinned: true, active: true, valueLabel: "Internal" }),
    ],
    onReset: () => undefined,
  },
};

export const MixedWrapping: Story = {
  args: {
    filters: [
      item({
        id: "role",
        label: "Role",
        pinned: true,
        active: true,
        valueLabel: formatFilterOverflowLabel("Owner", 4),
      }),
      item({
        id: "tags",
        label: "Tags",
        pinned: true,
        valueLabel: formatFilterOverflowLabel("Quality", 2),
      }),
      item({ id: "last-active", label: "Last Active", pinned: true, valueLabel: "Last 30 days" }),
      item({
        id: "skills",
        label: "Skills",
        valueLabel: formatFilterOverflowLabel("Human Review", 4),
        onRemove: () => undefined,
      }),
      item({ id: "status", label: "Status", valueLabel: "Active", onRemove: () => undefined }),
    ],
    onReset: () => undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
};

const addOptions: FilterShellAddOption[] = [
  { id: "skills", label: "Skills", group: "Member" },
  { id: "status", label: "Status", group: "Member" },
  { id: "date-added", label: "Date Added", group: "Activity" },
];

const InteractiveAddFilterStory = () => {
  const [filters, setFilters] = useState<FilterShellItem[]>([]);

  return (
    <FilterShell
      filters={filters}
      addFilter={{
        options: addOptions.filter((option) => !filters.some((filter) => filter.id === option.id)),
        searchPlaceholder: "Search filters",
        onSelect: (id) => {
          const option = addOptions.find((candidate) => candidate.id === id);
          if (!option) return;
          const controlId = `filter-shell-${id}-control`;
          setFilters((current) => [
            ...current,
            {
              id,
              label: option.label,
              controlId,
              valueLabel: "Any",
              control: control("Any", controlId),
              onRemove: () => setFilters((items) => items.filter((entry) => entry.id !== id)),
            },
          ]);
        },
      }}
      onReset={() => setFilters([])}
    />
  );
};

export const GroupedAddFilter: Story = {
  args: {
    filters: [],
  },
  render: () => <InteractiveAddFilterStory />,
};

export const DateRangeControl: Story = {
  args: {
    filters: [
      item({ id: "created", label: "Date Created", pinned: true, active: true, valueLabel: "Aug 1 – Aug 20, 2026" }),
    ],
    onReset: () => undefined,
  },
};
