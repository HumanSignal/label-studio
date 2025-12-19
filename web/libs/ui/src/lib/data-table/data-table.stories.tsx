import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DataTable } from "./data-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { ExtendedDataTableColumnDef } from "./data-table";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { IconEdit, IconTrash } from "@humansignal/icons";

const meta: Meta<typeof DataTable> = {
  component: DataTable,
  title: "UI/DataTable",
  argTypes: {
    selectable: { control: "boolean" },
    enableSorting: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// Sample data
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastActive: string;
};

const sampleData: User[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "active", lastActive: "2024-01-15" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Editor", status: "active", lastActive: "2024-01-14" },
  {
    id: 3,
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "Viewer",
    status: "inactive",
    lastActive: "2024-01-10",
  },
  {
    id: 4,
    name: "Alice Brown",
    email: "alice@example.com",
    role: "Editor",
    status: "active",
    lastActive: "2024-01-15",
  },
  {
    id: 5,
    name: "Charlie Wilson",
    email: "charlie@example.com",
    role: "Viewer",
    status: "active",
    lastActive: "2024-01-13",
  },
];

const baseColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    enableSorting: true,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ getValue }) => {
      const role = getValue() as string;
      return (
        <Badge variant={role === "Admin" ? "primary" : role === "Editor" ? "success" : "info"} size="small">
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return (
        <Badge variant={status === "active" ? "success" : "default"} size="small">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "lastActive",
    header: "Last Active",
    enableSorting: true,
  },
];

/**
 * Basic DataTable
 *
 * Shows a simple table with data and columns.
 * Sorting is enabled with controlled state starting as empty (no sort applied).
 * Only columns with explicit `enableSorting: true` will be sortable (Name, Email, Last Active).
 */
export const Default: Story = {
  render: () => {
    const [sorting, setSorting] = useState<SortingState>([]);

    return (
      <DataTable data={sampleData} columns={baseColumns} enableSorting sorting={sorting} onSortingChange={setSorting} />
    );
  },
};

/**
 * Table with Sorting
 *
 * Default sorted by "name" ascending.
 * Click on sortable column headers to change sort direction.
 */
export const WithSorting: Story = {
  render: () => {
    const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md">
          <p className="text-sm text-neutral-content-subtle">
            Click on column headers to sort. Current sort:{" "}
            {sorting.length > 0 ? `${sorting[0].id} (${sorting[0].desc ? "desc" : "asc"})` : "none"}
          </p>
        </div>
        <DataTable
          data={sampleData}
          columns={baseColumns}
          enableSorting
          sorting={sorting}
          onSortingChange={setSorting}
        />
      </div>
    );
  },
};

/**
 * Table with Help Tooltips
 *
 * Demonstrates the `help` property on columns, which displays an info icon with a tooltip
 * in the column header. Hover over the info icon next to "Last Active" to see the tooltip.
 */
export const WithHelpTooltips: Story = {
  render: () => {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columnsWithHelp: ExtendedDataTableColumnDef<User>[] = [
      ...baseColumns.slice(0, -1), // All columns except lastActive
      {
        accessorKey: "lastActive",
        header: "Last Active",
        enableSorting: true,
        help: "The date when the user was last active in the system. This includes any activity such as logging in, viewing content, or making changes.",
      },
    ];

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md">
          <p className="text-sm text-neutral-content-subtle">
            💡 Hover over the info icon next to "Last Active" header to see the help tooltip
          </p>
        </div>
        <DataTable
          data={sampleData}
          columns={columnsWithHelp}
          enableSorting
          sorting={sorting}
          onSortingChange={setSorting}
        />
      </div>
    );
  },
};

export const WithSelection: Story = {
  render: () => {
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(rowSelection).length;

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md">
          <p className="text-sm text-neutral-content-subtle">Selected rows: {selectedCount}</p>
        </div>
        <DataTable
          data={sampleData}
          columns={baseColumns}
          selectable
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>
    );
  },
};

export const WithRowClick: Story = {
  render: () => {
    const [clickedUser, setClickedUser] = useState<User | null>(null);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(rowSelection).length;

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md flex justify-between items-center">
          <p className="text-sm text-neutral-content-subtle">
            {clickedUser ? `Last clicked: ${clickedUser.name}` : "Click on a row"}
          </p>
          <p className="text-sm text-neutral-content-subtle">Selected: {selectedCount}</p>
        </div>
        <DataTable
          data={sampleData}
          columns={baseColumns}
          selectable
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onRowClick={(row) => setClickedUser(row ? row.original : null)}
        />
      </div>
    );
  },
};

export const WithActions: Story = {
  render: () => {
    const columnsWithActions: ColumnDef<User>[] = [
      ...baseColumns,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="small"
              variant="neutral"
              look="outlined"
              leading={<IconEdit />}
              onClick={() => alert(`Edit ${row.original.name}`)}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="negative"
              look="outlined"
              leading={<IconTrash />}
              onClick={() => alert(`Delete ${row.original.name}`)}
            >
              Delete
            </Button>
          </div>
        ),
        meta: {
          noDivider: true,
        },
      },
    ];

    return <DataTable data={sampleData} columns={columnsWithActions} />;
  },
};

export const WithSortingAndSelection: Story = {
  render: () => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(rowSelection).length;

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md flex justify-between items-center">
          <p className="text-sm text-neutral-content-subtle">
            Sort: {sorting.length > 0 ? `${sorting[0].id} (${sorting[0].desc ? "desc" : "asc"})` : "none"}
          </p>
          <p className="text-sm text-neutral-content-subtle">Selected: {selectedCount}</p>
        </div>
        <DataTable
          data={sampleData}
          columns={baseColumns}
          enableSorting
          selectable
          sorting={sorting}
          onSortingChange={setSorting}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>
    );
  },
};

/**
 * Example with empty state when no data
 * Shows the default empty state with search icon and default messaging
 */
export const EmptyState: Story = {
  args: {
    data: [],
    columns: baseColumns,
    emptyState: {},
  },
};

/**
 * Custom Empty State with Actions
 *
 * Example showing a custom empty state with custom title, description, and action buttons.
 * Demonstrates how to provide interactive elements in the empty state.
 */
export const CustomEmptyStateWithActions: Story = {
  render: () => {
    return (
      <DataTable
        data={[]}
        columns={baseColumns}
        emptyState={{
          title: "No users found",
          description:
            "Get started by adding your first user to the system. You can import users or create them manually.",
          actions: (
            <div className="flex gap-2">
              <Button variant="primary" size="small" onClick={() => alert("Create user clicked")}>
                Create User
              </Button>
              <Button variant="neutral" look="outlined" size="small" onClick={() => alert("Import users clicked")}>
                Import Users
              </Button>
            </div>
          ),
        }}
      />
    );
  },
};

/**
 * Loading State
 *
 * Shows skeleton rows while data is loading.
 * Displays 5 skeleton rows by default (configurable with loadingRows prop).
 */
export const Loading: Story = {
  args: {
    data: [],
    columns: baseColumns,
    isLoading: true,
    loadingRows: 5,
  },
};

export const LargeDataset: Story = {
  render: () => {
    const [sorting, setSorting] = useState<SortingState>([]);

    // Generate 100 users
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ["Admin", "Editor", "Viewer"][i % 3],
      status: i % 3 === 0 ? ("inactive" as const) : ("active" as const),
      lastActive: new Date(2024, 0, (i % 30) + 1).toISOString().split("T")[0],
    }));

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md">
          <p className="text-sm text-neutral-content-subtle">
            Showing 100 users. Note: In production, you should use pagination or virtualization for large datasets.
          </p>
        </div>
        <div className="max-h-[500px] overflow-auto">
          <DataTable
            data={largeDataset}
            columns={baseColumns}
            enableSorting
            sorting={sorting}
            onSortingChange={setSorting}
            selectable
          />
        </div>
      </div>
    );
  },
};

export const CustomRowClassName: Story = {
  render: () => {
    return (
      <DataTable
        data={sampleData}
        columns={baseColumns}
        rowClassName={(row) => (row.original.status === "inactive" ? "opacity-50" : undefined)}
      />
    );
  },
};

export const WithColumnResizing: Story = {
  args: {
    data: sampleData,
    columns: baseColumns,
    cellSizesStorageKey: "storybook-table",
  },
};

export const FullFeatured: Story = {
  render: () => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(rowSelection).length;

    const columnsWithActions: ColumnDef<User>[] = [
      ...baseColumns,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="smaller"
              variant="neutral"
              look="outlined"
              leading={<IconEdit />}
              onClick={(e) => {
                e.stopPropagation();
                alert(`Edit ${row.original.name}`);
              }}
            >
              Edit
            </Button>
          </div>
        ),
        meta: {
          noDivider: true,
        },
      },
    ];

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md flex justify-between items-center">
          <p className="text-sm text-neutral-content-subtle">
            Sort: {sorting.length > 0 ? `${sorting[0].id} (${sorting[0].desc ? "desc" : "asc"})` : "none"}
          </p>
          <p className="text-sm text-neutral-content-subtle">Selected: {selectedCount}</p>
        </div>
        <DataTable
          data={sampleData}
          columns={columnsWithActions}
          enableSorting
          selectable
          sorting={sorting}
          onSortingChange={setSorting}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onRowClick={(row) => {
            if (row) {
              console.log("Row clicked:", row.original);
            }
          }}
          rowClassName={(row) => (row.original.status === "inactive" ? "opacity-50" : undefined)}
          cellSizesStorageKey="storybook-full-featured-table"
        />
      </div>
    );
  },
};

/**
 * Conditional Row Selection
 *
 * Use `isRowSelectable` to control which rows can be selected.
 * The checkbox will be hidden for non-selectable rows.
 *
 * In this example, inactive users cannot be selected.
 */
export const ConditionalRowSelection: Story = {
  render: () => {
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(rowSelection).length;

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md">
          <p className="text-sm text-neutral-content-subtle mb-2">
            Selected: <strong>{selectedCount}</strong> user{selectedCount !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-neutral-content-subtle">
            💡 Inactive users (Bob Johnson) cannot be selected - their checkbox is hidden
          </p>
        </div>
        <DataTable
          data={sampleData}
          columns={baseColumns}
          selectable
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          isRowSelectable={(row) => row.original.status === "active"}
        />
      </div>
    );
  },
};
