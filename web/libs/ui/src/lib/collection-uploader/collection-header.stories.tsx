import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CollectionHeader, type CollectionView } from "./collection-header";

const meta: Meta<typeof CollectionHeader> = {
  component: CollectionHeader,
  title: "UI/CollectionHeader",
  parameters: {
    docs: {
      description: {
        component:
          "The deterministic header of a multi-file submission surface: bundle facts on the left (count chip weighing stored files against min_files, aggregate upload progress), grid/list view toggle pushed right. Rendered by CollectionUploader — interfaces never compose or restyle it directly, which keeps every collection surface identical.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof CollectionHeader>;

const Interactive = (args: Story["args"]) => {
  const [view, setView] = useState<CollectionView>("grid");
  return <CollectionHeader storedCount={0} minFiles={2} maxFiles={4} {...args} view={view} onViewChange={setView} />;
};

export const Empty: Story = {
  render: () => <Interactive storedCount={0} />,
};

export const UploadingWithProgress: Story = {
  name: "Uploading (aggregate progress)",
  render: () => <Interactive storedCount={1} uploadingCount={2} bundleProgress={0.45} />,
};

export const BelowMinimum: Story = {
  name: "Below minimum (neutral chip)",
  render: () => <Interactive storedCount={1} />,
};

export const MinimumMet: Story = {
  name: "Minimum met (positive chip)",
  render: () => <Interactive storedCount={3} />,
};

export const ExactCount: Story = {
  name: "Exact count (min == max)",
  render: () => <Interactive storedCount={5} minFiles={8} maxFiles={8} />,
};

export const Submitted: Story = {
  render: () => <Interactive storedCount={3} submitted />,
};
