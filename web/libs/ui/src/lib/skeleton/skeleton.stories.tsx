import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  component: Skeleton,
  title: "UI/Skeleton",
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

/**
 * Basic Skeleton
 *
 * Default skeleton loader with shimmer animation.
 */
export const Default: Story = {
  render: () => {
    return <Skeleton className="h-4 w-48" />;
  },
};

/**
 * Text Skeletons
 *
 * Common text loading patterns with different sizes.
 */
export const TextSkeletons: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4 max-w-md">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Heading</p>
          <Skeleton className="h-8 w-64" />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Paragraph</p>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Single Line</p>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  },
};

/**
 * Card Skeleton
 *
 * Example of a loading card with avatar, title, and description.
 */
export const CardSkeleton: Story = {
  render: () => {
    return (
      <div className="border border-neutral-border rounded-lg p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  },
};

/**
 * Table Skeleton
 *
 * Example of loading table rows.
 */
export const TableSkeleton: Story = {
  render: () => {
    return (
      <div className="border border-neutral-border rounded-lg overflow-hidden">
        <div className="bg-neutral-surface px-4 py-3 border-b border-neutral-border">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-neutral-border last:border-b-0">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  },
};

/**
 * List Skeleton
 *
 * Example of loading list items.
 */
export const ListSkeleton: Story = {
  render: () => {
    return (
      <div className="max-w-md">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-neutral-border last:border-b-0">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    );
  },
};

/**
 * Form Skeleton
 *
 * Example of a loading form.
 */
export const FormSkeleton: Story = {
  render: () => {
    return (
      <div className="max-w-md">
        <div className="mb-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    );
  },
};

/**
 * Different Sizes
 *
 * Various skeleton sizes for different use cases.
 */
export const DifferentSizes: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Small (h-3)</p>
          <Skeleton className="h-3 w-48" />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Medium (h-4)</p>
          <Skeleton className="h-4 w-48" />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Large (h-6)</p>
          <Skeleton className="h-6 w-48" />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Extra Large (h-8)</p>
          <Skeleton className="h-8 w-48" />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Avatar (h-12 w-12 rounded-full)</p>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Button (h-10 w-24 rounded-md)</p>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>
    );
  },
};

/**
 * Real-World Example
 *
 * Complete loading state for a user profile card.
 */
export const UserProfileCard: Story = {
  render: () => {
    return (
      <div className="border border-neutral-border rounded-lg p-6 max-w-sm">
        <div className="flex items-start gap-4 mb-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    );
  },
};
