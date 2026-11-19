import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CheckIcon, XIcon } from "@humansignal/icons";
import { Button } from "../button/button";
import { Dropdown } from "../dropdown/dropdown";
import { Typography } from "../typography/typography";
import { AVATAR_SIZES, Avatar, type AvatarBadgeProps, type AvatarSize } from "./avatar";

// A local drawing instead of a remote photo, so the story renders offline and in screenshot runs.
const PORTRAIT = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#c9b8e8"/><circle cx="48" cy="38" r="18" fill="#6b5a8e"/><path d="M14 96c4-22 18-32 34-32s30 10 34 32z" fill="#6b5a8e"/></svg>',
)}`;

const ada = { id: 1, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" };
const grace = {
  id: 2,
  first_name: "Grace",
  last_name: "Hopper",
  avatar: PORTRAIT,
};

const meta: Meta<typeof Avatar> = {
  component: Avatar,
  title: "Data display/Avatar/Avatar",
  argTypes: {
    size: { control: "select", options: Object.keys(AVATAR_SIZES), table: { defaultValue: { summary: "medium" } } },
    faded: { control: "boolean" },
    showUsername: { control: "boolean" },
    showUsernameTooltip: { control: "boolean" },
    useRandomBackground: { control: "boolean" },
  },
  args: { user: ada },
  parameters: {
    docs: {
      description: {
        component:
          "One person: their photo, or their initials on a colour stable for that person. Several people: `AvatarStack`. Corner marks: `indicator` (a dot, top right) and `badge` (a status, bottom right), both drawn with `Indicator`.\n\nAvatar is not interactive. When clicking it should do something, such as open a menu, put it inside a `Button` with an `aria-label`, never a `div`, so keyboard and screen-reader users can reach it. See **As Menu Trigger**.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Initials: Story = {};

export const WithImage: Story = { args: { user: grace } };

/** The five sizes. medium is the default; large is cards, stacks and the top bar; larger is one person as the page's subject. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-wider">
      {(Object.keys(AVATAR_SIZES) as AvatarSize[]).map((size) => (
        <div key={size} className="flex flex-col items-center gap-tight">
          <Avatar {...args} size={size} />
          <Typography size="smaller">
            {size} · {AVATAR_SIZES[size]}
          </Typography>
        </div>
      ))}
    </div>
  ),
};

export const WithUsername: Story = { args: { showUsername: true } };

const TOOLTIP_SIDES = [
  ["Top", "top-center"],
  ["Right", "right-center"],
  ["Bottom", "bottom-center"],
  ["Left", "left-center"],
] as const;

/** Hover each avatar: `showUsernameTooltip` shows the name, `tooltipAlignment` picks the side (default top). */
export const WithTooltip: Story = {
  args: { showUsernameTooltip: true },
  render: (args) => (
    <div className="grid grid-cols-4 gap-wider p-widest">
      {TOOLTIP_SIDES.map(([label, alignment]) => (
        <div key={alignment} className="flex flex-col items-center gap-tight">
          <Avatar {...args} tooltipAlignment={alignment} />
          <Typography size="smaller" className="text-neutral-content-subtle">
            {label}
          </Typography>
        </div>
      ))}
    </div>
  ),
};

export const Faded: Story = { args: { faded: true } };

export const CountTile: Story = {
  args: { user: undefined, addCount: "+12" },
};

type BadgeExample = { label: string; badge: AvatarBadgeProps };

const check = <CheckIcon weight="bold" />;
const BADGE_GROUPS: { title: string; where: string; items: BadgeExample[] }[] = [
  {
    title: "Review",
    where: "Data Manager annotators column, editor annotation tabs, agreement table",
    items: [
      { label: "Accepted", badge: { variant: "kale", icon: check, label: "Accepted review" } },
      { label: "Rejected", badge: { variant: "persimmon", icon: <XIcon weight="bold" />, label: "Rejected review" } },
      { label: "Fixed", badge: { variant: "grape", icon: check, label: "Fixed review" } },
    ],
  },
  {
    title: "Payment",
    where: "Data Manager payment status column",
    items: [
      { label: "Ready for payment", badge: { variant: "mango", label: "Ready for payment" } },
      { label: "In batch", badge: { variant: "grape", label: "In batch" } },
      { label: "Paid", badge: { variant: "kiwi", label: "Paid" } },
      { label: "Excluded", badge: { variant: "sand", label: "Excluded" } },
    ],
  },
];

/**
 * `badge` is a status in the bottom-right corner, usually with an icon. `indicator` is a dot in the top-right
 * corner, for presence or something new. They can show together.
 */
export const WithBadge: Story = {
  render: (args) => (
    <div className="flex flex-col gap-wide p-base">
      {BADGE_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-tight">
          <Typography variant="title" size="small">
            {group.title}
          </Typography>
          <Typography size="smaller" className="text-neutral-content-subtle">
            {group.where}
          </Typography>
          <div className="flex gap-wide">
            {group.items.map(({ label, badge }) => (
              <div key={label} className="flex flex-col items-center gap-tight">
                <Avatar {...args} badge={badge} />
                <Typography size="smaller">{label}</Typography>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-tight">
        <Typography variant="title" size="small">
          Indicator
        </Typography>
        <Typography size="smaller" className="text-neutral-content-subtle">
          Top bar: unread notifications, newsletter sign-up
        </Typography>
        <div className="flex gap-wide">
          <div className="flex flex-col items-center gap-tight">
            <Avatar {...args} indicator={{ label: "Unread notifications" }} />
            <Typography size="smaller">Unread</Typography>
          </div>
          <div className="flex flex-col items-center gap-tight">
            <Avatar
              {...args}
              indicator={{ label: "Online", variant: "positive" }}
              badge={{ variant: "kale", icon: check, label: "Accepted review" }}
            />
            <Typography size="smaller">Both</Typography>
          </div>
        </div>
      </div>
    </div>
  ),
};

const AccountMenu = (args: Story["args"]) => {
  const [opened, setOpened] = useState(false);
  return (
    <Dropdown.Trigger
      alignment="bottom-left"
      onToggle={setOpened}
      content={
        <div className="p-tight flex flex-col gap-tightest w-max">
          <Button look="ghost" variant="neutral" size="small" align="left">
            Account &amp; Settings
          </Button>
          <Button look="ghost" variant="neutral" size="small" align="left">
            Log Out
          </Button>
        </div>
      }
    >
      <Button
        type="button"
        look="ghost"
        variant="neutral"
        aria-label={`${opened ? "Close" : "Open"} account menu`}
        aria-haspopup="menu"
        aria-expanded={opened}
      >
        <Avatar {...args} indicator={{ label: "Unread notifications" }} />
      </Button>
    </Dropdown.Trigger>
  );
};

/** The top-bar account menu: a `Button` with an `aria-label` holds the avatar and opens a `Dropdown`. Tab to it and press Enter. */
export const AsMenuTrigger: Story = {
  render: (args) => (
    <div className="p-widest">
      <AccountMenu {...args} />
    </div>
  ),
};
