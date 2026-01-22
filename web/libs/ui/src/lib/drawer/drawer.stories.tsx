import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Drawer, DrawerClose } from "./drawer";
import { Button } from "../button/button";
import { Typography } from "../typography/typography";
import { IconPersonInCircle, IconSettings, IconTrash } from "@humansignal/icons";

const meta: Meta<typeof Drawer> = {
  component: Drawer,
  title: "UI/Drawer",
  argTypes: {
    side: {
      control: "select",
      options: ["top", "right", "bottom", "left"],
    },
    showCloseButton: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

/**
 * Default Drawer
 *
 * Basic drawer that slides in from the right side.
 */
export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Drawer</Button>
        <Drawer open={open} onOpenChange={setOpen} title="Drawer Title" description="Drawer description">
          <div className="p-base">
            <Typography variant="body" size="small">
              This is the drawer content. You can put any content here.
            </Typography>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer with Footer
 *
 * Drawer with action buttons in the footer.
 */
export const WithFooter: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Drawer</Button>
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Confirm Action"
          description="Are you sure you want to proceed?"
          footer={
            <div className="flex gap-2 w-full">
              <Button variant="neutral" look="outlined" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)} className="flex-1">
                Confirm
              </Button>
            </div>
          }
        >
          <div className="p-base">
            <Typography variant="body" size="small">
              This action cannot be undone. Please confirm your choice.
            </Typography>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer from Left Side
 *
 * Drawer that slides in from the left side.
 */
export const FromLeft: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Left Drawer</Button>
        <Drawer open={open} onOpenChange={setOpen} side="left" title="Navigation" description="Main navigation menu">
          <div className="p-base">
            <nav className="flex flex-col gap-2">
              <Button variant="neutral" look="string" align="left" className="justify-start">
                <IconPersonInCircle className="mr-2" />
                Profile
              </Button>
              <Button variant="neutral" look="string" align="left" className="justify-start">
                <IconSettings className="mr-2" />
                Settings
              </Button>
              <Button variant="neutral" look="string" align="left" className="justify-start">
                <IconTrash className="mr-2" />
                Delete
              </Button>
            </nav>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer from Top
 *
 * Drawer that slides in from the top.
 */
export const FromTop: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Top Drawer</Button>
        <Drawer open={open} onOpenChange={setOpen} side="top" title="Notifications">
          <div className="p-base">
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-base border-neutral-border border rounded">
                  <Typography variant="body" size="small" className="font-medium">
                    Notification {i}
                  </Typography>
                  <Typography variant="body" size="small" className="text-neutral-content-subtle">
                    This is notification content {i}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer from Bottom
 *
 * Drawer that slides in from the bottom.
 */
export const FromBottom: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Bottom Drawer</Button>
        <Drawer open={open} onOpenChange={setOpen} side="bottom" title="Quick Actions">
          <div className="p-base">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="neutral" look="outlined" className="h-20 flex-col">
                <IconPersonInCircle className="mb-2" />
                Profile
              </Button>
              <Button variant="neutral" look="outlined" className="h-20 flex-col">
                <IconSettings className="mb-2" />
                Settings
              </Button>
            </div>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer without Close Button
 *
 * Drawer without the default close button in the header.
 */
export const WithoutCloseButton: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Drawer</Button>
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Custom Close"
          showCloseButton={false}
          footer={
            <Button variant="primary" onClick={() => setOpen(false)} className="w-full">
              Close Drawer
            </Button>
          }
        >
          <div className="p-base">
            <Typography variant="body" size="small">
              This drawer uses a custom close button in the footer instead of the default header button.
            </Typography>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer with Scrollable Content
 *
 * Drawer with long content that scrolls.
 */
export const ScrollableContent: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Scrollable Drawer</Button>
        <Drawer open={open} onOpenChange={setOpen} title="Long Content" description="Scroll to see more">
          <div className="p-base">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} className="mb-base p-base border-neutral-border border rounded">
                <Typography variant="body" size="small">
                  Item {i + 1}
                </Typography>
                <Typography variant="body" size="small" className="text-neutral-content-subtle">
                  This is item number {i + 1} in a long list of items.
                </Typography>
              </div>
            ))}
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer with Trigger
 *
 * Using DrawerTrigger component for declarative control.
 * Note: Since Drawer creates its own Sheet context, DrawerTrigger should be used
 * with a separate Sheet wrapper, or use controlled state (open/onOpenChange) instead.
 */
export const WithTrigger: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Drawer</Button>
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Triggered Drawer"
          description="This drawer is opened via button click"
          footer={
            <DrawerClose asChild>
              <Button variant="primary" className="w-full">
                Close
              </Button>
            </DrawerClose>
          }
        >
          <div className="p-base">
            <Typography variant="body" size="small">
              This drawer uses controlled state (open/onOpenChange) to manage visibility. For DrawerTrigger usage, wrap
              both DrawerTrigger and Drawer in a Sheet component.
            </Typography>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer without Title
 *
 * Drawer without a visible title. A hidden "Drawer" title is automatically rendered for accessibility.
 */
export const WithoutTitle: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Drawer without Title</Button>
        <Drawer open={open} onOpenChange={setOpen}>
          <div className="p-base">
            <Typography variant="body" size="small">
              This drawer has no visible title, but a hidden title is rendered for screen reader accessibility.
            </Typography>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer with Custom Content Class
 *
 * Drawer with custom contentClassName to customize positioning, width, and other styles.
 * This example demonstrates both custom width and top offset.
 */
export const WithCustomContentClass: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Drawer (Custom Content Class)</Button>
        <Drawer
          open={open}
          onOpenChange={setOpen}
          side="right"
          title="Custom Content Class"
          contentClassName="top-[48px] w-1/2"
          description="This drawer uses contentClassName to customize both position (top offset) and width"
        >
          <div className="p-base">
            <Typography variant="body" size="small">
              This drawer uses contentClassName to:
            </Typography>
            <ul className="list-none list-inside mt-base space-y-tight">
              <li>
                <Typography variant="body" size="small">
                  Add a top offset of 48px, positioning it below the fixed navigation bar
                </Typography>
              </li>
              <li>
                <Typography variant="body" size="small">
                  Set a custom width of 50% on mobile and max-width of 2xl on larger screens
                </Typography>
              </li>
            </ul>
          </div>
        </Drawer>
      </div>
    );
  },
};

/**
 * Drawer with Custom Body Class
 *
 * Drawer with custom styling applied to the body content wrapper.
 */
export const WithCustomBodyClass: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Drawer with Custom Body</Button>
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Custom Body Styling"
          bodyClassName="bg-neutral-surface-subtle"
        >
          <div className="p-base">
            <Typography variant="body" size="small">
              This drawer has a custom background color applied to the body wrapper using bodyClassName.
            </Typography>
          </div>
        </Drawer>
      </div>
    );
  },
};
