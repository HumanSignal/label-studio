import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "../button/button";
import { Space } from "../space/space";
import { Label } from "../label/label";
import { Dropdown } from "./dropdown";
import { DropdownTrigger } from "./dropdown-trigger";
import type { Align } from "@humansignal/core/lib/utils/dom";
import {
  CopyIcon,
  DotsThreeIcon,
  IconUserEdit,
  IconSettings,
  IconCross,
  IconBell,
  IconChevronDown,
  PlayIcon,
  PowerIcon,
  SlidersHorizontalIcon,
  TrashIcon,
} from "@humansignal/icons";

const meta = {
  component: DropdownTrigger,
  title: "Navigation/Dropdown",
  parameters: {
    layout: "centered",
  },
  argTypes: {
    animated: {
      control: "boolean",
      description: "Enable animation on open/close",
      defaultValue: true,
    },
    alignment: {
      control: "select",
      options: ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"],
      description: "Dropdown alignment relative to trigger",
    },
    enabled: {
      control: "boolean",
      description: "Enable/disable dropdown (when disabled, prevents opening)",
      defaultValue: true,
    },
    disabled: {
      control: "boolean",
      description: "Disable the dropdown trigger",
      defaultValue: false,
    },
    inline: {
      control: "boolean",
      description: "Render inline instead of using portal",
    },
    syncWidth: {
      control: "boolean",
      description: "Sync dropdown width to match trigger width",
    },
    constrainHeight: {
      control: "boolean",
      description: "Constrain dropdown height to prevent overflow",
    },
    closeOnClickOutside: {
      control: "boolean",
      description: "Close dropdown when clicking outside",
      defaultValue: true,
    },
    toggle: {
      control: "boolean",
      description: "If false, clicking trigger only opens dropdown (doesn't toggle)",
      defaultValue: true,
    },
  },
} satisfies Meta<typeof DropdownTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample dropdown content using semantic tokens - styled like Select component
const MenuContent = ({ items = 3, fullWidth = false }: { items?: number; fullWidth?: boolean }) => (
  <div className={`p-tight flex flex-col gap-tightest ${fullWidth ? "w-full" : "w-max"}`}>
    {Array.from({ length: items }, (_, i) => (
      <button
        key={i}
        type="button"
        className={`w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle ${fullWidth ? "" : "whitespace-nowrap"}`}
        onClick={() => console.log(`Item ${i + 1} clicked`)}
      >
        Menu Item {i + 1}
      </button>
    ))}
  </div>
);

// Basic Examples
export const Default: Story = {
  args: {
    alignment: "bottom-left",
    animated: true,
    enabled: true,
    disabled: false,
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <Button>Click to Open</Button>
    </Dropdown.Trigger>
  ),
};

export const WithCustomContent: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={
        <div className="w-80 p-base flex flex-col gap-base">
          <div>
            <h3 className="text-heading-small font-medium text-primary-foreground mb-tight">Custom Dropdown</h3>
            <p className="text-body-small text-secondary-foreground">
              This is a custom dropdown with rich content including text and interactive elements.
            </p>
          </div>
          <div className="flex flex-col gap-tight">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-base py-tight border border-neutral-border rounded-base bg-primary-background text-primary-foreground"
            />
            <Button className="w-full">Submit</Button>
          </div>
        </div>
      }
    >
      <Button>Open Custom Dropdown</Button>
    </Dropdown.Trigger>
  ),
};

// Alignment Examples
export const AllAlignments: Story = {
  render: (args) => {
    const alignmentShorthand: Record<string, string> = {
      "top-left": "↑←",
      "top-center": "↑↕",
      "top-right": "↑→",
      "bottom-left": "↓←",
      "bottom-center": "↓↕",
      "bottom-right": "↓→",
    };

    return (
      <div className="grid grid-cols-3 gap-loose">
        {(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as Align[]).map(
          (alignment) => (
            <div key={alignment} className="flex justify-center">
              <Dropdown.Trigger {...args} alignment={alignment} content={<MenuContent />}>
                <Button>{alignmentShorthand[alignment]}</Button>
              </Dropdown.Trigger>
            </div>
          ),
        )}
      </div>
    );
  },
};

// Width and Height Constraints
export const SyncWidth: Story = {
  args: {
    syncWidth: true,
    alignment: "bottom-left",
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent fullWidth />}>
      <Button className="w-80">Wide Button - Dropdown Syncs Width</Button>
    </Dropdown.Trigger>
  ),
};

export const ConstrainHeight: Story = {
  args: {
    constrainHeight: true,
    alignment: "bottom-left",
  },
  render: (args) => (
    <div className="h-[200px] flex items-center">
      <Dropdown.Trigger {...args} content={<MenuContent items={100} />}>
        <Button>Constrained Height (many items)</Button>
      </Dropdown.Trigger>
    </div>
  ),
};

// Animation Examples
export const WithAnimation: Story = {
  args: {
    animated: true,
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <Button>Animated Dropdown</Button>
    </Dropdown.Trigger>
  ),
};

export const WithoutAnimation: Story = {
  args: {
    animated: false,
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <Button>Non-Animated Dropdown</Button>
    </Dropdown.Trigger>
  ),
};

// State Examples
export const DisabledTrigger: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <Button disabled>Disabled Trigger</Button>
    </Dropdown.Trigger>
  ),
};

export const DisabledDropdown: Story = {
  args: {
    enabled: false,
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <Button>Dropdown Disabled (Click Won't Open)</Button>
    </Dropdown.Trigger>
  ),
};

export const ControlledVisibility: Story = {
  render: (args) => {
    const [visible, setVisible] = useState(false);

    return (
      <Space direction="vertical" size="base">
        <Space direction="horizontal" size="tight">
          <Button onClick={() => setVisible(true)}>Open Dropdown</Button>
          <Button onClick={() => setVisible(false)}>Close Dropdown</Button>
          <Button onClick={() => setVisible(!visible)}>Toggle Dropdown</Button>
        </Space>
        <Dropdown.Trigger {...args} visible={visible} onToggle={setVisible} content={<MenuContent />}>
          <Button>Controlled Dropdown</Button>
        </Dropdown.Trigger>
      </Space>
    );
  },
};

// Behavior Examples
export const OpenOnlyMode: Story = {
  args: {
    toggle: false,
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <Button>Click Only Opens (Doesn't Toggle)</Button>
    </Dropdown.Trigger>
  ),
};

export const NoCloseOnClickOutside: Story = {
  args: {
    closeOnClickOutside: false,
  },
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <Button>Won't Close on Outside Click</Button>
    </Dropdown.Trigger>
  ),
};

// Nested Dropdowns
export const NestedDropdowns: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      alignment="bottom-left"
      content={
        <div className="p-tight flex flex-col gap-tightest w-max">
          <button
            type="button"
            className="w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle whitespace-nowrap"
          >
            Regular Item
          </button>
          <Dropdown.Trigger
            style={{
              left: "calc(anchor(right) + 4px)",
              top: "anchor(top)",
              right: "auto",
              bottom: "auto",
            }}
            content={
              <div className="p-tight flex flex-col gap-tightest w-max">
                <button
                  type="button"
                  className="w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle whitespace-nowrap"
                >
                  Nested Item 1
                </button>
                <button
                  type="button"
                  className="w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle whitespace-nowrap"
                >
                  Nested Item 2
                </button>
                <button
                  type="button"
                  className="w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle whitespace-nowrap"
                >
                  Nested Item 3
                </button>
              </div>
            }
          >
            <button
              type="button"
              className="w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle whitespace-nowrap"
            >
              Nested Dropdown →
            </button>
          </Dropdown.Trigger>
          <button
            type="button"
            className="w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle whitespace-nowrap"
          >
            Another Item
          </button>
        </div>
      }
    >
      <Button>Nested Dropdowns</Button>
    </Dropdown.Trigger>
  ),
};

// Inline Rendering
export const InlineDropdown: Story = {
  args: {
    inline: true,
  },
  render: (args) => (
    <div className="relative border border-dashed border-neutral-border p-loose rounded-base">
      <p className="text-body-small text-secondary-foreground mb-base">
        This dropdown renders inline (no portal) within this bordered container.
      </p>
      <Dropdown.Trigger {...args} content={<MenuContent />}>
        <Button>Inline Dropdown</Button>
      </Dropdown.Trigger>
    </div>
  ),
};

// Advanced Use Cases
export const WithCustomTrigger: Story = {
  render: (args) => (
    <Dropdown.Trigger {...args} content={<MenuContent />}>
      <div className="cursor-pointer bg-accent-background text-accent-foreground px-base py-tight rounded-base hover:bg-accent-surface-hover transition-colors">
        Custom Trigger Element
      </div>
    </Dropdown.Trigger>
  ),
};

export const WithCallbacks: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={<MenuContent />}
      onToggle={(visible) => console.log("onToggle:", visible)}
      onVisibilityChanged={(visible) => console.log("onVisibilityChanged:", visible)}
    >
      <Button>Dropdown with Callbacks (Check Console)</Button>
    </Dropdown.Trigger>
  ),
};

// Complex Content Example - User Profile Menu
export const UserProfileMenu: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={
        <div className="w-96 p-base flex flex-col gap-base">
          <div className="pb-base border-b border-neutral-border">
            <h3 className="text-heading-small font-medium text-primary-foreground">User Profile</h3>
          </div>
          <div className="flex items-center gap-base pb-base border-b border-neutral-border">
            <div className="w-12 h-12 bg-accent-background rounded-full flex items-center justify-center text-accent-foreground font-medium text-body-large">
              JD
            </div>
            <div className="flex flex-col gap-tightest">
              <div className="text-body-medium font-medium text-primary-foreground">John Doe</div>
              <div className="text-body-small text-secondary-foreground">john.doe@example.com</div>
            </div>
          </div>
          <div className="flex flex-col gap-tight">
            <button
              type="button"
              className="flex items-center gap-tight w-full text-left px-base py-1 text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle"
            >
              <IconUserEdit className="w-4 h-4" />
              View Profile
            </button>
            <button
              type="button"
              className="flex items-center gap-tight w-full text-left px-base py-1 text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle"
            >
              <IconSettings className="w-4 h-4" />
              Settings
            </button>
            <button
              type="button"
              className="flex items-center gap-tight w-full text-left px-base py-1 text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-primary-emphasis-subtle"
            >
              <IconBell className="w-4 h-4" />
              Notifications
            </button>
          </div>
          <div className="pt-base border-t border-neutral-border">
            <button
              type="button"
              className="flex items-center gap-tight w-full text-left px-base py-1 text-body-small text-danger-foreground hover:bg-danger-surface hover:cursor-pointer rounded-base transition-all duration-150 ease-out outline-none focus-visible:bg-danger-surface"
            >
              <IconCross className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      }
    >
      <Button trailing={<IconChevronDown />}>User Menu</Button>
    </Dropdown.Trigger>
  ),
};

// Multiple Dropdowns
export const MultipleDropdowns: Story = {
  render: (args) => (
    <Space direction="horizontal" size="base" wrap>
      <Dropdown.Trigger {...args} alignment="bottom-left" content={<MenuContent />}>
        <Button>Dropdown 1</Button>
      </Dropdown.Trigger>
      <Dropdown.Trigger {...args} alignment="bottom-center" content={<MenuContent />}>
        <Button>Dropdown 2</Button>
      </Dropdown.Trigger>
      <Dropdown.Trigger {...args} alignment="bottom-right" content={<MenuContent />}>
        <Button>Dropdown 3</Button>
      </Dropdown.Trigger>
    </Space>
  ),
};

// With Labels
export const WithLabels: Story = {
  render: (args) => (
    <Space direction="vertical" size="small" style={{ gridGap: "var(--spacing-base)" }}>
      <Label>Select an option</Label>
      <Dropdown.Trigger {...args} content={<MenuContent items={5} />}>
        <Button>Open Menu</Button>
      </Dropdown.Trigger>
    </Space>
  ),
};

// Menu of actions: Dropdown.Menu / Dropdown.Item / Dropdown.Divider
const ActionsTrigger = () => <Button look="outlined" variant="neutral" aria-label="Actions" icon={<DotsThreeIcon />} />;

export const ActionMenu: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={
        <Dropdown.Menu aria-label="Course actions" data-testid="story-action-menu">
          <Dropdown.Item icon={<SlidersHorizontalIcon size={20} />} onSelect={() => console.log("configure")}>
            Configure
          </Dropdown.Item>
          <Dropdown.Item icon={<PlayIcon size={20} />} onSelect={() => console.log("preview")}>
            Preview
          </Dropdown.Item>
          <Dropdown.Item icon={<CopyIcon size={20} />} onSelect={() => console.log("duplicate")}>
            Duplicate
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item danger icon={<TrashIcon size={20} />} onSelect={() => console.log("delete")}>
            Delete
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <ActionsTrigger />
    </Dropdown.Trigger>
  ),
};

export const ActionMenuWithDescription: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={
        <Dropdown.Menu aria-label="Publishing actions">
          <Dropdown.Item
            icon={<PowerIcon size={20} />}
            description="Make this course visible to learners"
            onSelect={() => console.log("publish")}
          >
            Publish
          </Dropdown.Item>
          <Dropdown.Item icon={<CopyIcon size={20} />} onSelect={() => console.log("duplicate")}>
            Duplicate
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <ActionsTrigger />
    </Dropdown.Trigger>
  ),
};

export const ActionMenuDisabledWithHint: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={
        <Dropdown.Menu aria-label="Course actions">
          <Dropdown.Item icon={<CopyIcon size={20} />} onSelect={() => console.log("duplicate")}>
            Duplicate
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            disabled
            danger
            icon={<TrashIcon size={20} />}
            description="Unpublish the course before deleting it"
          >
            Delete
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <ActionsTrigger />
    </Dropdown.Trigger>
  ),
};

export const ActionMenuWithoutIcons: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={
        <Dropdown.Menu aria-label="Sort by">
          <Dropdown.Item onSelect={() => console.log("name")}>Name</Dropdown.Item>
          <Dropdown.Item onSelect={() => console.log("date")}>Last updated</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item icon={<IconSettings />} onSelect={() => console.log("settings")}>
            With an icon, aligned to the rest
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <Button look="outlined" variant="neutral" trailing={<IconChevronDown />}>
        Sort
      </Button>
    </Dropdown.Trigger>
  ),
};

export const ActionMenuStayOpen: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      content={
        <Dropdown.Menu aria-label="Notifications">
          <Dropdown.Item icon={<IconBell />} closeOnSelect={false} onSelect={() => console.log("toggle")}>
            Stays open on select
          </Dropdown.Item>
          <Dropdown.Item icon={<IconUserEdit />} onSelect={() => console.log("close")}>
            Closes on select
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <Button look="outlined" variant="neutral">
        Notifications
      </Button>
    </Dropdown.Trigger>
  ),
};

export const ActionMenuContextMenu: Story = {
  render: (args) => (
    <Dropdown.Trigger
      {...args}
      triggerMode="contextmenu"
      positionAtCursor
      content={
        <Dropdown.Menu aria-label="Card actions">
          <Dropdown.Item icon={<PlayIcon size={20} />} onSelect={() => console.log("preview")}>
            Preview
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item danger icon={<TrashIcon size={20} />} onSelect={() => console.log("delete")}>
            Delete
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <div className="p-loose border border-neutral-border rounded-base text-body-small">Right-click this card</div>
    </Dropdown.Trigger>
  ),
};
