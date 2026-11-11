import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Typography } from "../typography/typography";
import { ResizeHandle } from "./resize-handle";

const meta: Meta<typeof ResizeHandle> = {
  component: ResizeHandle,
  title: "UI/ResizeHandle",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ResizeHandle>;

const SplitPanes = () => {
  const [width, setWidth] = useState(240);
  const [start, setStart] = useState(240);
  return (
    <div className="flex h-[240px] w-[640px] border border-neutral-border rounded-small overflow-hidden">
      <div className="bg-neutral-surface p-base" style={{ width }}>
        <Typography variant="body" size="small">
          Left pane
        </Typography>
      </div>
      <ResizeHandle
        onResizeStart={() => setStart(width)}
        onResize={(delta) => setWidth(Math.min(480, Math.max(120, start + delta)))}
      />
      <div className="flex-1 p-base">
        <Typography variant="body" size="small">
          Right pane
        </Typography>
      </div>
    </div>
  );
};

export const Horizontal: Story = { render: () => <SplitPanes /> };
