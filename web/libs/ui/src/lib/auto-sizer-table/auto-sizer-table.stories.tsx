import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { AutoSizerTable } from "./auto-sizer-table";

const meta: Meta<typeof AutoSizerTable> = {
  component: AutoSizerTable,
  title: "UI/AutoSizerTable",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof AutoSizerTable>;

const ROWS = Array.from({ length: 200 }, (_, i) => `Task ${i + 1}`);

const Row = ({ index, style, data }: { index: number; style: CSSProperties; data: string[] }) => (
  <div style={style} className="flex items-center px-base border-b border-neutral-border text-body-small">
    {data[index]}
  </div>
);

export const Default: Story = {
  render: () => (
    <div className="h-[320px] w-[480px] border border-neutral-border rounded-small">
      <AutoSizerTable
        totalCount={ROWS.length}
        itemData={ROWS}
        itemSize={() => 40}
        isItemLoaded={() => true}
        loadMore={async () => {}}
      >
        {Row}
      </AutoSizerTable>
    </div>
  ),
};
