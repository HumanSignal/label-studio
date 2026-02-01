import type { Meta, StoryObj } from "@storybook/react";
import { JsonViewer } from "./json-viewer";

// Sample data for stories
const sampleTaskData = {
  id: 123,
  data: {
    text: "This is a sample text for annotation",
    image: "https://example.com/image.jpg",
    metadata: {
      source: "web",
      timestamp: "2024-01-15T10:30:00Z",
      author: "John Doe",
    },
  },
  annotations: [
    {
      id: 1,
      completed_by: 5,
      result: [
        {
          value: {
            start: 0,
            end: 10,
            text: "This is a ",
            labels: ["ENTITY"],
          },
          from_name: "label",
          to_name: "text",
          type: "labels",
        },
      ],
      was_cancelled: false,
      ground_truth: false,
      created_at: "2024-01-15T11:00:00Z",
      updated_at: "2024-01-15T11:05:00Z",
      lead_time: 45.5,
    },
  ],
  predictions: [
    {
      id: 1,
      model_version: "v1.2.3",
      score: 0.95,
      result: [
        {
          value: {
            start: 0,
            end: 10,
            text: "This is a ",
            labels: ["PREDICTED_ENTITY"],
          },
          from_name: "label",
          to_name: "text",
          type: "labels",
        },
      ],
      created_at: "2024-01-15T10:45:00Z",
    },
  ],
  state: "completed",
};

const simpleData = {
  name: "John Doe",
  age: 30,
  email: "john@example.com",
  active: true,
  roles: ["admin", "user"],
  settings: {
    theme: "dark",
    notifications: true,
  },
};

const complexNestedData = {
  project: {
    id: "proj_123",
    name: "ML Annotation Project",
    description: "A project for machine learning annotations",
    created: "2024-01-01",
    team: {
      members: [
        { id: 1, name: "Alice", role: "annotator" },
        { id: 2, name: "Bob", role: "reviewer" },
        { id: 3, name: "Charlie", role: "admin" },
      ],
      settings: {
        autoAssign: true,
        reviewRequired: true,
        qualityThreshold: 0.95,
      },
    },
    statistics: {
      totalTasks: 1000,
      completed: 750,
      inProgress: 150,
      pending: 100,
      accuracy: 0.98,
    },
  },
};

const meta: Meta<typeof JsonViewer> = {
  component: JsonViewer,
  title: "UI/JsonViewer",
  argTypes: {
    data: { control: "object" },
    viewOnly: { control: "boolean" },
    showSearch: { control: "boolean" },
    showFilters: { control: "boolean" },
    showCopyButton: { control: "boolean" },
    minHeight: { control: "number" },
    maxHeight: { control: "number" },
    fontSize: { control: "number" },
    stringTruncate: { control: "number" },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "20px", maxWidth: "1200px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof JsonViewer>;

export const Default: Story = {
  args: {
    data: simpleData,
    viewOnly: true,
    showSearch: true,
    minHeight: 500,
    maxHeight: 500,
    fontSize: 14,
    stringTruncate: 100,
  },
};

export const TaskSourceData: Story = {
  args: {
    data: sampleTaskData,
    viewOnly: true,
    showSearch: true,
    minHeight: 500,
    maxHeight: 500,
    fontSize: 14,
  },
};

export const WithFilters: Story = {
  args: {
    data: sampleTaskData,
    viewOnly: true,
    showSearch: true,
    minHeight: 500,
    maxHeight: 500,
    fontSize: 14,
    customFilters: [
      {
        id: "data",
        label: "Data",
        filterFn: (nodeData) => {
          const path = nodeData.path;
          return path && (path.includes("data") || path[0] === "data");
        },
      },
      {
        id: "annotations",
        label: "Annotations",
        filterFn: (nodeData) => {
          const path = nodeData.path;
          return path && path.includes("annotations");
        },
      },
      {
        id: "predictions",
        label: "Predictions",
        filterFn: (nodeData) => {
          const path = nodeData.path;
          return path && path.includes("predictions");
        },
      },
    ],
  },
};

export const ComplexData: Story = {
  args: {
    data: complexNestedData,
    viewOnly: true,
    showSearch: true,
    minHeight: 600,
    maxHeight: 600,
    fontSize: 14,
  },
};

export const WithoutSearch: Story = {
  args: {
    data: simpleData,
    viewOnly: true,
    showSearch: false,
    minHeight: 400,
    maxHeight: 400,
    fontSize: 14,
  },
};

export const LargeDataset: Story = {
  args: {
    data: {
      tasks: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Task ${i + 1}`,
        description: `Description for task ${i + 1}`,
        status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "in_progress" : "pending",
        assignee: `user_${(i % 5) + 1}`,
        tags: [`tag${i % 3}`, `category${i % 4}`],
        metadata: {
          created: new Date(2024, 0, i + 1).toISOString(),
          priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
        },
      })),
    },
    viewOnly: true,
    showSearch: true,
    minHeight: 600,
    maxHeight: 600,
    fontSize: 14,
  },
};

export const CustomHeight: Story = {
  args: {
    data: complexNestedData,
    viewOnly: true,
    showSearch: true,
    minHeight: 300,
    maxHeight: 300,
    fontSize: 14,
  },
};

export const EmptyData: Story = {
  args: {
    data: {},
    viewOnly: true,
    showSearch: true,
    minHeight: 400,
    maxHeight: 400,
    fontSize: 14,
  },
};

export const NullData: Story = {
  args: {
    data: null,
    viewOnly: true,
    showSearch: true,
    minHeight: 400,
    maxHeight: 400,
    fontSize: 14,
  },
};

export const WithStringTruncation: Story = {
  args: {
    data: {
      shortString: "This is a short string",
      longString:
        "This is a very long string that will be truncated. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      url: "https://example.com/very/long/path/to/some/resource/that/might/be/truncated/in/the/viewer",
      description:
        "Another long text field that demonstrates the truncation feature. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      nested: {
        data: "Short",
        longNestedString:
          "This nested string is also very long and will be truncated to demonstrate that truncation works at any depth in the JSON structure. Click to expand and see the full content.",
      },
    },
    viewOnly: true,
    showSearch: true,
    minHeight: 500,
    maxHeight: 500,
    fontSize: 14,
    stringTruncate: 80,
  },
};

export const WithoutCopyButton: Story = {
  args: {
    data: simpleData,
    viewOnly: true,
    showSearch: true,
    showCopyButton: false,
    minHeight: 400,
    maxHeight: 400,
    fontSize: 14,
  },
};

export const WithoutFilters: Story = {
  args: {
    data: sampleTaskData,
    viewOnly: true,
    showSearch: true,
    showFilters: false,
    minHeight: 500,
    maxHeight: 500,
    fontSize: 14,
    customFilters: [
      {
        id: "data",
        label: "Data",
        filterFn: (nodeData) => {
          const path = nodeData.path;
          return path && (path.includes("data") || path[0] === "data");
        },
      },
      {
        id: "annotations",
        label: "Annotations",
        filterFn: (nodeData) => {
          const path = nodeData.path;
          return path && path.includes("annotations");
        },
      },
    ],
  },
};

export const MinimalControls: Story = {
  args: {
    data: simpleData,
    viewOnly: true,
    showSearch: false,
    showFilters: false,
    showCopyButton: false,
    minHeight: 400,
    maxHeight: 400,
    fontSize: 14,
  },
};
