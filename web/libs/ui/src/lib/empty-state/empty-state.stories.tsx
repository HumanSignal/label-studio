import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./empty-state";
import { Button } from "../button/button";
import {
  IconUpload,
  IconSearch,
  IconInbox,
  IconLsLabeling,
  IconLsReview,
  IconCheck,
  IconCloudProviderS3,
  IconCloudProviderGCS,
  IconCloudProviderAzure,
  IconCloudProviderRedis,
  IconExternal,
  IconRelationLink,
} from "@humansignal/icons";
import { Typography } from "../typography/typography";
import { Tooltip } from "../Tooltip/Tooltip";

const meta: Meta<typeof EmptyState> = {
  component: EmptyState,
  title: "Feedback/Empty State",
  parameters: {
    docs: {
      description: {
        component:
          "A reusable empty state component for displaying various empty states throughout the application with support for different sizes and customizable content.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["large", "medium", "small"],
      description: "Size of the empty state",
    },
    variant: {
      control: "select",
      options: ["primary", "neutral", "negative", "positive", "warning", "gradient"],
      description: "Color variant of the empty state",
    },
    icon: {
      control: false,
      description: "Icon element to display",
    },

    title: {
      control: "text",
      description: "Main title text",
    },
    description: {
      control: "text",
      description: "Description text below the title",
    },
    actions: {
      control: false,
      description: "Action buttons or other interactive elements",
    },
    additionalContent: {
      control: false,
      description: "Additional content to display between description and actions",
    },
    footer: {
      control: false,
      description: "Footer content displayed at the bottom",
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

// Basic Stories
export const Default: Story = {
  args: {
    size: "medium",
    variant: "primary",
    icon: <IconInbox />,
    title: "Add your first items",
    description: "Start building your collection by adding new items",
    footer: (
      <Typography variant="label" size="small" className="text-primary-link">
        <a href="/docs/labeling-interface" className="inline-flex items-center gap-1 hover:underline">
          Learn more
          <IconExternal width={16} height={16} />
        </a>
      </Typography>
    ),
  },
};

export const WithSingleAction: Story = {
  args: {
    size: "medium",
    variant: "primary",
    icon: <IconUpload />,
    title: "Upload your data",
    description: "Choose a file from your computer to get started",
    actions: (
      <Button variant="primary" look="filled">
        Upload File
      </Button>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    size: "medium",
    variant: "primary",
    icon: <IconUpload />,
    title: "Import data to get started",
    description: "Connect your cloud storage or upload files from your computer",
    actions: (
      <>
        <Button variant="primary" look="filled" className="flex-1">
          Connect Cloud Storage
        </Button>
        <Button variant="primary" look="outlined" className="flex-1">
          Upload Files
        </Button>
      </>
    ),
  },
};

// Size Comparison Stories
export const SizeComparison: Story = {
  render: () => (
    <div className="space-y-12">
      <div>
        <h3 className="text-lg font-semibold mb-4">Large Size (Data Manager Style)</h3>
        <div className="border border-neutral-border rounded-lg p-4 h-96">
          <EmptyState
            size="large"
            variant="primary"
            icon={<IconUpload />}
            title="Import data to get your project started"
            description="Connect your cloud storage or upload files from your computer"
            actions={
              <>
                <Button variant="primary" look="filled" className="flex-1">
                  Connect Cloud Storage
                </Button>
                <Button variant="primary" look="outlined" className="flex-1">
                  Import
                </Button>
              </>
            }
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Medium Size (Home Page Style)</h3>
        <div className="border border-neutral-border rounded-lg p-4 h-64">
          <EmptyState
            size="medium"
            variant="primary"
            icon={<IconUpload />}
            title="Create your first project"
            description="Import your data and set up the labeling interface to start annotating"
            actions={
              <Button variant="primary" look="filled">
                Create Project
              </Button>
            }
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Small Size (Sidepanel Style)</h3>
        <div className="border border-neutral-border rounded-lg p-4 h-48">
          <EmptyState
            size="small"
            variant="primary"
            icon={<IconLsLabeling />}
            title="Labeled regions will appear here"
            description="Start labeling and track your results using this panel"
            footer={
              <Typography variant="label" size="small" className="text-primary-link">
                <a href="/docs/labeling-interface" className="inline-flex items-center gap-1 hover:underline">
                  Learn more
                  <IconExternal width={16} height={16} />
                </a>
              </Typography>
            }
          />
        </div>
      </div>
    </div>
  ),
};

// Color Variant Stories
export const ColorVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-8">
      <div className="border border-neutral-border rounded-lg p-4 h-64">
        <EmptyState
          size="medium"
          variant="primary"
          icon={<IconUpload />}
          title="Primary Variant"
          description="Default blue theme for standard empty states"
        />
      </div>

      <div className="border border-neutral-border rounded-lg p-4 h-64">
        <EmptyState
          size="medium"
          variant="neutral"
          icon={<IconInbox />}
          title="Neutral Variant"
          description="Gray theme for neutral states"
        />
      </div>

      <div className="border border-neutral-border rounded-lg p-4 h-64">
        <EmptyState
          size="medium"
          variant="negative"
          icon={<IconSearch />}
          title="Negative Variant"
          description="Red theme for error states and failures"
        />
      </div>

      <div className="border border-neutral-border rounded-lg p-4 h-64">
        <EmptyState
          size="medium"
          variant="positive"
          icon={<IconCheck />}
          title="Positive Variant"
          description="Green theme for success states"
        />
      </div>

      <div className="border border-neutral-border rounded-lg p-4 h-64">
        <EmptyState
          size="medium"
          variant="warning"
          icon={<IconSearch />}
          title="Warning Variant"
          description="Orange/Yellow theme for warning states"
        />
      </div>

      <div className="border border-neutral-border rounded-lg p-4 h-64">
        <EmptyState
          size="medium"
          variant="gradient"
          icon={<IconLsLabeling />}
          title="Gradient Variant"
          description="AI gradient theme with special effects and pulsating animation"
        />
      </div>
    </div>
  ),
};

// Data Manager Inspired Stories
export const DataManagerImport: Story = {
  args: {
    size: "large",
    variant: "primary",
    icon: <IconUpload />,
    title: "Import data to get your project started",
    description: "Connect your cloud storage or upload files from your computer",
    additionalContent: (
      <div className="flex items-center justify-center gap-base">
        <Tooltip title="Amazon S3">
          <div className="flex items-center justify-center p-2">
            <IconCloudProviderS3 width={32} height={32} className="text-neutral-content-subtler" />
          </div>
        </Tooltip>
        <Tooltip title="Google Cloud Storage">
          <div className="flex items-center justify-center p-2">
            <IconCloudProviderGCS width={32} height={32} className="text-neutral-content-subtler" />
          </div>
        </Tooltip>
        <Tooltip title="Azure Blob Storage">
          <div className="flex items-center justify-center p-2">
            <IconCloudProviderAzure width={32} height={32} className="text-neutral-content-subtler" />
          </div>
        </Tooltip>
        <Tooltip title="Redis Storage">
          <div className="flex items-center justify-center p-2">
            <IconCloudProviderRedis width={32} height={32} className="text-neutral-content-subtler" />
          </div>
        </Tooltip>
      </div>
    ),
    actions: (
      <>
        <Button variant="primary" look="filled" className="flex-1">
          Connect Cloud Storage
        </Button>
        <Button variant="primary" look="outlined" className="flex-1">
          Import
        </Button>
      </>
    ),
    footer: (
      <Typography variant="label" size="small" className="text-primary-link hover:underline">
        <a href="/docs/import-data" className="inline-flex items-center gap-1">
          See docs on importing data
          <IconExternal width={20} height={20} />
        </a>
      </Typography>
    ),
  },
};

export const AnnotatorLabelingState: Story = {
  args: {
    size: "medium",
    variant: "primary",
    icon: <IconLsLabeling />,
    title: "Start labeling tasks",
    description: "Begin labeling to track your progress here",
    actions: (
      <Button variant="primary" look="filled">
        Label All Tasks
      </Button>
    ),
  },
};

export const ReviewerEmptyState: Story = {
  args: {
    size: "medium",
    variant: "primary",
    icon: <IconLsReview />,
    title: "Begin reviewing tasks",
    description: "Import tasks to this project to start reviewing",
  },
};

export const NoResultsFound: Story = {
  args: {
    size: "medium",
    variant: "warning",
    icon: <IconSearch />,
    title: "Refine your search",
    description: "Adjust or clear your filters to see more results",
    actions: (
      <Button variant="primary" look="outlined">
        Clear Filters
      </Button>
    ),
  },
};

export const AssignedTasksEmpty: Story = {
  args: {
    size: "medium",
    variant: "neutral",
    icon: <IconInbox />,
    title: "Wait for task assignment",
    description: "Check back here when tasks get assigned to you",
  },
};

export const LabelingQueueComplete: Story = {
  args: {
    size: "medium",
    variant: "positive",
    icon: <IconCheck />,
    title: "You're all caught up!",
    description: "All tasks in the queue have been completed",
    actions: (
      <Button variant="primary" look="outlined">
        Go to Previous Task
      </Button>
    ),
  },
};

// Complex Content Example
export const ComplexContent: Story = {
  args: {
    size: "large",
    variant: "primary",
    icon: <IconUpload />,
    title: "Upload your files",
    description: "Choose from multiple upload options and formats to get started",
    additionalContent: (
      <div className="text-center">
        <Typography variant="label" size="small" className="text-neutral-content-subtler mb-2">
          Supported formats: CSV, JSON, TSV, TXT
        </Typography>
        <div className="flex justify-center items-center gap-2 text-neutral-content-subtler">
          <div className="w-2 h-2 bg-positive-icon rounded-full" />
          <Typography variant="label" size="smallest">
            Drag and drop enabled
          </Typography>
        </div>
      </div>
    ),
    actions: (
      <>
        <Button variant="primary" look="filled" className="flex-1">
          Browse Files
        </Button>
        <Button variant="primary" look="outlined" className="flex-1">
          Connect Storage
        </Button>
        <Button variant="neutral" look="outlined">
          Import From URL
        </Button>
      </>
    ),
    footer: (
      <div className="text-center space-y-1">
        <Typography variant="label" size="small" className="text-primary-link">
          <a href="/docs/import-guide" className="hover:underline">
            Need help? View our import guide
          </a>
        </Typography>
        <Typography variant="label" size="smallest" className="text-neutral-content-subtler">
          Maximum file size: 100MB per file
        </Typography>
      </div>
    ),
  },
};

// Accessibility Example
export const WithAccessibility: Story = {
  args: {
    size: "medium",
    variant: "primary",
    icon: <IconInbox />,
    title: "Build your collection",
    description: "Start adding items to create your first collection",
    titleId: "accessible-empty-title",
    descriptionId: "accessible-empty-desc",
    "aria-label": "Add items to build your collection",
    "data-testid": "accessible-empty-state",
    actions: (
      <Button variant="primary" look="filled">
        Add First Item
      </Button>
    ),
  },
};

// Relations Panel Example
export const RelationsPanel: Story = {
  args: {
    size: "small",
    variant: "primary",
    icon: <IconRelationLink />,
    title: "Create relations between labels",
    description: "Add relations to establish connections between labeled regions",
    actions: (
      <Button variant="primary" look="outlined" size="small">
        Add Relation
      </Button>
    ),
  },
};
