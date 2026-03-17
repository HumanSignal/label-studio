/**
 * Unit tests for LabelOnRegion (components/ImageView/LabelOnRegion.jsx)
 */
import React from "react";
import { render } from "@testing-library/react";
import { getRoot } from "mobx-state-tree";
import {
  LabelOnBbox,
  LabelOnEllipse,
  LabelOnRect,
  LabelOnPolygon,
  LabelOnMask,
  LabelOnKP,
  LabelOnVideoBbox,
  LabelOnOcrBox,
} from "../LabelOnRegion";

jest.mock("react-konva", () => {
  const mockReact = require("react");
  const mockShape = () => ({ width: () => 60, height: () => 20 });
  const mockContext = {
    beginPath: jest.fn(),
    rect: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    closePath: jest.fn(),
    fillStrokeShape: jest.fn(),
  };
  return {
    Group: ({ children, ...p }) => mockReact.createElement("div", { "data-testid": "konva-group", ...p }, children),
    Label: ({ children, ...p }) => mockReact.createElement("div", { "data-testid": "konva-label", ...p }, children),
    Path: (p) => mockReact.createElement("div", { "data-testid": "konva-path", ...p }),
    Rect: (p) => mockReact.createElement("div", { "data-testid": "konva-rect", ...p }),
    Tag: (p) => {
      if (p.sceneFunc) p.sceneFunc(mockContext, mockShape());
      return mockReact.createElement("div", { "data-testid": "konva-tag", ...p });
    },
    Text: (props) => {
      const { ref: refCallback, ...p } = props;
      if (refCallback) setTimeout(() => refCallback({ measureSize: () => ({ width: 50 }) }), 0);
      return mockReact.createElement("div", { "data-testid": "konva-text", ...p });
    },
  };
});

jest.mock("mobx-state-tree", () => ({
  ...jest.requireActual("mobx-state-tree"),
  getRoot: jest.fn(),
}));

describe("LabelOnRegion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRoot.mockReturnValue({ settings: { showLabels: true } });
  });

  describe("LabelOnBbox", () => {
    it("returns null when showLabels is false", () => {
      const { container } = render(<LabelOnBbox x={0} y={0} text="Label" showLabels={false} color="#fff" />);
      expect(container.firstChild).toBeNull();
    });

    it("renders group with label when showLabels is true", () => {
      const { getByTestId } = render(<LabelOnBbox x={10} y={20} text="Test" showLabels={true} color="#ff0000" />);
      expect(getByTestId("konva-group")).toBeInTheDocument();
      expect(getByTestId("konva-label")).toBeInTheDocument();
    });

    it("renders score label when score is provided", () => {
      const { getAllByTestId } = render(
        <LabelOnBbox x={0} y={0} text="L" showLabels={true} score={0.95} color="#fff" />,
      );
      expect(getAllByTestId("konva-label").length).toBeGreaterThan(1);
    });

    it("renders Path with TAG_PATH when isTexting is false", () => {
      const { getByTestId } = render(
        <LabelOnBbox x={0} y={0} text="L" showLabels={true} color="#fff" isTexting={false} />,
      );
      expect(getByTestId("konva-path")).toBeInTheDocument();
    });

    it("renders with adjacent and maxWidth", () => {
      const { getByTestId } = render(
        <LabelOnBbox x={0} y={0} text="Long label text" showLabels={true} color="#fff" adjacent maxWidth={100} />,
      );
      expect(getByTestId("konva-group")).toBeInTheDocument();
    });

    it("calls onClickLabel when label is clicked", () => {
      const onClickLabel = jest.fn();
      const { getByTestId } = render(
        <LabelOnBbox x={0} y={0} text="L" showLabels={true} color="#fff" onClickLabel={onClickLabel} />,
      );
      getByTestId("konva-label").click();
      expect(onClickLabel).toHaveBeenCalled();
    });

    it("uses OCR_PATH when isTexting is true", () => {
      const { getByTestId } = render(
        <LabelOnBbox x={0} y={0} text="L" showLabels={true} color="#fff" isTexting={true} />,
      );
      expect(getByTestId("konva-path")).toBeInTheDocument();
    });
  });

  describe("LabelOnEllipse", () => {
    it("returns null when item has no parent", () => {
      const item = { parent: null, getLabelText: () => "", zoomScale: 1 };
      const { container } = render(<LabelOnEllipse item={item} color="#fff" strokewidth={2} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders LabelOnBbox when item has parent", () => {
      const item = {
        parent: {
          internalToCanvasX: (v) => v,
          internalToCanvasY: (v) => v,
          zoomScale: 1,
        },
        x: 50,
        y: 50,
        radiusX: 10,
        radiusY: 20,
        getLabelText: () => "Ellipse",
        score: null,
        texting: false,
        onClickLabel: null,
      };
      getRoot.mockReturnValue({ settings: { showLabels: true } });
      const { getByTestId } = render(<LabelOnEllipse item={item} color="#fff" strokewidth={2} />);
      expect(getByTestId("konva-group")).toBeInTheDocument();
    });
  });

  describe("LabelOnRect", () => {
    it("returns null when item has no parent", () => {
      const item = { parent: null };
      const { container } = render(<LabelOnRect item={item} color="#fff" strokewidth={2} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders when item has parent", () => {
      const item = {
        parent: {
          internalToCanvasX: (v) => v,
          internalToCanvasY: (v) => v,
          zoomScale: 1,
        },
        x: 0,
        y: 0,
        width: 100,
        rotation: 0,
        getLabelText: () => "Rect",
        score: null,
        texting: false,
        onClickLabel: null,
      };
      getRoot.mockReturnValue({ settings: { showLabels: true } });
      const { getByTestId } = render(<LabelOnRect item={item} color="#fff" strokewidth={2} />);
      expect(getByTestId("konva-group")).toBeInTheDocument();
    });
  });

  describe("LabelOnPolygon", () => {
    it("returns null when item has no parent", () => {
      const item = { parent: null };
      const { container } = render(<LabelOnPolygon item={item} color="#fff" />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when bboxCoordsCanvas is null", () => {
      const item = {
        parent: { zoomScale: 1 },
        bboxCoordsCanvas: null,
        getLabelText: () => "",
        score: null,
        texting: false,
        style: {},
        onClickLabel: null,
      };
      getRoot.mockReturnValue({ settings: { showLabels: true } });
      const { container } = render(<LabelOnPolygon item={item} color="#fff" />);
      expect(container.firstChild).toBeNull();
    });

    it("renders when bboxCoordsCanvas is set", () => {
      const item = {
        parent: { zoomScale: 1 },
        bboxCoordsCanvas: { left: 0, top: 0, right: 50, bottom: 20 },
        getLabelText: () => "Poly",
        score: null,
        texting: false,
        style: {},
        onClickLabel: null,
      };
      getRoot.mockReturnValue({ settings: { showLabels: true } });
      const { getByTestId } = render(<LabelOnPolygon item={item} color="#fff" />);
      expect(getByTestId("konva-group")).toBeInTheDocument();
    });
  });

  describe("LabelOnMask", () => {
    it("returns null when showLabels is false", () => {
      const item = { parent: {}, getLabelText: () => "", score: null, texting: false, style: {}, onClickLabel: null };
      getRoot.mockReturnValue({ settings: { showLabels: false } });
      const { container } = render(<LabelOnMask item={item} color="#fff" />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when bboxCoordsCanvas is null", () => {
      const item = {
        parent: { zoomScale: 1 },
        bboxCoordsCanvas: null,
        getLabelText: () => "",
        score: null,
        texting: false,
        style: {},
        onClickLabel: null,
      };
      getRoot.mockReturnValue({ settings: { showLabels: true } });
      const { container } = render(<LabelOnMask item={item} color="#fff" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("LabelOnKP", () => {
    it("returns null when item has no parent", () => {
      const item = { parent: null };
      const { container } = render(<LabelOnKP item={item} color="#fff" />);
      expect(container.firstChild).toBeNull();
    });

    it("renders when item has parent", () => {
      const item = {
        parent: { zoomScale: 1 },
        canvasX: 0,
        canvasY: 0,
        canvasWidth: 10,
        getLabelText: () => "KP",
        score: null,
        texting: false,
        onClickLabel: null,
      };
      getRoot.mockReturnValue({ settings: { showLabels: true } });
      const { getByTestId } = render(<LabelOnKP item={item} color="#fff" />);
      expect(getByTestId("konva-group")).toBeInTheDocument();
    });
  });

  describe("LabelOnVideoBbox", () => {
    it("renders with reg and box", () => {
      const reg = {
        getLabelText: () => "Video",
        score: null,
        texting: false,
        store: { settings: { showLabels: true } },
        onClickRegion: null,
      };
      const box = { x: 0, y: 0, width: 80, height: 20, rotation: 0 };
      const { getByTestId } = render(<LabelOnVideoBbox reg={reg} box={box} color="#fff" scale={1} strokeWidth={2} />);
      expect(getByTestId("konva-group")).toBeInTheDocument();
    });
  });

  describe("LabelOnOcrBox", () => {
    it("returns null when region has no store", () => {
      const { container } = render(
        <LabelOnOcrBox region={{ store: null }} color="#fff" viewRect={{ x: 0, y: 0, width: 100, height: 20 }} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders when region has store and viewRect", () => {
      const region = {
        store: { settings: { showLabels: true } },
        getLabelText: () => "OCR",
        score: null,
        texting: false,
        ocrtext: null,
        rotation: 0,
        onClickRegion: null,
      };
      const { getByTestId } = render(
        <LabelOnOcrBox region={region} color="#fff" viewRect={{ x: 0, y: 0, width: 100, height: 20 }} zoomScale={1} />,
      );
      expect(getByTestId("konva-group")).toBeInTheDocument();
    });
  });
});
