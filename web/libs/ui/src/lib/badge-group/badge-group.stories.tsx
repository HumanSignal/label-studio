import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { BadgeGroup } from "./badge-group";
import { Typography } from "../typography/typography";
import { DataTable } from "../data-table";

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
            variant="info"
            shape="squared"
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
            variant="info"
            shape="squared"
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
            variant="info"
            shape="squared"
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
        cell: ({ row }: any) => <BadgeGroup items={row.original.tags} variant="info" shape="squared" />,
      },
    ];

    return <DataTable data={data} columns={columns} />;
  },
};

export const WithShowAllButton: Story = {
  render: () => {
    const [showAll, setShowAll] = React.useState(false);

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

    return (
      <div className="w-[400px] border border-dashed border-neutral-border p-base">
        <Typography variant="body" size="small" className="mb-tight text-neutral-text-secondary">
          When truncated: badges overflow with +n badge
          <br />
          When not truncated: badges wrap to multiple lines
        </Typography>
        <div className="flex flex-col gap-tight">
          <BadgeGroup items={tags} variant="info" shape="squared" truncate={!showAll} />
          {tags.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="self-start px-tight py-tighter text-sm text-primary-content hover:underline"
            >
              {showAll ? "Show Less" : "Show All"}
            </button>
          )}
        </div>
      </div>
    );
  },
};
