import type { Meta, StoryObj } from "@storybook/react";
import { BellIcon, CheckIcon, XIcon } from "@humansignal/icons";
import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import { Typography } from "../typography/typography";
import { Indicator, type IndicatorPosition } from "./indicator";

const meta = {
  title: "UI/Indicator",
  component: Indicator,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A dot, icon or count on the corner of an avatar, an icon or a button. The label is required: screen readers read it, since a dot or a number alone means nothing. On an avatar, pass `indicator` (top right) or `badge` (bottom right) to `Avatar` instead.",
      },
    },
  },
  args: { label: "3 unread notifications", content: 3, variant: "negative" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "neutral", "positive", "negative", "warning", "grape", "kale", "persimmon", "mango"],
    },
    shape: { control: "select", options: [undefined, "square", "rounded", "pill", "dot"] },
    position: { control: "select", options: ["topRight", "topLeft", "bottomRight", "bottomLeft"] },
    overlap: { control: "select", options: ["rectangular", "circular"] },
  },
} satisfies Meta<typeof Indicator>;

export default meta;
type Story = StoryObj<typeof meta>;

const Host = () => <BellIcon size={24} />;
const ANA = { id: 1, first_name: "Ana", last_name: "Lopez", email: "ana@example.com" };

export const Playground: Story = {
  render: (args) => (
    <div className="p-wide">
      <Indicator {...args}>
        <Host />
      </Indicator>
    </div>
  ),
};

/** No content draws a dot; an icon draws a small square; a number draws a count. */
export const Content: Story = {
  render: () => (
    <div className="flex gap-widest p-wide">
      <Indicator label="New activity">
        <Host />
      </Indicator>
      <Indicator label="Accepted" content={<CheckIcon weight="bold" />} variant="kale">
        <Host />
      </Indicator>
      <Indicator label="3 unread notifications" content={3} variant="negative">
        <Host />
      </Indicator>
    </div>
  ),
};

/** Counts from a thousand up are shortened so they fit: 1.2k, 100k, 2.5M. */
export const CountFormat: Story = {
  render: () => (
    <div className="flex gap-widest p-wide">
      {[7, 42, 999, 1_200, 100_000, 2_500_000].map((count) => (
        <Indicator key={count} label={`${count} unread`} content={count}>
          <Host />
        </Indicator>
      ))}
    </div>
  ),
};

/** The shape scale: square, rounded, pill and dot. The default follows the content. */
export const Shapes: Story = {
  render: () => (
    <div className="flex gap-widest p-wide">
      {(["square", "rounded", "pill", "dot"] as const).map((shape) => (
        <div key={shape} className="flex flex-col items-center gap-tight">
          <Indicator label={shape} content={12} shape={shape}>
            <Host />
          </Indicator>
          <Typography size="smaller">{shape}</Typography>
        </div>
      ))}
    </div>
  ),
};

/** One of the four corners; `overlap="circular"` keeps the mark on the curve of a round host. */
export const Corners: Story = {
  render: () => (
    <div className="flex gap-widest p-wide">
      {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as IndicatorPosition[]).map((position) => (
        <div key={position} className="flex flex-col items-center gap-tight">
          <Indicator label={position} position={position} overlap="circular" variant="positive">
            <Avatar user={ANA} size="large" />
          </Indicator>
          <Typography size="smaller">{position}</Typography>
        </div>
      ))}
    </div>
  ),
};

/** On an avatar, an icon and a button. Avatar draws its own: pass `indicator` and `badge`. */
export const Hosts: Story = {
  render: () => (
    <div className="flex items-center gap-widest p-wide">
      <Avatar
        user={ANA}
        size="large"
        indicator={{ label: "Online", variant: "positive" }}
        badge={{ label: "Rejected review", variant: "persimmon", icon: <XIcon weight="bold" /> }}
      />
      <Indicator label="2 unread" content={2}>
        <Host />
      </Indicator>
      <Indicator label="5 updates" content={5} variant="negative">
        <Button look="outlined" variant="neutral">
          Updates
        </Button>
      </Indicator>
    </div>
  ),
};
