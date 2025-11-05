import type { Meta, StoryObj } from "@storybook/react";
import { EnterpriseUpgradeOverlay } from "./enterprise-upgrade-overlay";

const meta: Meta<typeof EnterpriseUpgradeOverlay> = {
  component: EnterpriseUpgradeOverlay,
  title: "UI/EnterpriseUpgradeOverlay",
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    feature: { control: "text" },
    learnMoreUrl: { control: "text" },
    primaryButtonLabel: { control: "text" },
    secondaryButtonLabel: { control: "text" },
    showLearnMore: { control: "boolean" },
    className: { control: "text" },
    "data-testid": { control: "text" },
    onContactSales: { action: "contact sales clicked" },
    onLearnMore: { action: "learn more clicked" },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: "600px", background: "var(--color-neutral-background)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EnterpriseUpgradeOverlay>;

/**
 * Default overlay with standard messaging
 */
export const Default: Story = {
  args: {},
};

/**
 * Overlay customized for Project Dashboards feature
 */
export const ProjectDashboards: Story = {
  args: {
    title: "Get access to Project Dashboards!",
    description:
      "Performance analytics are available within the Enterprise plan. Contact our sales team to get access to this and more!",
    feature: "Project Dashboards",
    learnMoreUrl: "https://docs.humansignal.com/guide/dashboards.html",
  },
};

/**
 * Overlay for SSO & Security features
 */
export const SSOAndSecurity: Story = {
  args: {
    title: "SSO & Advanced Security",
    description: "Enable Single Sign-On, advanced security features, and compliance tools with our Enterprise plan.",
    feature: "SSO & Security Features",
    learnMoreUrl: "https://docs.humansignal.com/guide/security.html",
    secondaryButtonLabel: "Learn more",
  },
};

/**
 * Overlay for Custom Workflows
 */
export const CustomWorkflows: Story = {
  args: {
    title: "Advanced Workflows",
    description: "Create custom automation workflows and advanced labeling pipelines with our Enterprise plan.",
    feature: "Advanced Workflows",
    learnMoreUrl: "https://docs.humansignal.com/guide/workflows.html",
  },
};

/**
 * Overlay without the "Learn More" button
 */
export const WithoutLearnMore: Story = {
  args: {
    title: "Premium Feature",
    description: "This feature is available exclusively in our Enterprise plan. Contact sales to learn more.",
    feature: "Premium Features",
    showLearnMore: false,
  },
};

/**
 * Overlay with custom button labels
 */
export const CustomButtonLabels: Story = {
  args: {
    title: "Upgrade to Enterprise",
    description: "Access all premium features and dedicated support.",
    feature: "Enterprise Plan",
    primaryButtonLabel: "Talk to Sales",
    secondaryButtonLabel: "View Pricing",
    learnMoreUrl: "https://humansignal.com/pricing",
  },
};

/**
 * Overlay shown in context over blurred content
 */
export const InContext: Story = {
  render: () => (
    <div style={{ position: "relative", height: "600px", background: "var(--color-neutral-background)" }}>
      <div style={{ padding: "32px", opacity: 0.5, filter: "blur(2px)" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "var(--color-neutral-content)" }}>
            Project Performance Dashboard
          </h2>
          <p style={{ color: "var(--color-neutral-content-subtler)", marginBottom: "24px" }}>
            Track your team's annotation progress and quality metrics
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
          <div style={{ padding: "20px", background: "var(--color-neutral-background-subtle)", borderRadius: "8px" }}>
            <div style={{ fontSize: "14px", color: "var(--color-neutral-content-subtler)", marginBottom: "8px" }}>
              Total Tasks
            </div>
            <div style={{ fontSize: "32px", fontWeight: 600, color: "var(--color-neutral-content)" }}>1,247</div>
          </div>
          <div style={{ padding: "20px", background: "var(--color-neutral-background-subtle)", borderRadius: "8px" }}>
            <div style={{ fontSize: "14px", color: "var(--color-neutral-content-subtler)", marginBottom: "8px" }}>
              Completed
            </div>
            <div style={{ fontSize: "32px", fontWeight: 600, color: "var(--color-positive-content)" }}>892</div>
          </div>
          <div style={{ padding: "20px", background: "var(--color-neutral-background-subtle)", borderRadius: "8px" }}>
            <div style={{ fontSize: "14px", color: "var(--color-neutral-content-subtler)", marginBottom: "8px" }}>
              Agreement Score
            </div>
            <div style={{ fontSize: "32px", fontWeight: 600, color: "var(--color-neutral-content)" }}>94%</div>
          </div>
        </div>

        <div style={{ padding: "24px", background: "var(--color-neutral-background-subtle)", borderRadius: "8px" }}>
          <h3
            style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--color-neutral-content)" }}
          >
            Annotation Velocity
          </h3>
          <div
            style={{
              height: "120px",
              background: "var(--color-neutral-background)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-neutral-content-subtler)",
            }}
          >
            Chart visualization would appear here
          </div>
        </div>
      </div>
      <EnterpriseUpgradeOverlay
        title="Get access to Project Dashboards!"
        description="Performance analytics are available within the Enterprise plan. Contact our sales team to get access to this and more!"
        feature="Dashboards"
      />
    </div>
  ),
};
