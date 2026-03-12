import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { BadgeGroup } from "./badge-group";
import { Typography } from "../typography/typography";
import { DataTable } from "../data-table";
import { Button } from "../button/button";

const meta = {
  title: "UI/BadgeGroup",
  component: BadgeGroup,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof BadgeGroup>;

export default meta;
type Story = StoryObj<typeof BadgeGroup>;

export const Default: Story = {
  args: {
    items: [
      { id: 1, label: "JavaScript" },
      { id: 2, label: "TypeScript" },
      { id: 3, label: "React" },
    ],
  },
};

export const WithVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-base w-[400px]">
      <div>
        <Typography variant="body" className="mb-tight font-semibold">
          Info (default)
        </Typography>
        <BadgeGroup
          items={[
            { id: 1, label: "JavaScript" },
            { id: 2, label: "TypeScript" },
            { id: 3, label: "React" },
          ]}
          variant="info"
        />
      </div>
      <div>
        <Typography variant="body" className="mb-tight font-semibold">
          Success
        </Typography>
        <BadgeGroup
          items={[
            { id: 1, label: "JavaScript" },
            { id: 2, label: "TypeScript" },
            { id: 3, label: "React" },
          ]}
          variant="success"
        />
      </div>
      <div>
        <Typography variant="body" className="mb-tight font-semibold">
          Warning
        </Typography>
        <BadgeGroup
          items={[
            { id: 1, label: "JavaScript" },
            { id: 2, label: "TypeScript" },
            { id: 3, label: "React" },
          ]}
          variant="warning"
        />
      </div>
      <div>
        <Typography variant="body" className="mb-tight font-semibold">
          Destructive
        </Typography>
        <BadgeGroup
          items={[
            { id: 1, label: "JavaScript" },
            { id: 2, label: "TypeScript" },
            { id: 3, label: "React" },
          ]}
          variant="destructive"
        />
      </div>
      <div>
        <Typography variant="body" className="mb-tight font-semibold">
          Rounded
        </Typography>
        <BadgeGroup
          items={[
            { id: 1, label: "JavaScript" },
            { id: 2, label: "TypeScript" },
            { id: 3, label: "React" },
          ]}
          shape="rounded"
        />
      </div>
    </div>
  ),
};

export const ResponsiveDemo: Story = {
  render: () => (
    <div className="flex flex-col gap-loose">
      <div>
        <Typography variant="body" size="small" className="mb-tight font-semibold">
          Wide container (500px)
        </Typography>
        <div className="w-[500px] border border-dashed border-neutral-border p-base">
          <BadgeGroup
            items={[
              { id: 1, label: "JavaScript" },
              { id: 2, label: "TypeScript" },
              { id: 3, label: "React" },
              { id: 4, label: "Vue" },
              { id: 5, label: "Angular" },
            ]}
          />
        </div>
      </div>
      <div>
        <Typography variant="body" size="small" className="mb-tight font-semibold">
          Medium container (350px)
        </Typography>
        <div className="w-[350px] border border-dashed border-neutral-border p-base">
          <BadgeGroup
            items={[
              { id: 1, label: "JavaScript" },
              { id: 2, label: "TypeScript" },
              { id: 3, label: "React" },
              { id: 4, label: "Vue" },
              { id: 5, label: "Angular" },
            ]}
          />
        </div>
      </div>
      <div>
        <Typography variant="body" size="small" className="mb-tight font-semibold">
          Narrow container (200px)
        </Typography>
        <div className="w-[200px] border border-dashed border-neutral-border p-base">
          <BadgeGroup
            items={[
              { id: 1, label: "JavaScript" },
              { id: 2, label: "TypeScript" },
              { id: 3, label: "React" },
              { id: 4, label: "Vue" },
              { id: 5, label: "Angular" },
            ]}
          />
        </div>
      </div>
    </div>
  ),
};

export const InTableCell: Story = {
  render: () => {
    const data = [
      {
        name: "John Doe",
        tags: [
          { id: 1, label: "Developer" },
          { id: 2, label: "Team Lead" },
          { id: 3, label: "Frontend" },
        ],
      },
      {
        name: "Jane Smith",
        tags: [
          { id: 1, label: "Designer" },
          { id: 2, label: "UX" },
          { id: 3, label: "UI" },
          { id: 4, label: "Product" },
          { id: 5, label: "Senior" },
        ],
      },
      {
        name: "Bob Johnson",
        tags: [
          { id: 1, label: "Backend" },
          { id: 2, label: "Python" },
          { id: 3, label: "Django" },
          { id: 4, label: "PostgreSQL" },
          { id: 5, label: "Docker" },
          { id: 6, label: "AWS" },
        ],
      },
    ];

    const columns = [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }: any) => <Typography variant="body">{row.original.name}</Typography>,
      },
      {
        id: "tags",
        header: "Tags",
        accessorKey: "tags",
        minSize: 300,
        cell: ({ row }: any) => <BadgeGroup items={row.original.tags} />,
      },
    ];

    return <DataTable data={data} columns={columns} />;
  },
};

/**
 * **Show All / Show Less with `onTruncationChange`**
 *
 * Use `onTruncationChange` to know when the badge group is actually truncated (overflow "+n" visible).
 * Only show the "Show All" button when truncated, or when expanded (to show "Show Less").
 * This avoids showing the button when all tags fit (e.g. a single tag).
 */
export const WithShowAllButton: Story = {
  render: () => {
    const [showAll, setShowAll] = React.useState(false);
    const [isTruncated, setIsTruncated] = React.useState(false);

    const tags = [
      { id: 1, label: "English" },
      { id: 2, label: "Spanish" },
      { id: 3, label: "French" },
      { id: 4, label: "German" },
      { id: 5, label: "Translator" },
      { id: 6, label: "Legal" },
      { id: 7, label: "Technical" },
      { id: 8, label: "Medical" },
      { id: 9, label: "Finance" },
    ];

    const showButton = isTruncated || showAll;

    return (
      <div className="w-[400px] border border-dashed border-neutral-border p-base">
        <Typography variant="body" size="small" className="mb-tight text-neutral-text-secondary">
          When truncated: badges overflow with +n badge. Button appears only when truncated or when expanded.
          <br />
          When not truncated: badges wrap to multiple lines; no button.
        </Typography>
        <div className="flex flex-col gap-tight">
          <BadgeGroup items={tags} truncate={!showAll} onTruncationChange={setIsTruncated} />
          {showButton && (
            <Button size="small" variant="neutral" onClick={() => setShowAll(!showAll)} className="self-start">
              {showAll ? "Show Less" : "Show All"}
            </Button>
          )}
        </div>
      </div>
    );
  },
};

/**
 *
 * When `badgeMaxWidth` is set, each badge label is capped at that width with an ellipsis. A tooltip
 * with the full label appears on hover **only** when the text is actually clipped — short labels get
 * no tooltip.
 */
export const WithBadgeMaxWidth: Story = {
  render: () => {
    const tags = [
      { id: 1, label: "Short" },
      { id: 2, label: "Engineering" },
      { id: 3, label: "Very long label that will definitely be truncated" },
      { id: 4, label: "Another lengthy tag name here" },
      { id: 5, label: "Design" },
      { id: 6, label: "Product Management" },
    ];

    return (
      <div className="flex flex-col gap-4">
        <div>
          <Typography variant="body" size="small" className="mb-tight text-neutral-text-secondary">
            Without <code>badgeMaxWidth</code> — labels expand freely:
          </Typography>
          <BadgeGroup items={tags} />
        </div>
        <div>
          <Typography variant="body" size="small" className="mb-tight text-neutral-text-secondary">
            With <code>badgeMaxWidth={120}</code> — long labels clip with ellipsis; hover to see the full text:
          </Typography>
          <BadgeGroup items={tags} badgeMaxWidth={120} />
        </div>
      </div>
    );
  },
};
