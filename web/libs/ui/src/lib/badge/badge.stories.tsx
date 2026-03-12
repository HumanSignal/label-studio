import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "./badge";
import { EnterpriseBadge } from "../enterprise-badge/enterprise-badge";
import { DataTable } from "../data-table";
import { Typography } from "../typography/typography";

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: "UI/Badge",
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "neutral",
        "negative",
        "positive",
        "warning",
        "gradient",
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
      ],
      // Note: Other variants (default, secondary, destructive, error, info, success, caution, beta, enterprise)
      // are still supported as hidden fallbacks for backwards compatibility
    },
    style: {
      control: "select",
      options: ["filled", "outline", "ghost", "solid"],
    },
    shape: {
      control: "select",
      options: ["rounded", "square"],
      // Note: "squared" is still supported as a hidden fallback for backwards compatibility
    },
    size: {
      control: "select",
      options: ["medium", "small"],
      // Note: "default" and "compact" are still supported as hidden fallbacks for backwards compatibility
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

/**
 *
 * Default grape badge - when no variant is specified, defaults to grape.
 */
export const Default: Story = {
  args: {
    children: "Default",
  },
};

/**
 *
 * Overview of semantic variant mappings that map to accent colors.
 *
 * - **Primary** = Default color for most badges
 * - **Neutral** = Only use when a muted badge is needed
 * - **Negative** = Use to outline False boolean values or to highlight number of issues
 * - **Positive** = Use to outline True boolean values, completed states
 * - **Warning** = Use to highlight number of warnings
 * - **Beta** = Use to highlight beta features, in conjunction with solid style and rounded borders
 */
export const SemanticVariants: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Primary → Grape:</p>
          <p className="text-xs text-neutral-content-subtler mb-2">Default color for most badges.</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="primary">Primary</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Neutral → Sand:</p>
          <p className="text-xs text-neutral-content-subtler mb-2">Only use when a muted badge is needed.</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="neutral">Neutral</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Negative → Persimmon:</p>
          <p className="text-xs text-neutral-content-subtler mb-2">
            Use to outline False boolean values or to highlight number of issues.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="negative">Negative</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Positive → Kale:</p>
          <p className="text-xs text-neutral-content-subtler mb-2">
            Use to outline True boolean values, completed states.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="positive">Positive</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Warning → Canteloupe:</p>
          <p className="text-xs text-neutral-content-subtler mb-2">Use to highlight number of warnings.</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="warning">Warning</Badge>
            <Badge variant="caution">Caution</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Beta → Plum:</p>
          <p className="text-xs text-neutral-content-subtler mb-2">
            Use to highlight beta features, in conjunction with solid style and rounded borders.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="beta">Beta</Badge>
          </div>
        </div>
      </div>
    );
  },
};

/**
 *
 * Use accent colors directly when tags don't have an associated semantic sentiment.
 */
export const AccentColors: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Badge variant="grape">Grape</Badge>
          <Badge variant="blueberry">Blueberry</Badge>
          <Badge variant="kale">Kale</Badge>
          <Badge variant="kiwi">Kiwi</Badge>
          <Badge variant="mango">Mango</Badge>
          <Badge variant="canteloupe">Canteloupe</Badge>
          <Badge variant="persimmon">Persimmon</Badge>
          <Badge variant="plum">Plum</Badge>
          <Badge variant="fig">Fig</Badge>
          <Badge variant="sand">Sand</Badge>
        </div>
      </div>
    );
  },
};

/**
 *
 * Badges support four styles: filled (default), outline, ghost, and solid.
 */
export const StyleVariants: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Filled (default):</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape" style="filled">
              Grape
            </Badge>
            <Badge variant="kale" style="filled">
              Kale
            </Badge>
            <Badge variant="persimmon" style="filled">
              Persimmon
            </Badge>
            <Badge variant="canteloupe" style="filled">
              Canteloupe
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Outline:</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape" style="outline">
              Grape
            </Badge>
            <Badge variant="kale" style="outline">
              Kale
            </Badge>
            <Badge variant="persimmon" style="outline">
              Persimmon
            </Badge>
            <Badge variant="canteloupe" style="outline">
              Canteloupe
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Ghost:</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape" style="ghost">
              Grape
            </Badge>
            <Badge variant="kale" style="ghost">
              Kale
            </Badge>
            <Badge variant="persimmon" style="ghost">
              Persimmon
            </Badge>
            <Badge variant="canteloupe" style="ghost">
              Canteloupe
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Solid:</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape" style="solid">
              Grape
            </Badge>
            <Badge variant="kale" style="solid">
              Kale
            </Badge>
            <Badge variant="persimmon" style="solid">
              Persimmon
            </Badge>
            <Badge variant="canteloupe" style="solid">
              Canteloupe
            </Badge>
          </div>
        </div>
      </div>
    );
  },
};

/**
 *
 * Badges support two shapes: square (default) and rounded.
 *
 * - **Rounded**: Use for status badges, such as project, task, annotation status badges and calling out beta features.
 * - **Square**: Use to outline data types, boolean values in table cells, counts in menu items, fields, or dropdowns.
 */
export const ShapeVariants: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Square (default):</p>
          <p className="text-xs text-neutral-content-subtler mb-2">
            Use to outline data "types", counts in menu items, fields, or dropdowns.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape">Square</Badge>
            <Badge variant="grape" shape="square">
              Square
            </Badge>
            <Badge variant="persimmon">Square</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Rounded:</p>
          <p className="text-xs text-neutral-content-subtler mb-2">
            Use for status badges, such as project, task, and annotation status badges.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape" shape="rounded">
              Rounded
            </Badge>
            <Badge variant="kale" shape="rounded">
              Rounded
            </Badge>
            <Badge variant="persimmon" shape="rounded">
              Rounded
            </Badge>
          </div>
        </div>
      </div>
    );
  },
};

/**
 *
 * Badges support two sizes: medium (default) and small. Small should be used sparingly, only when real estate is minimal—e.g. inside input fields, dropdowns, or beside field labels.
 */
export const SizeVariants: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Medium (default):</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape" size="medium">
              Medium Size
            </Badge>
            <Badge variant="kale" size="medium">
              Medium Size
            </Badge>
            <Badge variant="persimmon" size="medium">
              Medium Size
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Small (use sparingly):</p>
          <p className="text-xs text-neutral-content-subtler mb-2">
            Use when real estate is minimal, e.g. inside input fields, dropdowns, or beside field labels.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="grape" size="small">
              Small
            </Badge>
            <Badge variant="kale" size="small">
              Small
            </Badge>
            <Badge variant="persimmon" size="small">
              Small
            </Badge>
          </div>
        </div>
      </div>
    );
  },
};

/**
 *
 * Use EnterpriseBadge for gradient (Enterprise) badges. Shown with label, styles, icon-only, and text-only.
 */
export const GradientVariant: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-neutral-content-subtle mb-2">With icon and label (default):</p>
        <div className="flex flex-wrap gap-3">
          <EnterpriseBadge />
          <EnterpriseBadge style="filled" />
          <EnterpriseBadge style="ghost" />
          <EnterpriseBadge style="solid" />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-content-subtle mb-2">Text only (no icon):</p>
        <div className="flex flex-wrap gap-3">
          <EnterpriseBadge icon={null} />
          <EnterpriseBadge icon={null} style="filled" />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-content-subtle mb-2">Icon-only:</p>
        <div className="flex flex-wrap gap-3">
          <EnterpriseBadge children="" />
          <EnterpriseBadge style="filled" children="" />
          <EnterpriseBadge style="ghost" children="" />
          <EnterpriseBadge style="solid" children="" />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-content-subtle mb-2">Small size:</p>
        <div className="flex flex-wrap gap-3">
          <EnterpriseBadge size="small" />
          <EnterpriseBadge size="small" children="" />
        </div>
      </div>
    </div>
  ),
};

/**
 *
 * Real-world example showing badges in a user list using DataTable. Status badges use: Annotating (grape), Reviewing (plum), Skipped (persimmon), Pending (neutral), Needs Review (canteloupe).
 */
export const InContext: Story = {
  render: () => {
    const users = [
      { name: "John Doe", email: "john@example.com", role: "Admin", status: "Annotating", verified: true },
      { name: "Jane Smith", email: "jane@example.com", role: "Reviewer", status: "Reviewing", verified: true },
      { name: "Bob Johnson", email: "bob@example.com", role: "Annotator", status: "Skipped", verified: false },
      { name: "Alice Brown", email: "alice@example.com", role: "Manager", status: "Pending", verified: true },
      { name: "Carol White", email: "carol@example.com", role: "Annotator", status: "Needs Review", verified: true },
    ];

    const statusVariant: Record<string, "grape" | "plum" | "persimmon" | "neutral" | "canteloupe"> = {
      Annotating: "grape",
      Reviewing: "plum",
      Skipped: "persimmon",
      Pending: "neutral",
      "Needs Review": "canteloupe",
    };

    const columns: ColumnDef<(typeof users)[number]>[] = [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div>
            <Typography variant="body" size="small" className="font-medium">
              {row.original.name}
            </Typography>
            <Typography variant="body" size="smaller" className="text-neutral-content-subtle">
              {row.original.email}
            </Typography>
          </div>
        ),
      },
      {
        id: "role",
        header: "Role",
        accessorFn: (row) => row.role,
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.role === "Admin"
                ? "persimmon"
                : row.original.role === "Annotator"
                  ? "grape"
                  : row.original.role === "Reviewer"
                    ? "canteloupe"
                    : "neutral"
            }
          >
            {row.original.role}
          </Badge>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status] ?? "neutral"} shape="rounded">
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "verified",
        header: "Verified",
        accessorFn: (row) => row.verified,
        cell: ({ row }) => (
          <Badge variant={row.original.verified ? "positive" : "negative"}>
            {row.original.verified ? "True" : "False"}
          </Badge>
        ),
      },
    ];

    return <DataTable data={users} columns={columns} />;
  },
};

/**
 *
 * Badges can render a close button via the `onClose` prop. Clicking removes the badge from the list.
 */
export const Closable: Story = {
  render: () => {
    const [tags, setTags] = useState([
      { id: 1, label: "Design", variant: "grape" as const },
      { id: 2, label: "Engineering", variant: "blueberry" as const },
      { id: 3, label: "Marketing", variant: "kale" as const },
      { id: 4, label: "Research", variant: "canteloupe" as const },
    ]);

    const remove = (id: number) => setTags((prev) => prev.filter((t) => t.id !== id));

    return (
      <div className="flex flex-col gap-4">
        <Typography variant="body" size="small" className="text-neutral-content-subtle">
          Click the × button to remove a badge. When all are removed, the list is empty.
        </Typography>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} variant={tag.variant} onClose={() => remove(tag.id)}>
              {tag.label}
            </Badge>
          ))}
          {tags.length === 0 && (
            <Typography variant="body" size="small" className="text-neutral-content-subtler italic">
              No tags
            </Typography>
          )}
        </div>
      </div>
    );
  },
};

/**
 *
 * When `maxWidth` is provided, long text is clipped with an ellipsis. A tooltip appears on hover
 * **only** when the text is actually truncated — short labels get no tooltip.
 */
export const WithTruncation: Story = {
  render: () => {
    const labels = [
      "Short",
      "Medium length label",
      "This is a very long label that will definitely be truncated",
      "Another quite lengthy tag name here",
      "OK",
    ];

    return (
      <div className="flex flex-col gap-4">
        <Typography variant="body" size="small" className="text-neutral-content-subtle">
          Hover a truncated badge to see the full text in a tooltip. Short labels show no tooltip.
        </Typography>
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <Badge key={label} variant="grape" maxWidth={120}>
              {label}
            </Badge>
          ))}
        </div>
      </div>
    );
  },
};

/**
 *
 * Combining `maxWidth` and `onClose` produces a removable tag chip with truncation and tooltip support —
 * the pattern used inside `TagAutocomplete` for selected values.
 */
export const ClosableAndTruncated: Story = {
  render: () => {
    const [tags, setTags] = useState([
      { id: 1, label: "Short tag", variant: "grape" as const },
      { id: 2, label: "A much longer tag label that gets clipped", variant: "blueberry" as const },
      { id: 3, label: "Design system", variant: "kale" as const },
      { id: 4, label: "Extremely verbose tag name that overflows the maximum width", variant: "plum" as const },
    ]);

    const remove = (id: number) => setTags((prev) => prev.filter((t) => t.id !== id));

    return (
      <div className="flex flex-col gap-4">
        <Typography variant="body" size="small" className="text-neutral-content-subtle">
          Removable tag chips with truncation at 150 px. Hover a clipped chip to read its full label.
        </Typography>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} variant={tag.variant} maxWidth={150} onClose={() => remove(tag.id)}>
              {tag.label}
            </Badge>
          ))}
        </div>
      </div>
    );
  },
};
