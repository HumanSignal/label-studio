import type { Meta, StoryObj } from "@storybook/react";
import { CodeEditor } from "./code-editor";

const meta: Meta<typeof CodeEditor> = {
  component: CodeEditor,
  title: "UI/CodeEditor",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CodeEditor>;

const CONFIG = `<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="Car"/>
    <Label value="Person"/>
  </RectangleLabels>
</View>`;

export const LabelingConfig: Story = {
  render: () => (
    <div className="w-[640px]">
      <CodeEditor border value={CONFIG} options={{ mode: "xml", lineNumbers: true }} />
    </div>
  ),
};
