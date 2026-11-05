import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TaxonomyMultiTreeSelect } from "./taxonomy-multi-tree-select";
import type { TaxonomyOption, TaxonomySelection } from "./types";

const meta: Meta<typeof TaxonomyMultiTreeSelect> = {
  component: TaxonomyMultiTreeSelect,
  title: "UI/TaxonomyMultiTreeSelect",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TaxonomyMultiTreeSelect>;

const OPTIONS: TaxonomyOption[] = [
  { value: "lang", label: "Languages" },
  { value: "lang.en", label: "English", parentCode: "lang" },
  { value: "lang.es", label: "Spanish", parentCode: "lang" },
  { value: "lang.de", label: "German", parentCode: "lang" },
  { value: "tool", label: "Tools" },
  { value: "tool.ls", label: "Label Studio", parentCode: "tool" },
  { value: "tool.cvat", label: "CVAT", parentCode: "tool" },
];

const LEVELS = [
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
];

const Controlled = ({ withLevel }: { withLevel?: boolean }) => {
  const [value, setValue] = useState<TaxonomySelection[]>([{ code: "lang.en", label: "English" }]);
  return (
    <div className="w-[560px]">
      <TaxonomyMultiTreeSelect
        options={OPTIONS}
        value={value}
        onChange={setValue}
        fieldLabel="Skills"
        addLabel="Add skill"
        withLevel={withLevel}
        levelOptions={withLevel ? LEVELS : undefined}
      />
    </div>
  );
};

export const Default: Story = { render: () => <Controlled /> };
export const WithLevel: Story = { render: () => <Controlled withLevel /> };
