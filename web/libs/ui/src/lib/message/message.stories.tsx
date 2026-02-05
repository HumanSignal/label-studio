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
      description: "Size of the message. medium: standard padding and 20px icon, small: compact padding and 18px icon",
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
      description: "Optional title text displayed above the main content",
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
    isMarkdown: {
      control: "boolean",
      description: "Whether to render children as markdown",
    },
    extra: {
      control: false,
      description: "Extra content area displayed below the main content",
    },
    actions: {
      control: false,
      description: "Action buttons or other interactive elements",
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

export const WithoutTitle: Story = {
  args: {
    variant: "warning",
    children: "This message has no title, just the main content.",
  },
};

export const BodyTextOnly: Story = {
  args: {
    variant: "primary",
    children: "A simple informational message with just body text and no title. Perfect for brief notifications.",
  },
};

export const WithMarkdown: Story = {
  args: {
    variant: "primary",
    title: "Markdown Support",
    isMarkdown: true,
    children:
      "This message supports **bold text**, *italic text*, and [links](https://example.com). You can also use lists:\n\n- Item 1\n- Item 2\n- Item 3",
  },
};

export const WithExtraContent: Story = {
  args: {
    variant: "warning",
    title: "Additional Information",
    children: "This message has extra content below the main text.",
    extra: (
      <Typography variant="body" size="small" className="text-neutral-content-subtler">
        Extra information or context can be displayed here.
      </Typography>
    ),
  },
};

export const WithSingleAction: Story = {
  args: {
    variant: "primary",
    title: "Action Required",
    children: "Please confirm your email address to continue.",
    actions: (
      <Button variant="primary" look="filled" size="small">
        Verify Email
      </Button>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    variant: "warning",
    title: "Unsaved Changes",
    children: "You have unsaved changes. Do you want to save them before leaving?",
    actions: (
      <>
        <Button variant="primary" look="filled" size="small">
          Save Changes
        </Button>
        <Button variant="neutral" look="outlined" size="small">
          Discard
        </Button>
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
      <Message variant="primary" icon={<IconInfoOutline />} iconSize={20}>
        Default icon (20px)
      </Message>
      <Message variant="primary" icon={<IconInfoOutline />} iconSize={24}>
        Medium icon (24px)
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
          This is a medium-sized message with standard padding and 20px icon.
        </Message>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Small Size (Compact)</h3>
        <Message variant="primary" size="small" title="Small Message">
          This is a small-sized message with reduced padding and 18px icon.
        </Message>
      </div>
    </div>
  ),
};

export const SmallWithActions: Story = {
  args: {
    variant: "warning",
    size: "small",
    title: "Compact Warning",
    children: "This is a compact message with actions.",
    actions: (
      <>
        <Button variant="primary" look="filled" size="small">
          Confirm
        </Button>
        <Button variant="neutral" look="outlined" size="small">
          Cancel
        </Button>
      </>
    ),
  },
};

// Real-world Examples
export const PersonalSandboxWarning: Story = {
  args: {
    variant: "warning",
    children: (
      <Typography>
        Your <b>Personal Sandbox</b> keeps this project private. Move it to a workspace to share access with others in
        your organization.
      </Typography>
    ),
    actions: (
      <Button variant="primary" look="outlined" size="small">
        Go to General
      </Button>
    ),
  },
};

export const ApiConnectionError: Story = {
  args: {
    variant: "negative",
    title: "Connection Failed",
    children: "Unable to connect to the API server. Please check your internet connection and try again.",
    actions: (
      <Button variant="primary" look="filled" size="small">
        Retry Connection
      </Button>
    ),
  },
};

export const SuccessNotification: Story = {
  args: {
    variant: "positive",
    title: "Task Completed",
    children: "All tasks have been processed successfully. You can now proceed to the next step.",
    actions: (
      <Button variant="primary" look="filled" size="small">
        Continue
      </Button>
    ),
  },
};

export const InfoWithLink: Story = {
  args: {
    variant: "primary",
    title: "Need Help?",
    children: "Visit our documentation to learn more about this feature.",
    extra: (
      <Typography variant="label" size="small" className="text-primary-link">
        <a href="/docs" className="inline-flex items-center gap-1 hover:underline">
          View Documentation
          <IconExternal width={16} height={16} />
        </a>
      </Typography>
    ),
  },
};

export const WarningWithMultipleActions: Story = {
  args: {
    variant: "warning",
    title: "Storage Limit Approaching",
    children: "You've used 90% of your storage quota. Consider upgrading your plan or removing unused files.",
    actions: (
      <>
        <Button variant="primary" look="filled" size="small">
          Upgrade Plan
        </Button>
        <Button variant="neutral" look="outlined" size="small">
          Manage Storage
        </Button>
        <Button variant="neutral" look="text" size="small">
          Dismiss
        </Button>
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

export const WithAndWithoutTitles: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">With Titles</h3>
        <div className="space-y-4">
          <Message variant="primary" title="Information">
            Message content with a title.
          </Message>
          <Message variant="warning" title="Warning">
            Warning message with a title.
          </Message>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Without Titles</h3>
        <div className="space-y-4">
          <Message variant="primary">Message content without a title.</Message>
          <Message variant="warning">Warning message without a title.</Message>
        </div>
      </div>
    </div>
  ),
};

export const DifferentActionLayouts: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Single Action</h3>
        <Message
          variant="primary"
          title="Single Action"
          actions={
            <Button variant="primary" look="filled" size="small">
              Action
            </Button>
          }
        >
          Message with a single action button.
        </Message>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Two Actions</h3>
        <Message
          variant="warning"
          title="Two Actions"
          actions={
            <>
              <Button variant="primary" look="filled" size="small">
                Primary
              </Button>
              <Button variant="neutral" look="outlined" size="small">
                Secondary
              </Button>
            </>
          }
        >
          Message with two action buttons.
        </Message>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Three Actions</h3>
        <Message
          variant="negative"
          title="Three Actions"
          actions={
            <>
              <Button variant="primary" look="filled" size="small">
                Confirm
              </Button>
              <Button variant="neutral" look="outlined" size="small">
                Cancel
              </Button>
              <Button variant="neutral" look="text" size="small">
                Learn More
              </Button>
            </>
          }
        >
          Message with three action buttons.
        </Message>
      </div>
    </div>
  ),
};

// Accessibility Example
export const WithAccessibility: Story = {
  args: {
    variant: "warning",
    title: "Accessible Message",
    "aria-label": "Important warning message",
    "data-testid": "accessible-message",
    closable: true,
    onClose: () => console.log("Message closed"),
    children: "This message demonstrates proper accessibility features including ARIA labels and keyboard navigation.",
  },
};

// Backward Compatibility - Aliases
export const AliasInfo: Story = {
  args: {
    variant: "info",
    title: "Info Alias",
    children: "This uses the 'info' alias which maps to 'primary' variant.",
  },
};

export const AliasSuccess: Story = {
  args: {
    variant: "success",
    title: "Success Alias",
    children: "This uses the 'success' alias which maps to 'positive' variant.",
  },
};

export const AliasError: Story = {
  args: {
    variant: "error",
    title: "Error Alias",
    children: "This uses the 'error' alias which maps to 'negative' variant.",
  },
};
