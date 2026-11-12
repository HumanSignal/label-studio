import type { Meta, StoryObj } from "@storybook/react";
import { CheckIcon } from "@humansignal/icons";
import { AvatarBadge } from "./avatar-badge";
import { AvatarStack } from "./avatar-stack";

const names = [
  ["Ada", "Lovelace"],
  ["Grace", "Hopper"],
  ["Alan", "Turing"],
  ["Katherine", "Johnson"],
  ["Edsger", "Dijkstra"],
  ["Barbara", "Liskov"],
  ["Donald", "Knuth"],
  ["Margaret", "Hamilton"],
  ["Linus", "Torvalds"],
  ["Radia", "Perlman"],
  ["Dennis", "Ritchie"],
  ["Frances", "Allen"],
];
const people = names.map(([first_name, last_name], i) => ({
  id: i + 1,
  first_name,
  last_name,
  email: `${first_name.toLowerCase()}@example.com`,
}));

const meta: Meta<typeof AvatarStack> = {
  component: AvatarStack,
  title: "UI/Avatar/AvatarStack",
  argTypes: {
    max: { control: { type: "number", min: 1, max: 12 } },
    size: {
      control: "select",
      options: ["smaller", "small", "medium", "large", "larger"],
      table: { defaultValue: { summary: "medium" } },
    },
    overlap: { control: "boolean" },
    inclusive: { control: "boolean" },
    overflow: { control: "radio", options: ["tile", "list"] },
    overlayColor: { control: "color", table: { type: { summary: "string | null" } } },
    countLabel: { control: false, table: { defaultValue: { summary: '"N people"' } } },
    getAvatarProps: { control: false },
    onOverflowClick: { control: false },
  },
  args: { users: people, max: 4 },
};

export default meta;
type Story = StoryObj<typeof AvatarStack>;

/** Four slots: three avatars and the +N tile, every pair overlapping by the same amount. */
export const Overlap: Story = { args: { overlap: true } };

/** The default: avatars side by side. */
export const Spaced: Story = {};

/** The tile does not take a slot: four avatars plus +N. */
export const Inclusive: Story = { args: { overlap: true, inclusive: true } };

export const EveryoneFits: Story = { args: { overlap: true, users: people.slice(0, 3) } };

/** The API sent two people and a total. */
export const PartialList: Story = { args: { overlap: true, users: people.slice(0, 2), count: 90 } };

export const Small: Story = { args: { size: "small" } };

export const WithNames: Story = { args: { users: people.slice(0, 1), max: 1, inclusive: true, showUsername: true } };

export const OnCardBackground: Story = {
  args: { overlap: true, overlayColor: "var(--color-neutral-surface-inset)" },
  render: (args) => (
    <div className="p-base rounded-small bg-neutral-surface-inset inline-flex">
      <AvatarStack {...args} />
    </div>
  ),
};

/** The +N opens the list of everyone; a search appears past 8 rows. */
export const OverflowList: Story = { args: { overlap: true, overflow: "list", countLabel: (n) => `${n} members` } };

export const OverflowCallback: Story = {
  args: { overlap: true, onOverflowClick: () => alert("Open the members page") },
};

export const PerAvatarProps: Story = {
  args: {
    overlap: true,
    getAvatarProps: (_user, index) =>
      index === 1
        ? { faded: true }
        : index === 0
          ? { badge: <AvatarBadge variant="kale" icon={<CheckIcon weight="bold" />} label="Accepted review" /> }
          : undefined,
  },
};
