import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  component: Tabs,
  title: "UI/Tabs",
  parameters: {
    docs: {
      description: {
        component:
          "Moves between sub-sections of one section, each with its own content. To switch the view, format or filter of the same content, use SegmentedControl.",
      },
    },
  },
  argTypes: {
    defaultValue: {
      control: "text",
      description: "Default active tab",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const SECTIONS = [
  { value: "overview", label: "Overview", body: "Project summary and recent activity." },
  { value: "members", label: "Members", body: "People who can annotate and review this project." },
  { value: "settings", label: "Settings", body: "Labeling, review and quality settings." },
];

export const Default: Story = {
  args: {
    defaultValue: "overview",
  },
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        {SECTIONS.map((section) => (
          <TabsTrigger key={section.value} value={section.value}>
            {section.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {SECTIONS.map((section) => (
        <TabsContent key={section.value} value={section.value}>
          <p className="text-body-regular text-neutral-content-subtle">{section.body}</p>
        </TabsContent>
      ))}
    </Tabs>
  ),
};
