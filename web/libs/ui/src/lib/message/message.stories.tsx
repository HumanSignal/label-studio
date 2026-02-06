import type { Meta, StoryObj } from "@storybook/react";
import { Message } from "./message";
import { Button } from "../button/button";
import { IconUpload, IconExternal, IconInfoOutline } from "@humansignal/icons";
import { Typography } from "../typography/typography";
import { useState } from "react";

const meta: Meta<typeof Message> = {
  component: Message,
  title: "UI/Message",
  parameters: {
    docs: {
      description: {
        component:
          "A reusable message component for displaying inline messages, notifications, and alerts with support for different variants and customizable content.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "neutral", "negative", "positive", "warning", "info", "success", "error"],
      description:
        "Visual variant of the message. Primary variants: primary, neutral, negative, positive, warning. Aliases: info (→primary), success (→positive), error (→negative)",
    },
    size: {
      control: "select",
      options: ["medium", "small"],
      description:
        "Size of the message. medium: standard padding and 24px icon (default), small: compact padding and 20px icon (use only when vertical space is limited)",
    },
    icon: {
      control: false,
      description: "Icon element to display. Defaults based on variant if not provided.",
    },
    iconSize: {
      control: "number",
      description: "Size of the icon in pixels. If not provided, defaults based on size prop (medium: 20, small: 18).",
    },
    title: {
      control: "text",
      description: "Optional title displayed above the main content. Can be a string or ReactNode for rich content.",
    },
    children: {
      control: "text",
      description: "Main content of the message",
    },
    closable: {
      control: "boolean",
      description: "Whether the message can be closed by the user",
    },
    onClose: {
      control: false,
      description: "Callback function when the close button is clicked",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Message>;

// Basic Stories - Primary Variants
export const Default: Story = {
  args: {
    variant: "primary",
    children: "This is an informational message with important details for the user.",
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
    title: "Information",
    children: "This is a primary informational message with a title.",
  },
};

export const Neutral: Story = {
  args: {
    variant: "neutral",
    title: "Note",
    children: "This is a neutral message that provides general information without emphasis.",
  },
};

export const Negative: Story = {
  args: {
    variant: "negative",
    title: "Error",
    children: "An error occurred while processing your request. Please try again.",
  },
};

export const Positive: Story = {
  args: {
    variant: "positive",
    title: "Success",
    children: "Your changes have been saved successfully.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Warning",
    children: "Your session will expire in 5 minutes. Please save your work.",
  },
};

// Feature Stories
export const WithTitle: Story = {
  args: {
    variant: "primary",
    title: "Important Update",
    children: "We've updated our terms of service. Please review the changes before continuing.",
  },
};

export const WithRichTitle: Story = {
  args: {
    variant: "warning",
    title: (
      <>
        Your <strong>Personal Sandbox</strong> is private
      </>
    ),
    children: "Move this project to a workspace to share access with others in your organization.",
  },
};

export const WithActions: Story = {
  args: {
    variant: "warning",
    title: "Unsaved Changes",
    children: (
      <>
        <Typography>You have unsaved changes. Do you want to save them before leaving?</Typography>
        <div className="flex gap-tight">
          <Button variant="primary" look="filled" size="small">
            Save Changes
          </Button>
          <Button variant="neutral" look="outlined" size="small">
            Discard
          </Button>
        </div>
      </>
    ),
  },
};

export const Closable: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);

    if (!visible) {
      return (
        <Button variant="neutral" look="outlined" onClick={() => setVisible(true)}>
          Show Message
        </Button>
      );
    }

    return (
      <Message variant="primary" title="Closable Message" closable onClose={() => setVisible(false)}>
        This message can be closed by clicking the X button.
      </Message>
    );
  },
};

export const WithCustomIcon: Story = {
  args: {
    variant: "primary",
    icon: <IconUpload />,
    title: "Upload Required",
    children: "Please upload a file to continue with the process.",
  },
};

export const WithCustomIconSize: Story = {
  render: () => (
    <div className="space-y-4">
      <Message variant="primary" icon={<IconInfoOutline />} iconSize={16}>
        Small icon (16px)
      </Message>
      <Message variant="primary" icon={<IconInfoOutline />} iconSize={32}>
        Large icon (32px)
      </Message>
    </div>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Medium Size (Default)</h3>
        <Message variant="primary" size="medium" title="Medium Message">
          This is a medium-sized message with standard padding and 24px icon. Use this size by default.
        </Message>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Small Size (Compact)</h3>
        <Message variant="primary" size="small" title="Small Message">
          This is a small-sized message with reduced padding and 20px icon. Use only when vertical space is limited.
        </Message>
      </div>
    </div>
  ),
};

// Real-world Examples
export const WithLink: Story = {
  args: {
    variant: "primary",
    title: "Need Help?",
    children: (
      <>
        <Typography>Visit our documentation to learn more about this feature.</Typography>
        <Typography variant="label" size="small" className="text-primary-link">
          <a href="/docs" className="inline-flex items-center gap-1 hover:underline">
            View Documentation
            <IconExternal width={16} height={16} />
          </a>
        </Typography>
      </>
    ),
  },
};

// Comparison Stories
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Message variant="primary" title="Primary">
        This is a primary informational message.
      </Message>

      <Message variant="neutral" title="Neutral">
        This is a neutral message.
      </Message>

      <Message variant="negative" title="Negative">
        This is a negative error message.
      </Message>

      <Message variant="positive" title="Positive">
        This is a positive success message.
      </Message>

      <Message variant="warning" title="Warning">
        This is a warning message.
      </Message>
    </div>
  ),
};
