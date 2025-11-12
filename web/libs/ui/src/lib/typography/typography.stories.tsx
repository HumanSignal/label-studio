import type { Meta, StoryObj } from "@storybook/react";
import { Typography } from "./typography";

// Define a more specific type for the stories
type TypographyStory = StoryObj<{
  variant: "display" | "headline" | "title" | "label" | "body";
  size: string;
  fontStyle?: "normal" | "italic";
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children: React.ReactNode;
  truncateLines?: number;
  expandable?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
  expandToggleClassName?: string;
}>;

const meta: Meta<typeof Typography> = {
  title: "UI/Typography",
  component: Typography,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "A flexible typography component that provides consistent text styling across the application.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["display", "headline", "title", "label", "body"],
      description: "The typography variant to use",
    },
    size: {
      control: { type: "select" },
      description: "The size variant for the selected typography variant",
    },
    fontStyle: {
      control: { type: "select" },
      options: ["normal", "italic"],
      description: "The text style to apply",
    },
    as: {
      control: { type: "text" },
      description: "Override the default HTML element",
    },
    className: {
      control: { type: "text" },
      description: "Additional CSS classes to apply",
    },
    truncateLines: {
      control: { type: "number" },
      description:
        "Number of lines to show before truncating. When set, content will be clamped to this many lines with an expand/collapse toggle.",
    },
    expandable: {
      control: { type: "boolean" },
      description: "Whether to show expand/collapse toggle button when content is truncated",
    },
    expandLabel: {
      control: { type: "text" },
      description: "Custom label for the expand button (default: 'Show more')",
    },
    collapseLabel: {
      control: { type: "text" },
      description: "Custom label for the collapse button (default: 'Show less')",
    },
    expandToggleClassName: {
      control: { type: "text" },
      description: "Custom CSS classes to apply to the expand/collapse toggle button",
    },
  },
  tags: ["autodocs"],
};

export default meta;

// Base story with controls
export const Default: TypographyStory = {
  args: {
    variant: "body",
    size: "medium",
    children: "This is a sample body",
  },
};

// All variants comparison
export const AllVariants: TypographyStory = {
  args: {
    variant: "display",
    size: "large",
    children: "Display Large",
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Display Variants</h3>
        <div className="space-y-2">
          <Typography variant="display" size="large">
            Display Large
          </Typography>
          <Typography variant="display" size="medium">
            Display Medium
          </Typography>
          <Typography variant="display" size="small">
            Display Small
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Headline Variants</h3>
        <div className="space-y-2">
          <Typography variant="headline" size="large">
            Headline Large
          </Typography>
          <Typography variant="headline" size="medium">
            Headline Medium
          </Typography>
          <Typography variant="headline" size="small">
            Headline Small
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Title Variants</h3>
        <div className="space-y-2">
          <Typography variant="title" size="large">
            Title Large
          </Typography>
          <Typography variant="title" size="medium">
            Title Medium
          </Typography>
          <Typography variant="title" size="small">
            Title Small
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Label Variants</h3>
        <div className="space-y-2">
          <Typography variant="label" size="medium">
            Label Medium
          </Typography>
          <Typography variant="label" size="small">
            Label Small
          </Typography>
          <Typography variant="label" size="smaller">
            Label Smaller
          </Typography>
          <Typography variant="label" size="smallest">
            Label Smallest
          </Typography>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Body Variants</h3>
        <div className="space-y-2">
          <Typography variant="body" size="medium">
            Body Medium
          </Typography>
          <Typography variant="body" size="small">
            Body Small
          </Typography>
          <Typography variant="body" size="smaller">
            Body Smaller
          </Typography>
          <Typography variant="body" size="smallest">
            Body Smallest
          </Typography>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "A comprehensive view of all typography variants and their sizes for easy comparison.",
      },
    },
  },
};

// Style variations
export const FontStyles: TypographyStory = {
  args: {
    variant: "headline",
    size: "large",
    fontStyle: "normal",
    children: "Normal Style - The quick brown fox jumps over the lazy dog",
  },
  render: () => (
    <div className="space-y-4">
      <Typography variant="headline" size="large" fontStyle="normal">
        Normal Style - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="headline" size="large" fontStyle="italic">
        Italic Style - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="body" size="medium" fontStyle="normal">
        Normal body text - The quick brown fox jumps over the lazy dog
      </Typography>
      <Typography variant="body" size="medium" fontStyle="italic">
        Italic body text - The quick brown fox jumps over the lazy dog
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Typography component supports both normal and italic text styles.",
      },
    },
  },
};

// Custom elements
export const CustomElements: TypographyStory = {
  args: {
    variant: "headline",
    size: "large",
    as: "h1",
    children: "This renders as an H1 element",
  },
  render: () => (
    <div className="space-y-4">
      <Typography variant="headline" size="large" as="h1">
        This renders as an H1 element
      </Typography>
      <Typography variant="title" size="medium" as="h2">
        This renders as an H2 element
      </Typography>
      <Typography variant="body" size="medium" as="span">
        This renders as a span element
      </Typography>
      <Typography variant="label" size="small" as="label">
        This renders as a label element
      </Typography>
      <Typography variant="body" size="small" as="div">
        This renders as a div element
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Use the `as` prop to override the default HTML element while maintaining the typography styles.",
      },
    },
  },
};

// Color variations
export const Colors: TypographyStory = {
  args: {
    variant: "body",
    size: "medium",
    children: "This text demonstrates different neutral content colors",
  },
  render: () => (
    <div className="space-y-4">
      <Typography variant="headline" size="medium" className="text-neutral-content">
        Default Color - Primary content with full contrast
      </Typography>
      <Typography variant="body" size="medium" className="text-neutral-content-subtle">
        Subtle Color - Secondary content with reduced contrast
      </Typography>
      <Typography variant="body" size="medium" className="text-neutral-content-subtler">
        Subtler Color - Tertiary content with further reduced contrast
      </Typography>
      <Typography variant="body" size="medium" className="text-neutral-content-subtlest">
        Subtlest Color - Quaternary content with minimal contrast
      </Typography>
      <Typography variant="body" size="medium" className="text-negative-content">
        Negative Color - Negative content with full contrast
      </Typography>
      <Typography variant="body" size="medium" className="text-primary-content">
        Primary content color (text-primary-content) - overrides default neutral
      </Typography>
      <Typography variant="body" size="medium" className="text-positive-content">
        Positive content color (text-positive-content) - overrides default neutral
      </Typography>
      <Typography variant="body" size="medium" className="text-accent-grape-dark">
        Accent grape dark color (text-accent-grape-dark) - overrides default neutral
      </Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Typography component supports different neutral content colors for creating visual hierarchy and emphasis. The component also automatically detects text color classes in the className prop and prevents the default text-neutral-content from overriding them, allowing custom colors to work properly.",
      },
    },
  },
};

// Composition example
export const Composition: TypographyStory = {
  args: {
    variant: "headline",
    size: "medium",
    children: "Composition Example",
  },
  render: () => (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <Typography variant="headline" size="medium" className="mb-2">
          Composition Example
        </Typography>
        <Typography variant="body" size="medium" className="mb-4">
          This example shows how <strong>typography components</strong> can be used together. You can customize the
          variant, size, and style using the controls below.
        </Typography>
        <Typography variant="label" size="small" fontStyle="italic" className="text-neutral-content-subtle">
          Use the Storybook controls to experiment with different typography options.
        </Typography>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "A composition example showing how typography components work together in a real-world context.",
      },
    },
  },
};

// Truncation examples
const longText =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

const htmlText =
  "<p>This is <strong>HTML content</strong> with various formatting.</p><p>It includes <em>italic text</em>, <strong>bold text</strong>, and multiple paragraphs.</p><p>The truncation works seamlessly with HTML markup, preserving all formatting while still allowing expand/collapse functionality.</p>";

export const Truncation: TypographyStory = {
  args: {
    variant: "body",
    size: "small",
    children: longText,
  },
  render: () => (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Basic Truncation (3 lines)</h3>
        <Typography variant="body" size="small" truncateLines={3}>
          {longText}
        </Typography>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Truncation (2 lines)</h3>
        <Typography variant="body" size="small" truncateLines={2}>
          {longText}
        </Typography>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Truncation (5 lines)</h3>
        <Typography variant="body" size="small" truncateLines={5}>
          {longText}
        </Typography>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Custom Button Labels</h3>
        <Typography variant="body" size="small" truncateLines={3} expandLabel="See more" collapseLabel="See less">
          {longText}
        </Typography>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Custom Toggle Styles</h3>
        <Typography
          variant="body"
          size="small"
          truncateLines={3}
          expandToggleClassName="!text-accent-grape-dark font-semibold hover:underline"
        >
          {longText}
        </Typography>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">HTML Content Truncation</h3>
        <Typography variant="body" size="small" truncateLines={2} dangerouslySetInnerHTML={{ __html: htmlText }} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Non-Expandable Truncation</h3>
        <Typography variant="body" size="small" truncateLines={3} expandable={false}>
          {longText}
        </Typography>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 !text-neutral-content-subtle">Short Text (no truncation needed)</h3>
        <Typography variant="body" size="small" truncateLines={3}>
          This is a short text that doesn't need truncation, so no button appears.
        </Typography>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Typography supports text truncation with expand/collapse functionality. Use `truncateLines` to specify the number of lines to show before truncating. The component automatically detects if content overflows and only shows the toggle button when needed. Supports custom button labels, HTML content, and non-expandable mode.",
      },
    },
  },
};
