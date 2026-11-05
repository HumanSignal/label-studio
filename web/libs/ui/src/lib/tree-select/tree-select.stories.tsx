import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TreeSelect, type TreeSelectNode } from "./tree-select";

const meta: Meta<typeof TreeSelect> = {
  component: TreeSelect,
  title: "UI/TreeSelect",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TreeSelect>;

const NODES: TreeSelectNode[] = [
  {
    key: "ws-1",
    value: "ws-1",
    label: "Research",
    children: [
      { key: "p-1", value: "p-1", label: "Survey analysis", isLeaf: true },
      { key: "p-2", value: "p-2", label: "User interviews", isLeaf: true },
    ],
  },
  {
    key: "ws-2",
    value: "ws-2",
    label: "Operations",
    children: [{ key: "p-3", value: "p-3", label: "Vendor review", isLeaf: true }],
  },
  { key: "ws-3", value: "ws-3", label: "Archive", isLeaf: true, disabled: true },
];

const Controlled = ({ multiple }: { multiple?: boolean }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(["ws-1"]);
  const [selectedValues, setSelectedValues] = useState<string[]>(["p-1"]);
  return (
    <div className="w-[420px]">
      <TreeSelect
        nodes={NODES}
        expandedKeys={expandedKeys}
        selectedValues={selectedValues}
        multiple={multiple}
        ariaLabel="Projects"
        onToggleExpand={(node) =>
          setExpandedKeys((keys) =>
            keys.includes(node.key) ? keys.filter((k) => k !== node.key) : [...keys, node.key],
          )
        }
        onToggleSelect={(node) =>
          setSelectedValues((values) =>
            multiple
              ? values.includes(node.value)
                ? values.filter((v) => v !== node.value)
                : [...values, node.value]
              : [node.value],
          )
        }
      />
    </div>
  );
};

export const Single: Story = { render: () => <Controlled /> };
export const Multiple: Story = { render: () => <Controlled multiple /> };
