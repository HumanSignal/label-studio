/**
 * Unit tests for Zoom tool (tools/Zoom.jsx)
 */
import { Zoom } from "../Zoom";

function makeMockObj() {
  const container = { style: { cursor: "" } };
  return {
    stageRef: { container: () => container },
    zoomScale: 2,
    zoomingPositionX: 0,
    zoomingPositionY: 0,
    setZoomPosition: jest.fn(),
    handleZoom: jest.fn(),
    sizeToFit: jest.fn(),
    sizeToAuto: jest.fn(),
    sizeToOriginal: jest.fn(),
    container,
  };
}

describe("Zoom tool", () => {
  it("shouldSkipInteractions returns true", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    expect(tool.shouldSkipInteractions()).toBe(true);
  });

  it("handleZoom delegates to obj.handleZoom", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.handleZoom(1);
    expect(mockObj.handleZoom).toHaveBeenCalledWith(1);
    tool.handleZoom(-1);
    expect(mockObj.handleZoom).toHaveBeenCalledWith(-1);
  });

  it("sizeToFit delegates to obj.sizeToFit", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.sizeToFit();
    expect(mockObj.sizeToFit).toHaveBeenCalled();
  });

  it("sizeToOriginal delegates to obj.sizeToOriginal", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.sizeToOriginal();
    expect(mockObj.sizeToOriginal).toHaveBeenCalled();
  });

  it("sizeToAuto delegates to obj.sizeToAuto", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.sizeToAuto();
    expect(mockObj.sizeToAuto).toHaveBeenCalled();
  });

  it("handleDrag calls obj.setZoomPosition with position plus movement", () => {
    const mockObj = makeMockObj();
    mockObj.zoomingPositionX = 10;
    mockObj.zoomingPositionY = 20;
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.handleDrag({ movementX: 5, movementY: -3 });
    expect(mockObj.setZoomPosition).toHaveBeenCalledWith(15, 17);
  });

  it("mouseupEv sets mode to viewing and cursor to grab", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.mode = "moving";
    tool.mouseupEv();
    expect(tool.mode).toBe("viewing");
    expect(mockObj.container.style.cursor).toBe("grab");
  });

  it("mousedownEv sets mode to moving on left click", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.mousedownEv({ button: 0 });
    expect(tool.mode).toBe("moving");
    expect(mockObj.container.style.cursor).toBe("grabbing");
  });

  it("mousedownEv does not set mode on right click", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.mousedownEv({ button: 2 });
    expect(tool.mode).not.toBe("moving");
  });

  it("mousemoveEv calls handleDrag and sets grabbing when zoomScale > 1 and mode is moving", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.setSelected(true);
    tool.mousedownEv({ button: 0 });
    tool.mousemoveEv({ movementX: 10, movementY: 5 });
    expect(mockObj.setZoomPosition).toHaveBeenCalledWith(10, 5);
    expect(mockObj.container.style.cursor).toBe("grabbing");
  });

  it("mousemoveEv does nothing when zoomScale <= 1", () => {
    const mockObj = makeMockObj();
    mockObj.zoomScale = 1;
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.mode = "moving";
    tool.mousemoveEv({ movementX: 10, movementY: 5 });
    expect(mockObj.setZoomPosition).not.toHaveBeenCalled();
  });

  it("updateCursor sets grab when selected and stageRef exists", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.setSelected(true);
    tool.updateCursor();
    expect(mockObj.container.style.cursor).toBe("grab");
  });

  it("updateCursor does nothing when not selected", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({ selected: false }, { object: mockObj, manager: {} });
    tool.updateCursor();
    expect(mockObj.container.style.cursor).toBe("");
  });

  it("afterUpdateSelected calls updateCursor", () => {
    const mockObj = makeMockObj();
    const tool = Zoom.create({}, { object: mockObj, manager: {} });
    tool.setSelected(true);
    tool.afterUpdateSelected();
    expect(mockObj.container.style.cursor).toBe("grab");
  });
});
