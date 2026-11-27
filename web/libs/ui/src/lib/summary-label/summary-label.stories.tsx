import type { Meta, StoryObj } from "@storybook/react";
import { SummaryLabel, type SummaryLabelItem } from "./summary-label";

const TAGS: SummaryLabelItem[] = ["Spanish", "Portuguese", "Italian", "French", "German", "Dutch", "Polish"].map(
  (label, id) => ({ id, label }),
);
const STATES: SummaryLabelItem[] = [
  { id: 1, label: "Verified", variant: "positive" },
  { id: 2, label: "Self-reported", variant: "neutral" },
  { id: 3, label: "Failed", variant: "negative" },
  { id: 4, label: "In review", variant: "plum" },
];

const meta = {
  title: "Data display/SummaryLabel",
  component: SummaryLabel,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Values that fit, then +N for the rest, as comma-separated text or badges. The last value that fits cuts with an ellipsis; at least one value always shows. Counts shorten from a thousand up (+1.2k). What clicking +N does belongs to the parent.",
      },
    },
  },
  args: { items: TAGS },
} satisfies Meta<typeof SummaryLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag the handle at the bottom right to resize: more values show as the container widens. */
const Resizable = ({ children, width = 260 }: { children: React.ReactNode; width?: number }) => (
  <div
    className="resize-x overflow-hidden rounded-small border border-dashed border-neutral-border p-tight"
    style={{ width, minWidth: 80, maxWidth: "100%" }}
  >
    {children}
  </div>
);

export const Text: Story = {
  render: (args) => (
    <Resizable>
      <SummaryLabel {...args} />
    </Resizable>
  ),
};

export const Badges: Story = {
  args: { items: STATES, badges: true, shape: "rounded" },
  render: (args) => (
    <Resizable width={220}>
      <SummaryLabel {...args} />
    </Resizable>
  ),
};

/** Where values can be selected, say so: "a, b +3 selected". */
export const SelectedCount: Story = {
  args: { countLabel: (n) => `+${n} selected` },
  render: (args) => (
    <Resizable>
      <SummaryLabel {...args} />
    </Resizable>
  ),
};

export const LargeCount: Story = {
  args: { items: Array.from({ length: 1_250 }, (_, id) => ({ id, label: `Project ${id + 1}` })) },
  render: (args) => (
    <Resizable>
      <SummaryLabel {...args} />
    </Resizable>
  ),
};

/** `truncate={false}` shows every value and wraps, e.g. behind a "Show all" toggle. */
export const ShowAll: Story = {
  args: { truncate: false, badges: true },
  render: (args) => (
    <Resizable>
      <SummaryLabel {...args} />
    </Resizable>
  ),
};
