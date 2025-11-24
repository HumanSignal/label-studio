import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: "UI/Badge",
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "info", "outline", "beta"],
    },
    shape: {
      control: "select",
      options: ["rounded", "squared"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

/**
 * Default Badge
 *
 * Primary blue badge - use for highlighting important information.
 */
export const Default: Story = {
  args: {
    children: "Default",
    variant: "default",
  },
};

/**
 * All Variants
 *
 * Overview of all available badge variants.
 */
export const AllVariants: Story = {
  render: () => {
    return (
      <div className="flex flex-wrap gap-3">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="beta">Beta</Badge>
      </div>
    );
  },
};

/**
 * Secondary Badge
 *
 * Neutral gray badge - use for general status or tags.
 */
export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

/**
 * Destructive Badge
 *
 * Red badge - use for errors, warnings, or critical states.
 */
export const Destructive: Story = {
  args: {
    children: "Error",
    variant: "destructive",
  },
};

/**
 * Info Badge
 *
 * Purple/grape badge - use for informational content.
 */
export const Info: Story = {
  args: {
    children: "Information",
    variant: "info",
  },
};

/**
 * Outline Badge
 *
 * Outlined badge with no background - use for subtle emphasis.
 */
export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

/**
 * Beta Badge
 *
 * Plum-colored badge - use for beta features or experimental functionality.
 */
export const Beta: Story = {
  args: {
    children: "Beta",
    variant: "beta",
  },
};

/**
 * Status Badges
 *
 * Common use case: showing different statuses.
 */
export const StatusBadges: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4 max-w-md">
        <div className="flex items-center justify-between p-3 border border-neutral-border rounded">
          <span className="text-sm">Active Project</span>
          <Badge variant="default">Active</Badge>
        </div>
        <div className="flex items-center justify-between p-3 border border-neutral-border rounded">
          <span className="text-sm">Pending Review</span>
          <Badge variant="secondary">Pending</Badge>
        </div>
        <div className="flex items-center justify-between p-3 border border-neutral-border rounded">
          <span className="text-sm">Failed Task</span>
          <Badge variant="destructive">Failed</Badge>
        </div>
        <div className="flex items-center justify-between p-3 border border-neutral-border rounded">
          <span className="text-sm">Draft</span>
          <Badge variant="outline">Draft</Badge>
        </div>
      </div>
    );
  },
};

/**
 * Role Badges
 *
 * Common use case: displaying user roles.
 */
export const RoleBadges: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-neutral-content-subtle">Admin User</div>
          <Badge variant="destructive">Admin</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-neutral-content-subtle">Editor User</div>
          <Badge variant="default">Editor</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-neutral-content-subtle">Viewer User</div>
          <Badge variant="secondary">Viewer</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-neutral-content-subtle">Guest User</div>
          <Badge variant="outline">Guest</Badge>
        </div>
      </div>
    );
  },
};

/**
 * Feature Badges
 *
 * Common use case: marking features as new, beta, or experimental.
 */
export const FeatureBadges: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">AI-Powered Annotations</span>
          <Badge variant="beta">Beta</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Advanced Filters</span>
          <Badge variant="info">New</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Team Collaboration</span>
          <Badge variant="default">Pro</Badge>
        </div>
      </div>
    );
  },
};

/**
 * Badge with Numbers
 *
 * Common use case: displaying counts or quantities.
 */
export const WithNumbers: Story = {
  render: () => {
    return (
      <div className="flex flex-wrap gap-3">
        <Badge variant="default">3</Badge>
        <Badge variant="secondary">12</Badge>
        <Badge variant="destructive">5 errors</Badge>
        <Badge variant="info">24 new</Badge>
        <Badge variant="outline">99+</Badge>
      </div>
    );
  },
};

/**
 * Badge Group
 *
 * Multiple badges together - common for tags or categories.
 */
export const BadgeGroup: Story = {
  render: () => {
    return (
      <div className="max-w-md">
        <p className="text-sm text-neutral-content-subtle mb-2">Project Tags:</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Machine Learning</Badge>
          <Badge variant="secondary">Computer Vision</Badge>
          <Badge variant="secondary">Image Classification</Badge>
          <Badge variant="secondary">Medical</Badge>
          <Badge variant="secondary">Research</Badge>
        </div>
      </div>
    );
  },
};

/**
 * Interactive Badges
 *
 * Badges can be clickable when needed.
 */
export const Interactive: Story = {
  render: () => {
    return (
      <div className="flex flex-wrap gap-3">
        <Badge variant="default" className="cursor-pointer hover:opacity-80" onClick={() => alert("Badge clicked!")}>
          Clickable
        </Badge>
        <Badge variant="secondary" className="cursor-pointer hover:opacity-80" onClick={() => alert("Tag clicked!")}>
          Tag
        </Badge>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-neutral-surface"
          onClick={() => alert("Category clicked!")}
        >
          Category
        </Badge>
      </div>
    );
  },
};

/**
 * Badge Shapes
 *
 * Badges support two shapes: rounded (default) and squared.
 */
export const Shapes: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Rounded (default):</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default" shape="rounded">
              Rounded Default
            </Badge>
            <Badge variant="secondary" shape="rounded">
              Rounded Secondary
            </Badge>
            <Badge variant="outline" shape="rounded">
              Rounded Outline
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Squared:</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default" shape="squared">
              Squared Default
            </Badge>
            <Badge variant="secondary" shape="squared">
              Squared Secondary
            </Badge>
            <Badge variant="outline" shape="squared">
              Squared Outline
            </Badge>
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Custom Styled Badges
 *
 * Badges can be customized with additional classes.
 */
export const CustomStyled: Story = {
  render: () => {
    return (
      <div className="flex flex-wrap gap-3">
        <Badge variant="default" className="text-base px-4 py-1">
          Large Badge
        </Badge>
        <Badge variant="secondary" className="text-[10px] px-2 py-0">
          Tiny Badge
        </Badge>
        <Badge variant="info" shape="squared">
          Squared Badge
        </Badge>
        <Badge variant="beta" className="uppercase tracking-wider">
          Uppercase
        </Badge>
      </div>
    );
  },
};

/**
 * In Context
 *
 * Real-world example showing badges in a user list.
 */
export const InContext: Story = {
  render: () => {
    const users = [
      { name: "John Doe", email: "john@example.com", role: "admin", status: "active" },
      { name: "Jane Smith", email: "jane@example.com", role: "editor", status: "active" },
      { name: "Bob Johnson", email: "bob@example.com", role: "viewer", status: "inactive" },
      { name: "Alice Brown", email: "alice@example.com", role: "editor", status: "active" },
    ];

    return (
      <div className="border border-neutral-border rounded-lg overflow-hidden">
        <div className="bg-neutral-surface px-4 py-3 border-b border-neutral-border">
          <h3 className="font-medium">Team Members</h3>
        </div>
        <div className="divide-y divide-neutral-border">
          {users.map((user) => (
            <div key={user.email} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-neutral-content-subtle">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={user.role === "admin" ? "destructive" : user.role === "editor" ? "default" : "secondary"}
                >
                  {user.role}
                </Badge>
                <Badge variant={user.status === "active" ? "default" : "outline"}>{user.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
