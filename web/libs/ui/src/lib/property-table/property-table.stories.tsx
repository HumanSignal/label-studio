import type { Meta, StoryObj } from "@storybook/react";
import {
  PropertyList,
  PropertyTable,
  PropertyTableInput,
  PropertyTableRow,
  PropertySection,
  PropertyFieldRow,
  PropertyFooter,
  PropertyActions,
  PropertyButton,
  PropertyTextInput,
} from "./property-table";

const meta = {
  title: "Data display/PropertyTable",
  component: PropertyTable,
  args: { columns: ["Property", "Value"] },
  parameters: { layout: "padded" },
} satisfies Meta<typeof PropertyTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Geometry: Story = {
  render: () => (
    <div style={{ width: 360, minHeight: 420, display: "flex", flexDirection: "column" }}>
      <PropertySection title="Geometry" meta="Source px">
        <PropertyFieldRow label="Center">
          <PropertyTableInput aria-label="X (px)" prefix="X" defaultValue="144" />
          <PropertyTableInput aria-label="Y (px)" prefix="Y" defaultValue="40" />
        </PropertyFieldRow>
        <PropertyFieldRow label="Radius">
          <PropertyTableInput aria-label="Horizontal radius (px)" prefix="X" defaultValue="24" />
          <PropertyTableInput aria-label="Vertical radius (px)" prefix="Y" defaultValue="20" />
        </PropertyFieldRow>
        <PropertyFieldRow label="Rotation">
          <PropertyTableInput aria-label="Rotation" suffix="°" defaultValue="15" />
        </PropertyFieldRow>
      </PropertySection>
      <PropertyFooter editable>
        <PropertyList aria-label="Source details" items={[{ label: "ID", value: "ellipse-1" }]} />
      </PropertyFooter>
    </div>
  ),
};
export const Coordinates: Story = {
  render: () => (
    <PropertySection title="Geometry" meta="1 vertex · Source px">
      <PropertyTable aria-label="Point coordinates" columns={["Vertex", "X px", "Y px"]} hideHeader>
        <PropertyTableRow
          label="1"
          onSelect={() => {}}
          selectLabel="Select Vertex 1"
          active
          values={[
            <PropertyTableInput key="x" prefix="X" aria-label="Vertex 1 X (px)" defaultValue="192" />,
            <PropertyTableInput key="y" prefix="Y" aria-label="Vertex 1 Y (px)" defaultValue="20" />,
          ]}
        />
      </PropertyTable>
    </PropertySection>
  ),
};
export const TextEntity: Story = {
  render: () => (
    <PropertyList
      aria-label="Entity information"
      items={[
        { label: "Text", value: "Ada Lovelace" },
        { label: "Labels", value: "Person" },
        { label: "Start", value: 0 },
        { label: "End", value: 12 },
      ]}
    />
  ),
};

export const EditingControls: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <PropertySection title="Keyframes" meta="Frame 1">
        <PropertyActions label="Keyframe actions">
          <PropertyButton disabled>Add keyframe</PropertyButton>
          <PropertyButton>Remove keyframe</PropertyButton>
        </PropertyActions>
      </PropertySection>
      <PropertySection title="Attributes">
        <PropertyFieldRow label="Category" columns={1}>
          <PropertyTextInput aria-label="Category" value="Pedestrian" onCommit={() => {}} />
        </PropertyFieldRow>
        <PropertyActions label="Interpolation">
          <PropertyButton aria-pressed>Linear</PropertyButton>
          <PropertyButton aria-pressed={false}>Hold</PropertyButton>
        </PropertyActions>
      </PropertySection>
    </div>
  ),
};
