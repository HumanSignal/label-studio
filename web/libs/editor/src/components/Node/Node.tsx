import type { FC } from "react";
import { getType } from "mobx-state-tree";
import { observer } from "mobx-react";
import { ApartmentOutlined, AudioOutlined, LineChartOutlined, MessageOutlined } from "@ant-design/icons";

import Registry from "../../core/Registry";
import "./Node.prefix.css";
import {
  IconBrushTool,
  IconBrushToolSmart,
  IconCircleTool,
  IconCircleToolSmart,
  IconKeypointsTool,
  IconKeypointsToolSmart,
  IconPolygonTool,
  IconPolygonToolSmart,
  IconRectangle3PointTool,
  IconRectangle3PointToolSmart,
  IconRectangleTool,
  IconRectangleToolSmart,
  IconText,
  IconTimelineRegion,
} from "@humansignal/icons";

interface NodeViewProps {
  name: string;
  icon: any;
  altIcon?: any;
  getContent?: (node: any) => JSX.Element | null;
  fullContent?: (node: any) => JSX.Element | null;
}

const NodeViews: Record<string, NodeViewProps> = {
  // fake view for virtual node representing label group
  LabelModel: {
    name: "",
    icon: () => null,
  },

  RichTextRegionModel: {
    name: "HTML",
    icon: IconText,
    getContent: (node: any) => <span style={{ color: "#5a5a5a" }}>{node.text}</span>,
    fullContent: (node: any) => (
      <div>
        {/* <div style={{ color: "#5a5a5a" }}>{node.text}</div> */}
        <div>{node.start}</div>
        <div>{node.startOffset}</div>
        <div>{JSON.stringify(node.globalOffsets, null, 2)}</div>
      </div>
    ),
  },

  ParagraphsRegionModel: {
    name: "Paragraphs",
    icon: IconText,
    getContent: (node) => <span style={{ color: "#5a5a5a" }}>{node.text}</span>,
  },

  AudioRegionModel: {
    name: "Audio",
    icon: AudioOutlined,
  },

  TimeSeriesRegionModel: {
    name: "TimeSeries",
    icon: LineChartOutlined,
  },

  TextAreaRegionModel: {
    name: "Input",
    icon: MessageOutlined,
    getContent: (node) => <span style={{ color: "#5a5a5a" }}>{node._value}</span>,
  },

  RectRegionModel: {
    name: "Rect",
    icon: IconRectangleTool,
    altIcon: IconRectangleToolSmart,
  },

  Rect3PointRegionModel: {
    name: "Rect3Point",
    icon: IconRectangle3PointTool,
    altIcon: IconRectangle3PointToolSmart,
  },

  VideoRectangleRegionModel: {
    name: "Video Rect",
    icon: IconRectangleTool,
    altIcon: IconRectangleToolSmart,
    getContent: (node) => <span style={{ color: "#5a5a5a" }}>from {node.sequence[0]?.frame} frame</span>,
  },

  VideoVectorRegionModel: {
    name: "Video Vector",
    icon: IconPolygonTool,
    altIcon: IconPolygonToolSmart,
    getContent: (node) => <span style={{ color: "#5a5a5a" }}>from {node.sequence[0]?.frame} frame</span>,
  },

  PolygonRegionModel: {
    name: "Polygon",
    icon: IconPolygonTool,
    altIcon: IconPolygonToolSmart,
  },

  VectorRegionModel: {
    name: "Vector",
    icon: IconPolygonTool,
    altIcon: IconPolygonToolSmart,
  },

  EllipseRegionModel: {
    name: "Ellipse",
    icon: IconCircleTool,
    altIcon: IconCircleToolSmart,
  },

  // @todo add coords
  KeyPointRegionModel: {
    name: "KeyPoint",
    icon: IconKeypointsTool,
    altIcon: IconKeypointsToolSmart,
  },

  BrushRegionModel: {
    name: "Brush",
    icon: IconBrushTool,
    altIcon: IconBrushToolSmart,
  },

  BitmaskRegionModel: {
    name: "Brush",
    icon: IconBrushTool,
    altIcon: IconBrushToolSmart,
  },

  ChoicesModel: {
    name: "Classification",
    icon: ApartmentOutlined,
  },

  TextAreaModel: {
    name: "Input",
    icon: MessageOutlined,
  },

  TimelineRegionModel: {
    name: "Timeline Span",
    icon: IconTimelineRegion,
  },

  ...Object.fromEntries(
    Registry.customTags.filter((tag) => tag.region).map((tag) => [tag.region.name, tag.region.nodeView]),
  ),
};

const NodeIcon: FC<any> = observer(({ node, ...props }) => {
  const name = useNodeName(node);

  if (!name || !(name in NodeViews)) {
    console.error(`No ${name} in NodeView`);
    return null;
  }

  const { icon: Icon } = NodeViews[name];

  return <Icon {...props} />;
});

const useNodeName = (node: any) => {
  // @todo sometimes node is control tag, not a region
  // @todo and for new taxonomy it can be plain object
  if (!node.$treenode) return null;
  return getType(node).name as keyof typeof NodeViews;
};

export { NodeIcon, NodeViews };
