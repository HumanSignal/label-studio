import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CollapsiblePanel } from "./collapsible-panel";
import { Button } from "../button/button";
import { EmptyState } from "../empty-state/empty-state";
import { Typography } from "../typography/typography";
import { IconUserAdd } from "@humansignal/icons";

const meta: Meta<typeof CollapsiblePanel> = {
  component: CollapsiblePanel,
  title: "UI/CollapsiblePanel",
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "default"],
    },
    disableToggle: {
      control: "boolean",
    },
    defaultExpanded: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof CollapsiblePanel>;

/**
 * Default Collapsible Panel
 *
 * Basic panel with title and content.
 */
export const Default: Story = {
  args: {
    variant: "default",
    title: "Panel Title",
    children: (
      <div className="p-base">
        <p className="text-sm">This is the panel content that can be collapsed or expanded.</p>
      </div>
    ),
  },
};

/**
 * Primary Variant
 *
 * Primary colored panel - use for important selections or actions.
 */
export const Primary: Story = {
  args: {
    variant: "primary",
    title: "Select at least one member",
    children: (
      <div className="p-base">
        <p className="text-sm text-neutral-content-subtle">Selected members will appear here</p>
      </div>
    ),
  },
};

/**
 * With Count Badge
 *
 * Shows a count next to the title.
 */
export const WithCount: Story = {
  args: {
    variant: "primary",
    title: "members selected",
    count: 5,
    children: (
      <div className="p-base">
        <p className="text-sm">John Doe, Jane Smith, Bob Johnson, Alice Brown, Charlie Wilson</p>
      </div>
    ),
  },
};

/**
 * With Actions
 *
 * Panel with action buttons in the header.
 */
export const WithActions: Story = {
  args: {
    variant: "primary",
    title: "3 members selected",
    actions: (
      <Button variant="neutral" look="outlined" size="small">
        Clear Selection
      </Button>
    ),
    children: (
      <div className="p-base">
        <p className="text-sm">John Doe, Jane Smith, Bob Johnson</p>
      </div>
    ),
  },
};

/**
 * With Empty State
 *
 * Panel containing an EmptyState component.
 */
export const WithEmptyState: Story = {
  args: {
    variant: "primary",
    title: "No members selected",
    children: (
      <EmptyState
        className="p-widest"
        size="small"
        icon={<IconUserAdd />}
        title="Select members from below"
        description="Select members to assign them to this resource"
      />
    ),
  },
};

/**
 * Toggle Disabled (Cannot be Collapsed/Expanded)
 *
 * Panel with disabled toggle button - useful when threshold is exceeded.
 * The toggle button is disabled but the rest of the header (title, actions) remains interactive.
 */
export const ToggleDisabled: Story = {
  args: {
    variant: "primary",
    title: "John, Jane, Bob, Alice, Charlie +10 selected",
    disableToggle: true,
    expanded: false,
    actions: (
      <Button variant="neutral" look="outlined" size="small">
        Clear Selection
      </Button>
    ),
    children: null,
  },
};

/**
 * Starts Collapsed
 *
 * Panel that starts in collapsed state.
 */
export const StartsCollapsed: Story = {
  args: {
    variant: "default",
    title: "Advanced Settings",
    defaultExpanded: false,
    children: (
      <div className="p-base">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Setting 1</label>
            <input type="text" className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Setting 2</label>
            <input type="text" className="border rounded px-2 py-1 w-full" />
          </div>
        </div>
      </div>
    ),
  },
};

/**
 * Controlled State
 *
 * Panel with externally controlled expand/collapse state.
 */
export const Controlled: Story = {
  render: () => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button size="small" onClick={() => setIsExpanded(true)}>
            Expand
          </Button>
          <Button size="small" onClick={() => setIsExpanded(false)}>
            Collapse
          </Button>
          <span className="text-sm text-neutral-content-subtle self-center">
            Current state: {isExpanded ? "Expanded" : "Collapsed"}
          </span>
        </div>
        <CollapsiblePanel
          variant="default"
          title="Controlled Panel"
          expanded={isExpanded}
          onExpandedChange={setIsExpanded}
        >
          <div className="p-base">
            <p className="text-sm">This panel's state is controlled by the buttons above.</p>
          </div>
        </CollapsiblePanel>
      </div>
    );
  },
};

/**
 * Multiple Panels
 *
 * Multiple panels stacked together.
 */
export const MultiplePanels: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-3">
        <CollapsiblePanel variant="primary" title="Selection Panel" count={3}>
          <div className="p-base">
            <p className="text-sm">John Doe, Jane Smith, Bob Johnson</p>
          </div>
        </CollapsiblePanel>
        <CollapsiblePanel variant="default" title="Filters" defaultExpanded={false}>
          <div className="p-base">
            <p className="text-sm">Filter options would go here</p>
          </div>
        </CollapsiblePanel>
        <CollapsiblePanel variant="default" title="Settings" defaultExpanded={false}>
          <div className="p-base">
            <p className="text-sm">Settings options would go here</p>
          </div>
        </CollapsiblePanel>
      </div>
    );
  },
};

/**
 * Rich Content
 *
 * Panel with complex content including lists and actions.
 */
export const RichContent: Story = {
  args: {
    variant: "primary",
    title: "5 members selected",
    actions: (
      <div className="flex gap-2">
        <Button variant="negative" look="outlined" size="small">
          Remove All
        </Button>
        <Button variant="primary" size="small">
          Assign
        </Button>
      </div>
    ),
    children: (
      <div className="divide-y divide-neutral-border">
        {["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown", "Charlie Wilson"].map((name) => (
          <div key={name} className="px-base py-tight flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary-background flex items-center justify-center text-xs font-medium">
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <span className="text-sm">{name}</span>
            </div>
            <Button size="smaller" variant="neutral" look="text">
              Remove
            </Button>
          </div>
        ))}
      </div>
    ),
  },
};

/**
 * Real-World: Member Selection Panel
 *
 * Complete example of a member selection panel as used in the members table.
 */
export const MemberSelectionPanel: Story = {
  render: () => {
    const [selectedCount, setSelectedCount] = useState(0);
    const [isExpanded, setIsExpanded] = useState(true);

    const handleClearSelection = () => {
      setSelectedCount(0);
    };

    const handleSelect = (count: number) => {
      setSelectedCount(count);
      setIsExpanded(true);
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleSelect(0)}>
            Select None
          </Button>
          <Button size="small" onClick={() => handleSelect(3)}>
            Select 3
          </Button>
          <Button size="small" onClick={() => handleSelect(15)}>
            Select 15 (Threshold Exceeded)
          </Button>
        </div>

        <CollapsiblePanel
          variant="primary"
          title={
            selectedCount > 0
              ? `${selectedCount} member${selectedCount === 1 ? "" : "s"} selected`
              : "No members selected"
          }
          actions={
            selectedCount > 0 ? (
              <Button variant="neutral" look="outlined" size="small" onClick={handleClearSelection}>
                Clear Selection
              </Button>
            ) : undefined
          }
          expanded={selectedCount > 10 ? false : isExpanded}
          onExpandedChange={setIsExpanded}
          disableToggle={selectedCount > 10}
        >
          {selectedCount === 0 ? (
            <EmptyState
              className="p-widest"
              size="small"
              icon={<IconUserAdd />}
              title="Select members from below"
              description="Select members to assign them to this resource"
            />
          ) : selectedCount <= 10 ? (
            <div className="p-base">
              <Typography variant="body" size="small" className="text-neutral-content-subtle">
                {selectedCount} member{selectedCount === 1 ? "" : "s"} selected
              </Typography>
            </div>
          ) : (
            <div className="p-base">
              <Typography variant="body" size="small" className="text-neutral-content-subtle">
                Too many members selected to display individually. Panel cannot be collapsed.
              </Typography>
            </div>
          )}
        </CollapsiblePanel>
      </div>
    );
  },
};
