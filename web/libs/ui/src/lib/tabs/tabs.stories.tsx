import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  component: Tabs,
  title: "UI/Tabs",
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "flat"],
      description: "Visual variant of the tabs",
    },
    defaultValue: {
      control: "text",
      description: "Default active tab",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

/**
 * Default variant with pill-style tabs in a bordered container.
 * This variant features rounded corners, background colors, and a distinct active state.
 */
export const Default: Story = {
  args: {
    variant: "default",
    defaultValue: "tab1",
  },
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="tab1">Account</TabsTrigger>
        <TabsTrigger value="tab2">Password</TabsTrigger>
        <TabsTrigger value="tab3">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <div className="p-wide border border-neutral-border rounded-smaller">
          <h3 className="text-heading-regular font-semibold mb-tight">Account Settings</h3>
          <p className="text-body-regular text-neutral-content-subtle">
            Manage your account settings and set email preferences.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="tab2">
        <div className="p-wide border border-neutral-border rounded-smaller">
          <h3 className="text-heading-regular font-semibold mb-tight">Password</h3>
          <p className="text-body-regular text-neutral-content-subtle">
            Change your password here. After saving, you'll be logged out.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="tab3">
        <div className="p-wide border border-neutral-border rounded-smaller">
          <h3 className="text-heading-regular font-semibold mb-tight">Settings</h3>
          <p className="text-body-regular text-neutral-content-subtle">
            Configure your application preferences and notifications.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Flat variant with underline indicator for active tabs.
 * This variant features a minimalist design with no background container,
 * perfect for navigation-style tabs.
 */
export const Flat: Story = {
  args: {
    variant: "flat",
    defaultValue: "existing",
  },
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="existing">Add Existing Members</TabsTrigger>
        <TabsTrigger value="invite">Invite Members</TabsTrigger>
      </TabsList>
      <TabsContent value="existing">
        <div className="p-wide border border-neutral-border rounded-smaller">
          <h3 className="text-heading-regular font-semibold mb-tight">Add Existing Members</h3>
          <p className="text-body-regular text-neutral-content-subtle">
            Select members from the organization to add to this project.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="invite">
        <div className="p-wide border border-neutral-border rounded-smaller">
          <h3 className="text-heading-regular font-semibold mb-tight">Invite Members</h3>
          <p className="text-body-regular text-neutral-content-subtle">
            Send email invitations to new members to join this project.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Example with custom className overrides to demonstrate styling flexibility
 */
export const CustomStyling: Story = {
  args: {
    variant: "flat",
    defaultValue: "custom1",
  },
  render: (args) => (
    <div className="max-w-3xl p-widest bg-neutral-surface rounded-smaller">
      <Tabs {...args}>
        <TabsList className="border-b-4 border-neutral-300 gap-widest">
          <TabsTrigger
            value="custom1"
            className="text-heading-regular font-bold uppercase tracking-wide data-[state=active]:border-b-4 data-[state=active]:border-success data-[state=active]:text-success"
          >
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="custom2"
            className="text-heading-regular font-bold uppercase tracking-wide data-[state=active]:border-b-4 data-[state=active]:border-success data-[state=active]:text-success"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="custom3"
            className="text-heading-regular font-bold uppercase tracking-wide data-[state=active]:border-b-4 data-[state=active]:border-success data-[state=active]:text-success"
          >
            Reports
          </TabsTrigger>
        </TabsList>
        <TabsContent value="custom1" className="mt-widest p-wider bg-success-surface rounded-small">
          <h3 className="text-heading-large font-bold text-success mb-tight">Dashboard Overview</h3>
          <p className="text-body-large text-neutral-content">
            This example shows how you can customize tabs with different colors, borders, spacing, and typography.
          </p>
        </TabsContent>
        <TabsContent value="custom2" className="mt-widest p-wider bg-success-surface rounded-small">
          <h3 className="text-heading-large font-bold text-success mb-tight">Analytics Data</h3>
          <p className="text-body-large text-neutral-content">
            Custom green theme with bold typography and larger spacing demonstrates the flexibility of the component.
          </p>
        </TabsContent>
        <TabsContent value="custom3" className="mt-widest p-wider bg-success-surface rounded-small">
          <h3 className="text-heading-large font-bold text-success mb-tight">Detailed Reports</h3>
          <p className="text-body-large text-neutral-content">
            You can override any aspect of the tabs styling to match your specific design requirements.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  ),
};
