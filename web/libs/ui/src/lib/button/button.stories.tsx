import type { Meta, StoryObj } from "@storybook/react";
import { Button, ButtonGroup, buttonVariant } from "./button";
import { CaretDownIcon, TagIcon, XIcon } from "@humansignal/icons";
import { Dropdown } from "../dropdown";
import { Space } from "../space/space";
import { Typography } from "../typography/typography";

const meta: Meta<typeof Button> = {
  component: Button,
  title: "UI/Button",
  argTypes: {
    disabled: { control: "boolean" },
    waiting: { control: "boolean" },
    look: { control: "select" },
    size: { control: "select" },
    align: { control: "select" },
    leading: { control: false },
    trailing: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: "Default Button",
    className: "w-[200px]",
  },
};

export const WithDisabledState: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};

export const WithWaitingState: Story = {
  args: {
    children: "Waiting Button",
    waiting: true,
  },
};

export const WithAlignment: Story = {
  render: ({ children, ...props }) => {
    return (
      <div className="flex items-center gap-tight">
        <Button {...props} className="w-48" leading={<TagIcon />}>
          Default
        </Button>
        <Button {...props} className="w-48" align="left" leading={<TagIcon />}>
          Left
        </Button>
        <Button {...props} className="w-48" align="center" leading={<TagIcon />}>
          Center
        </Button>
        <Button {...props} className="w-48" align="right" leading={<TagIcon />}>
          Right
        </Button>
      </div>
    );
  },
};

export const WithSize: Story = {
  render: ({ children, ...props }) => {
    return (
      <div className="flex items-center gap-tight">
        <Button {...props} size="medium" className="w-48" leading={<TagIcon />}>
          Medium
        </Button>
        <Button {...props} size="small" className="w-48" leading={<TagIcon />}>
          Small
        </Button>
        <Button {...props} size="smaller" className="w-48" leading={<TagIcon />}>
          Smaller
        </Button>
      </div>
    );
  },
};

export const WithIcon: Story = {
  render: ({ children, ...props }) => {
    return (
      <div className="flex gap-tight">
        <Button {...props} className="w-48" leading={<TagIcon />}>
          Leading
        </Button>
        <Button {...props} className="w-48" trailing={<TagIcon />}>
          Trailing
        </Button>
        <Button {...props} className="w-48" leading={<TagIcon />} trailing={<TagIcon />}>
          Both
        </Button>
      </div>
    );
  },
};

export const WideButton: Story = {
  args: {
    children: "Wide button",
    align: "default",
  },
  render: ({ children, ...props }) => {
    return (
      <Button {...props} className="w-[250px]" leading={<TagIcon />} trailing={<TagIcon />}>
        {children}
      </Button>
    );
  },
};

export const WithComplexChildren: Story = {
  args: {
    children: "Button with a",
    align: "default",
  },
  render: ({ children, ...props }) => {
    return (
      <Button {...props} leading={<TagIcon />} trailing={<TagIcon />}>
        {children}
        <span className="max-h-6 px-tight rounded-4 bg-primary-surface-hover">badge</span>
      </Button>
    );
  },
};

export const WithExtra: Story = {
  args: {
    children: "Button with an",
    align: "default",
  },
  render: ({ children, ...props }) => {
    return (
      <Button
        {...props}
        trailing={
          <>
            <span className="max-h-6 px-tight rounded-4 bg-primary-surface-hover">extra badge</span>
            <TagIcon />
          </>
        }
      >
        {children}
      </Button>
    );
  },
};

export const IconButton: Story = {
  render: ({ children: _, ...props }) => {
    return (
      <div className="flex gap-4">
        <Button {...props}>
          <TagIcon />
        </Button>

        <Button {...props}>
          <XIcon />
        </Button>
      </div>
    );
  },
};

export const StyledLink: Story = {
  args: {
    children: "Link with button style",
  },
  render({ children, ...props }) {
    return (
      // biome-ignore lint: We don't need a real link here
      <a href="#" className={buttonVariant({ ...props })}>
        <span className="flex-1 px-tight">{children}</span>
      </a>
    );
  },
};

export const WithSecondaryAction: Story = {
  args: {
    children: "Link with button style",
  },
  render({ children, ...props }) {
    return (
      <Button
        {...props}
        waiting={props.waiting ?? true}
        waitingClickable
        onClick={() => alert("First action")}
        secondaryOnClick={() => alert("Second action")}
      >
        <span className="flex-1 px-tight">{children}</span>
      </Button>
    );
  },
};

export const WithTooltipAndDisabledState: Story = {
  render: ({ children, ...props }) => {
    return (
      <div className="flex items-center gap-tight">
        <Button {...props} className="w-48" leading={<TagIcon />} disabled tooltip="Tooltip text">
          With Tooltip
        </Button>
      </div>
    );
  },
};

export const GradientButton: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-wider">
        <div>
          <Typography variant="title" size="large" className="mb-tight">
            Looks
          </Typography>
          <div className="flex flex-wrap items-center gap-tight">
            <Button variant="gradient" look="filled" leading={<TagIcon />}>
              Filled
            </Button>
            <Button variant="gradient" look="outlined" leading={<TagIcon />}>
              Outlined
            </Button>
            <Button variant="gradient" look="string" leading={<TagIcon />}>
              String
            </Button>
          </div>
        </div>
        <div>
          <Typography variant="title" size="large" className="mb-tight">
            Waiting
          </Typography>
          <div className="flex flex-wrap items-center gap-tight">
            <Button variant="gradient" look="filled" waiting leading={<TagIcon />}>
              Filled waiting
            </Button>
            <Button variant="gradient" look="outlined" waiting leading={<TagIcon />}>
              Outlined waiting
            </Button>
            <Button variant="gradient" look="string" waiting leading={<TagIcon />}>
              String waiting
            </Button>
          </div>
        </div>
        <div>
          <Typography variant="title" size="large" className="mb-tight">
            Disabled
          </Typography>
          <div className="flex flex-wrap items-center gap-tight">
            <Button variant="gradient" look="filled" disabled leading={<TagIcon />}>
              Filled disabled
            </Button>
            <Button variant="gradient" look="outlined" disabled leading={<TagIcon />}>
              Outlined disabled
            </Button>
            <Button variant="gradient" look="string" disabled leading={<TagIcon />}>
              String disabled
            </Button>
          </div>
        </div>
      </div>
    );
  },
};

export const WithButtonGroup: Story = {
  render: (props) => {
    return (
      <div className="flex flex-col gap-wider">
        <div>
          <Typography variant="title" size="large" className="mb-tight">
            Button Group - Collapsed (default)
          </Typography>
          <Typography variant="body" size="medium" className="text-secondary mb-comfortable">
            Buttons are visually connected with shared borders
          </Typography>
          <ButtonGroup>
            <Button {...props} size="small" variant="primary" look="filled">
              Label All Tasks
            </Button>
            <Dropdown.Trigger
              alignment="bottom-right"
              content={
                <Space direction="vertical" className="bg-neutral-background p-tight rounded">
                  <Button align="left" look="string" size="small">
                    Label tasks as displayed
                  </Button>
                  <Button align="left" look="string" size="small">
                    Skip all tasks
                  </Button>
                </Space>
              }
            >
              <Button size="small" variant="primary" look="filled" aria-label="Toggle label options">
                <CaretDownIcon />
              </Button>
            </Dropdown.Trigger>
          </ButtonGroup>
        </div>

        <div>
          <Typography variant="title" size="large" className="mb-tight">
            Button Group - Not Collapsed
          </Typography>
          <Typography variant="body" size="medium" className="text-secondary mb-comfortable">
            Buttons maintain their individual styling with spacing between them
          </Typography>
          <ButtonGroup collapsed={false}>
            <Button {...props} size="small" variant="primary" look="outlined">
              Save
            </Button>
            <Button {...props} size="small" variant="neutral" look="outlined">
              Cancel
            </Button>
          </ButtonGroup>
        </div>

        <div>
          <Typography variant="title" size="large" className="mb-tight">
            Multiple Button Group Examples
          </Typography>
          <Typography variant="body" size="medium" className="text-secondary mb-comfortable">
            Various combinations of button groups
          </Typography>
          <div className="flex flex-wrap gap-comfortable">
            <ButtonGroup>
              <Button {...props} size="small" variant="neutral" look="outlined">
                Previous
              </Button>
              <Button {...props} size="small" variant="neutral" look="outlined">
                1
              </Button>
              <Button {...props} size="small" variant="neutral" look="outlined">
                2
              </Button>
              <Button {...props} size="small" variant="neutral" look="outlined">
                3
              </Button>
              <Button {...props} size="small" variant="neutral" look="outlined">
                Next
              </Button>
            </ButtonGroup>

            <ButtonGroup>
              <Button {...props} size="small" variant="neutral" look="outlined" leading={<TagIcon />}>
                Edit
              </Button>
              <Button {...props} size="small" variant="neutral" look="outlined" leading={<XIcon />}>
                Delete
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>
    );
  },
};
