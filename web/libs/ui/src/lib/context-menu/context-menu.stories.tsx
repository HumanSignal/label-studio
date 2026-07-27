import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "../button/button";
import { ContextMenu } from "./context-menu";
import { useContextMenu } from "./use-context-menu";

const MenuItems = ({ onAction }: { onAction?: (label: string) => void }) => (
  <div className="p-tight flex flex-col gap-tightest w-max min-w-[160px]">
    {["Edit", "Duplicate", "Delete"].map((label) => (
      <button
        key={label}
        type="button"
        className="w-full text-left px-base py-tight text-body-small text-neutral-content-subtle hover:bg-primary-emphasis-subtle hover:cursor-pointer rounded-base outline-none focus-visible:bg-primary-emphasis-subtle"
        onClick={() => onAction?.(label)}
      >
        {label}
      </button>
    ))}
  </div>
);

const meta = {
  component: ContextMenu,
  title: "UI/ContextMenu",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Table-agnostic context menu. Opens on OS secondary-click and keyboard (Shift+F10 / ContextMenu) only on the focused trigger. Prefer `useContextMenu` for virtualized or multi-trigger hosts.",
      },
    },
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WrapperOnButton: Story = {
  render: () => (
    <ContextMenu content={<MenuItems />}>
      <Button look="outlined" data-testid="context-menu-trigger">
        Right-click or focus + Shift+F10
      </Button>
    </ContextMenu>
  ),
};

export const WrapperOnDiv: Story = {
  render: () => (
    <ContextMenu content={<MenuItems />}>
      <div
        data-testid="context-menu-div-trigger"
        className="px-base py-base border border-neutral-border rounded-base text-body-medium cursor-context-menu"
      >
        Plain div — right-click to open (keyboard open needs a focusable trigger; see button story)
      </div>
    </ContextMenu>
  ),
};

function HookDemo() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const { triggerProps, menu } = useContextMenu({
    content: <MenuItems onAction={setLastAction} />,
  });

  return (
    <div className="flex flex-col gap-base items-start">
      <button
        type="button"
        data-testid="hook-trigger"
        className="px-base py-tight border border-neutral-border rounded-base text-body-small hover:bg-neutral-emphasis-subtle"
        {...triggerProps}
      >
        Hook trigger — right-click or Shift+F10
      </button>
      {lastAction && <p className="text-body-small text-neutral-content-subtle">Last action: {lastAction}</p>}
      {menu}
    </div>
  );
}

export const HookApi: Story = {
  render: () => <HookDemo />,
};

function ControlledDemo() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const { getTriggerProps, menu, close } = useContextMenu({
    open,
    position,
    onOpenChange: (next) => {
      if (!next) {
        setOpen(false);
        setPosition(null);
      }
    },
    onOpen: (_event, nextPosition) => {
      setOpen(true);
      setPosition(nextPosition);
    },
    content: (
      <MenuItems
        onAction={() => {
          close();
        }}
      />
    ),
  });

  return (
    <div className="flex flex-col gap-base items-start">
      <div className="flex gap-tight">
        <button
          type="button"
          className="px-base py-tight border border-neutral-border rounded-base"
          {...getTriggerProps()}
        >
          Trigger A
        </button>
        <button
          type="button"
          className="px-base py-tight border border-neutral-border rounded-base"
          {...getTriggerProps()}
        >
          Trigger B
        </button>
      </div>
      <p className="text-body-small text-neutral-content-subtle">
        Controlled multi-trigger pattern (same as Data Manager table rows).
      </p>
      {menu}
    </div>
  );
}

export const ControlledMultiTrigger: Story = {
  render: () => <ControlledDemo />,
};
