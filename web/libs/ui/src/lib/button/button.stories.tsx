import type { Meta, StoryObj } from "@storybook/react";
import { Button, ButtonGroup, buttonVariant } from "./button";
import { IconAnnotationGroundTruth, IconCrossAlt, IconChevronDown } from "@humansignal/icons";
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
        <Button {...props} className="w-48" leading={<IconAnnotationGroundTruth />}>
          Default
        </Button>
        <Button {...props} className="w-48" align="left" leading={<IconAnnotationGroundTruth />}>
          Left
        </Button>
        <Button {...props} className="w-48" align="center" leading={<IconAnnotationGroundTruth />}>
          Center
        </Button>
        <Button {...props} className="w-48" align="right" leading={<IconAnnotationGroundTruth />}>
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
        <Button {...props} size="medium" className="w-48" leading={<IconAnnotationGroundTruth />}>
          Medium
        </Button>
        <Button {...props} size="small" className="w-48" leading={<IconAnnotationGroundTruth />}>
          Small
        </Button>
        <Button {...props} size="smaller" className="w-48" leading={<IconAnnotationGroundTruth />}>
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
        <Button {...props} className="w-48" leading={<IconAnnotationGroundTruth />}>
          Leading
        </Button>
        <Button {...props} className="w-48" trailing={<IconAnnotationGroundTruth />}>
          Trailing
        </Button>
        <Button
          {...props}
          className="w-48"
          leading={<IconAnnotationGroundTruth />}
          trailing={<IconAnnotationGroundTruth />}
        >
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
      <Button
        {...props}
        className="w-[250px]"
        leading={<IconAnnotationGroundTruth />}
        trailing={<IconAnnotationGroundTruth />}
      >
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
      <Button {...props} leading={<IconAnnotationGroundTruth />} trailing={<IconAnnotationGroundTruth />}>
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
            <IconAnnotationGroundTruth />
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
          <IconAnnotationGroundTruth />
        </Button>

        <Button {...props}>
          <IconCrossAlt />
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
        <Button {...props} className="w-48" leading={<IconAnnotationGroundTruth />} disabled tooltip="Tooltip text">
          With Tooltip
        </Button>
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
                <IconChevronDown />
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
              <Button {...props} size="small" variant="neutral" look="outlined" leading={<IconAnnotationGroundTruth />}>
                Edit
              </Button>
              <Button {...props} size="small" variant="neutral" look="outlined" leading={<IconCrossAlt />}>
                Delete
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>
    );
  },
};
