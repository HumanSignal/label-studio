import type { Meta, StoryObj } from "@storybook/react";
import { CheckIcon, XIcon } from "@humansignal/icons";
import { Typography } from "../typography/typography";
import { Avatar } from "./avatar";
import { AvatarBadge, type AvatarBadgeAccent, type AvatarBadgeVariant } from "./avatar-badge";

const ICONS = { none: undefined, check: <CheckIcon weight="bold" />, x: <XIcon weight="bold" /> };
const STATES: AvatarBadgeVariant[] = ["primary", "positive", "negative", "warning", "neutral"];
const ACCENTS: AvatarBadgeAccent[] = [
  "grape",
  "blueberry",
  "kale",
  "kiwi",
  "mango",
  "canteloupe",
  "persimmon",
  "plum",
  "fig",
  "sand",
];
const ada = { id: 1, first_name: "Ada", last_name: "Lovelace" };

const meta: Meta<typeof AvatarBadge> = {
  component: AvatarBadge,
  title: "UI/Avatar/AvatarBadge",
  argTypes: {
    variant: { control: "select", options: [...STATES, ...ACCENTS] },
    shape: { control: "radio", options: ["square", "dot"] },
    icon: { control: "radio", options: Object.keys(ICONS), mapping: ICONS },
    label: { control: "text" },
  },
  args: { label: "Accepted review", variant: "positive", shape: "square", icon: "check" as never },
  parameters: {
    docs: {
      description: {
        component:
          "A status marker for an avatar corner. Pass it to `Avatar`'s `badge` prop and pick the corner with `badgePosition`; the avatar positions it, the badge only draws itself.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AvatarBadge>;

/** The badge on an avatar, as the app renders it. Change variant, shape and icon in the controls. */
export const OnAvatar: Story = {
  render: (args) => <Avatar user={ada} badge={<AvatarBadge {...args} />} />,
};

const swatches = (variants: AvatarBadgeVariant[]) => (
  <div className="flex flex-wrap gap-wider p-base">
    {variants.map((variant) => (
      <div key={variant} className="flex flex-col items-center gap-tight">
        <div className="flex items-center gap-base">
          <AvatarBadge variant={variant} label={variant} />
          <AvatarBadge variant={variant} icon={<CheckIcon weight="bold" />} label={`${variant} with icon`} />
          <AvatarBadge variant={variant} shape="dot" label={`${variant} dot`} />
        </div>
        <Avatar
          user={ada}
          badge={<AvatarBadge variant={variant} icon={<CheckIcon weight="bold" />} label={variant} />}
        />
        <Typography size="smaller">{variant}</Typography>
      </div>
    ))}
  </div>
);

/** State colours, for statuses with a sentiment. */
export const States: Story = { render: () => swatches(STATES) };

/** Accent colours: review badges use kale, persimmon and grape; payment badges mango, grape, kiwi and sand. */
export const Accents: Story = { render: () => swatches(ACCENTS) };

/** A dot, top right: the unread marker on the top-bar avatar. */
export const Dot: Story = {
  args: { shape: "dot", variant: "primary", label: "Unread notifications" },
  render: (args) => <Avatar user={ada} badge={<AvatarBadge {...args} />} badgePosition="topRight" />,
};
