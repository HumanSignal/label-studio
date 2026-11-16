import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DropZone } from "./drop-zone";

const meta = {
  title: "UI/DropZone",
  component: DropZone,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DropZone>;

export default meta;
type Story = StoryObj<typeof DropZone>;

function Picked(props: Partial<React.ComponentProps<typeof DropZone>>) {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-tight">
      <DropZone multiple onFiles={(files) => setNames(Array.from(files, (file) => file.name))} {...props}>
        {props.children ?? "Drag and drop files here, or click to browse"}
      </DropZone>
      {names.length ? <div className="text-sm">Picked: {names.join(", ")}</div> : null}
    </div>
  );
}

export const Default: Story = { render: () => <Picked /> };

export const Active: Story = { render: () => <Picked active>Drop to add the files</Picked> };

export const Disabled: Story = { render: () => <Picked disabled>The bundle is full</Picked> };

export const Accept: Story = {
  render: () => <Picked accept=".csv">Drag and drop a CSV, or click to browse</Picked>,
};
