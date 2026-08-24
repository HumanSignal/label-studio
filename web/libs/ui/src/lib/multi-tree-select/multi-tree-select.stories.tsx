import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Typography } from "../typography/typography";
import { MultiTreeSelectDropdown } from "./multi-tree-select-dropdown";
import type { MultiTreeSelectSchema, TreeNodeProps } from "./tree-context";

const meta: Meta<typeof MultiTreeSelectDropdown> = {
  component: MultiTreeSelectDropdown,
  title: "UI/MultiTreeSelect",
  parameters: {
    layout: "padded",
  },
  argTypes: {
    disableAllOption: { control: "boolean" },
    preventAutoChildSelection: { control: "boolean" },
    isRadio: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof MultiTreeSelectDropdown>;

const WORKSPACES_SCHEMA: MultiTreeSelectSchema = {
  id: "id",
  label: "title",
  children: { projects: { id: "id", label: "title" } },
};

type WorkspaceNode = {
  id: number;
  title: string;
  projects: { id: number; title: string }[];
};

const createWorkspaceData = (): WorkspaceNode[] => [
  {
    id: 1,
    title: "Product",
    projects: [
      { id: 101, title: "Onboarding" },
      { id: 102, title: "Checkout" },
    ],
  },
  {
    id: 2,
    title: "Research",
    projects: [
      { id: 201, title: "User Interviews" },
      { id: 202, title: "Survey Analysis" },
    ],
  },
  {
    id: 3,
    title: "Operations",
    projects: [{ id: 301, title: "Vendor Review" }],
  },
];

const createFlatTreeData = (): TreeNodeProps[] => [
  { id: "english", label: "English", searchBy: ["English"], children: [] },
  { id: "spanish", label: "Spanish", searchBy: ["Spanish"], children: [] },
  { id: "french", label: "French", searchBy: ["French"], children: [] },
];

const createHierarchicalTreeData = (): TreeNodeProps[] => [
  {
    id: "earth_sciences",
    label: "Earth Sciences",
    searchBy: ["Earth Sciences"],
    children: [
      { id: "geology", label: "Geology", searchBy: ["Geology"], children: [] },
      { id: "oceanography", label: "Oceanography", searchBy: ["Oceanography"], children: [] },
    ],
  },
  {
    id: "computer_science",
    label: "Computer Science",
    searchBy: ["Computer Science"],
    children: [
      { id: "machine_learning", label: "Machine Learning", searchBy: ["Machine Learning"], children: [] },
      { id: "distributed_systems", label: "Distributed Systems", searchBy: ["Distributed Systems"], children: [] },
    ],
  },
];

const DropdownShell = ({
  initialSelected = [],
  ...props
}: React.ComponentProps<typeof MultiTreeSelectDropdown> & { initialSelected?: string[] }) => {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  return (
    <div className="w-full max-w-md">
      <MultiTreeSelectDropdown
        {...props}
        selected={selected}
        onChange={(_data, nextSelected) => setSelected([...nextSelected])}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => (
    <div className="w-full max-w-md flex flex-col gap-tight">
      <Typography size="small" className="text-neutral-content-subtler">
        Open the dropdown to browse workspaces and projects. Empty selection means “All”.
      </Typography>
      <DropdownShell
        data={createWorkspaceData()}
        schema={WORKSPACES_SCHEMA}
        placeholder="All projects in this organization"
        searchPlaceholder="Search by project or workspace"
        allLabel="All workspaces"
      />
    </div>
  ),
};

export const WithSelection: Story = {
  render: () => (
    <DropdownShell
      data={createWorkspaceData()}
      schema={WORKSPACES_SCHEMA}
      placeholder="All projects in this organization"
      searchPlaceholder="Search by project or workspace"
      allLabel="All workspaces"
      initialSelected={["1-101", "2"]}
      expanded={["1", "2"]}
    />
  ),
};

export const Hierarchical: Story = {
  render: () => (
    <DropdownShell
      data={createHierarchicalTreeData()}
      allLabel="All skills"
      placeholder="Select skills"
      searchPlaceholder="Search skills"
      disableAllOption
      customPlaceholder="Select skills"
      initialSelected={["earth_sciences-geology"]}
      expanded={["earth_sciences"]}
    />
  ),
};

export const RadioMode: Story = {
  render: () => (
    <div className="w-full max-w-md flex flex-col gap-tight">
      <Typography size="small" className="text-neutral-content-subtler">
        Single-select radio mode closes the dropdown after a choice.
      </Typography>
      <DropdownShell
        data={createFlatTreeData()}
        isRadio
        disableAllOption
        customPlaceholder="Pick one language"
        placeholder="Pick one language"
        searchPlaceholder="Search languages"
      />
    </div>
  ),
};

export const PreventAutoChildSelection: Story = {
  render: () => (
    <div className="w-full max-w-md flex flex-col gap-tight">
      <Typography size="small" className="text-neutral-content-subtler">
        Selecting a parent does not select descendants, and selecting all children does not select the parent.
      </Typography>
      <DropdownShell
        data={createHierarchicalTreeData()}
        allLabel="All skills"
        placeholder="Select skills"
        searchPlaceholder="Search skills"
        disableAllOption
        customPlaceholder="Select skills"
        preventAutoChildSelection
        expanded={["computer_science"]}
      />
    </div>
  ),
};

export const WithoutAllOption: Story = {
  render: () => (
    <div className="w-full max-w-md flex flex-col gap-tight">
      <Typography size="small" className="text-neutral-content-subtler">
        <code>disableAllOption</code> hides the root checkbox. Empty selection means nothing selected (not “all”).
        Compare with Default, which shows the All row.
      </Typography>
      <DropdownShell
        data={createWorkspaceData()}
        schema={WORKSPACES_SCHEMA}
        disableAllOption
        customPlaceholder="Select workspaces or projects"
        placeholder="Select workspaces or projects"
        searchPlaceholder="Search by project or workspace"
      />
    </div>
  ),
};
