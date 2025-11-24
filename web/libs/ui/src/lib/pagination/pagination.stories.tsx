import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Pagination } from "./pagination";

const meta: Meta<typeof Pagination> = {
  component: Pagination,
  title: "UI/Pagination",
  argTypes: {
    currentPage: { control: "number" },
    totalPages: { control: "number" },
    pageSize: { control: "number" },
    totalItems: { control: "number" },
    label: { control: "text" },
    allowInput: { control: "boolean" },
    allowRewind: { control: "boolean" },
    disabled: { control: "boolean" },
    alwaysVisible: { control: "boolean" },
    showLabel: { control: "boolean" },
    showPageSize: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    pageSize: 20,
    totalItems: 200,
    label: "Items",
    allowInput: true,
    allowRewind: true,
    disabled: false,
    alwaysVisible: false,
    showLabel: true,
    showPageSize: true,
    pageSizeOptions: [10, 20, 50, 100],
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const totalItems = 237;
    const totalPages = Math.ceil(totalItems / pageSize);

    return (
      <div className="flex flex-col gap-4">
        <div className="p-4 bg-neutral-surface rounded-md">
          <p className="text-sm text-neutral-content-subtle">
            Try navigating pages, changing page size, or clicking on the page number to edit it directly.
          </p>
        </div>
        <Pagination
          {...args}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          label="Members"
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1); // Reset to first page when changing page size
          }}
        />
      </div>
    );
  },
};

export const WithoutRewindButtons: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    pageSize: 20,
    totalItems: 200,
    label: "Projects",
    allowRewind: false,
  },
};

export const WithoutPageSizeSelector: Story = {
  args: {
    currentPage: 3,
    totalPages: 10,
    pageSize: 20,
    totalItems: 200,
    label: "Tasks",
    showPageSize: false,
  },
};

export const WithoutLabel: Story = {
  args: {
    currentPage: 2,
    totalPages: 10,
    pageSize: 20,
    totalItems: 200,
    showLabel: false,
  },
};

export const Disabled: Story = {
  args: {
    currentPage: 3,
    totalPages: 10,
    pageSize: 20,
    totalItems: 200,
    label: "Items",
    disabled: true,
  },
};

export const SinglePage: Story = {
  args: {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 15,
    label: "Items",
  },
};

export const AlwaysVisibleWithSinglePage: Story = {
  args: {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 15,
    label: "Items",
    alwaysVisible: true,
  },
};

export const LargeDataset: Story = {
  args: {
    currentPage: 1,
    totalPages: 500,
    pageSize: 50,
    totalItems: 25000,
    label: "Records",
    pageSizeOptions: [25, 50, 100, 250, 500],
  },
};

export const Minimal: Story = {
  args: {
    currentPage: 1,
    totalPages: 5,
    pageSize: 10,
    totalItems: 50,
    allowRewind: false,
    showLabel: false,
    showPageSize: false,
  },
};
