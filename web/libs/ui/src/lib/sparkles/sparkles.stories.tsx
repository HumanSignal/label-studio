import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles } from "./sparkles";
import { IconAIAssistant } from "@humansignal/icons";

const meta: Meta<typeof Sparkles> = {
  title: "Product/Sparkles",
  component: Sparkles,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "`Sparkles` is a decorative animation wrapper for icons or buttons. It displays animated sparkles around its children, typically used to highlight special actions or features. The animation is accessible and does not interfere with user interaction. The default color is theme-aware and uses the CSS variable `--color-neutral-on-dark-icon`.",
      },
    },
  },
  argTypes: {
    color: {
      control: "color",
      description: "The color of the sparkles. Defaults to the theme-aware CSS variable --color-neutral-on-dark-icon.",
      table: { defaultValue: { summary: "var(--color-neutral-on-dark-icon)" } },
      group: "Appearance",
    },
    buttonSize: {
      control: { type: "number", min: 1, max: 200 },
      description: "The size of the button or area in px.",
      table: { defaultValue: { summary: 28 } },
      group: "Appearance",
    },
    className: {
      control: false,
      description: "Additional className for the root element.",
      group: "Appearance",
    },
    areaShape: {
      control: { type: "radio", options: ["circle", "rect"] },
      description: "The shape of the area in which sparkles can appear: 'circle' or 'rect'.",
      table: { defaultValue: { summary: '"circle"' } },
      group: "Area",
    },
    areaRadius: {
      control: { type: "number", min: 1, max: 200 },
      description: "The radius of the area (if areaShape is 'circle').",
      table: { defaultValue: { summary: "buttonSize/2" } },
      group: "Area",
    },
    areaWidth: {
      control: { type: "number", min: 1, max: 200 },
      description: "The width of the area (if areaShape is 'rect').",
      table: { defaultValue: { summary: "buttonSize" } },
      group: "Area",
    },
    areaHeight: {
      control: { type: "number", min: 1, max: 200 },
      description: "The height of the area (if areaShape is 'rect').",
      table: { defaultValue: { summary: "buttonSize" } },
      group: "Area",
    },
    cutoutShape: {
      control: { type: "radio", options: ["circle", "rect"] },
      description: "The shape of the cutout in the center: 'circle' or 'rect'.",
      table: { defaultValue: { summary: '"circle"' } },
      group: "Area",
    },
    cutoutRadius: {
      control: { type: "number", min: 0, max: 200 },
      description: "The radius of the cutout (if cutoutShape is 'circle').",
      table: { defaultValue: { summary: "buttonSize/2 - 2" } },
      group: "Area",
    },
    cutoutWidth: {
      control: { type: "number", min: 0, max: 200 },
      description: "The width of the cutout (if cutoutShape is 'rect').",
      group: "Area",
    },
    cutoutHeight: {
      control: { type: "number", min: 0, max: 200 },
      description: "The height of the cutout (if cutoutShape is 'rect').",
      group: "Area",
    },
    sparkleCount: {
      control: { type: "number", min: 1, max: 10 },
      description: "Number of sparkles visible at once.",
      table: { defaultValue: { summary: 2 } },
      group: "Sparkle Behavior",
    },
    sparkleSizeMin: {
      control: { type: "number", min: 1, max: 100 },
      description: "Minimum sparkle size in px.",
      table: { defaultValue: { summary: 10 } },
      group: "Sparkle Behavior",
    },
    sparkleSizeMax: {
      control: { type: "number", min: 1, max: 100 },
      description: "Maximum sparkle size in px.",
      table: { defaultValue: { summary: 14 } },
      group: "Sparkle Behavior",
    },
    sparkleLifetime: {
      control: { type: "number", min: 100, max: 10000 },
      description: "Sparkle lifetime in ms.",
      table: { defaultValue: { summary: 3000 } },
      group: "Sparkle Behavior",
    },
    sparkleBaseIntervalMin: {
      control: { type: "number", min: 0, max: 5000 },
      description: "Minimum interval between sparkles in ms.",
      table: { defaultValue: { summary: 800 } },
      group: "Sparkle Behavior",
    },
    sparkleBaseIntervalMax: {
      control: { type: "number", min: 0, max: 5000 },
      description: "Maximum interval between sparkles in ms.",
      table: { defaultValue: { summary: 1600 } },
      group: "Sparkle Behavior",
    },
    sparkleJitter: {
      control: { type: "number", min: 0, max: 2000 },
      description: "Jitter for sparkle interval in ms.",
      table: { defaultValue: { summary: 600 } },
      group: "Sparkle Behavior",
    },
    sparkleMinDistance: {
      control: { type: "number", min: 0, max: 100 },
      description: "Minimum distance between sparkles in px.",
      table: { defaultValue: { summary: 8 } },
      group: "Sparkle Behavior",
    },
    sparkleMinSizeDiff: {
      control: { type: "number", min: 0, max: 100 },
      description: "Minimum size difference between sparkles in px.",
      table: { defaultValue: { summary: 4 } },
      group: "Sparkle Behavior",
    },
    disableAnimation: {
      control: "boolean",
      description: "Disable the sparkle animation.",
      table: { defaultValue: { summary: false } },
      group: "Sparkle Behavior",
    },
    children: {
      control: false,
      description: "Children to render inside the sparkles effect.",
    },
    "data-testid": {
      control: false,
      description: "Test id for the root element.",
      group: "Testing",
    },
    showArea: {
      control: "boolean",
      description: "Show the area and cutout visually for testing/demo purposes.",
      table: { defaultValue: { summary: false } },
      group: "Testing",
    },
  },
};
export default meta;
type Story = StoryObj<typeof Sparkles>;

export const Default: Story = {
  args: {},
  render: (args) => (
    <Sparkles {...args}>
      <IconAIAssistant style={{ width: 28, height: 28, color: "var(--color-neutral-on-dark-icon)" }} />
    </Sparkles>
  ),
};

export const CustomColor: Story = {
  args: { color: "#FFD700" },
  render: (args) => (
    <Sparkles {...args}>
      <IconAIAssistant style={{ width: 28, height: 28, color: "var(--color-neutral-on-dark-icon)" }} />
    </Sparkles>
  ),
};
