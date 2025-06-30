import { nanoid } from "nanoid";
import { stringToRgba, rgbaToString, type RgbaColor } from "../Common/Color";
import { Events } from "../Common/Events";
import { getCursorPositionX, clamp } from "../Common/Utils";
import type { GPSData } from "../types";
import type { GPSMetricsWaveform } from "../GPSMetricsWaveform";
import type { Regions } from "./Regions";
import type { Layer } from "../Composition/Layer";
import type { Renderer, RenderContext } from "./Renderer";

export interface SegmentOptions {
  id?: string;
  start: number;
  end: number;
  color?: string;
  selected?: boolean;
  locked?: boolean;
  updateable?: boolean;
  deleteable?: boolean;
  visible?: boolean;
  external?: boolean;
  showInTimeline?: boolean;
  click?: (region: Segment, event: MouseEvent) => void;
}

export interface SegmentGlobalEvents {
  regionCreated: (region: Segment) => void;
  regionUpdated: (region: Segment) => void;
  regionSelected: (region: Segment, event: MouseEvent) => void;
  regionUpdatedEnd: (region: Segment) => void;
  regionRemoved: (region: Segment) => void;
}

interface SegmentEvents {
  update: (region: Segment) => void;
  updateEnd: (region: Segment) => void;
  mouseEnter: (region: Segment, event: MouseEvent) => void;
  mouseOver: (region: Segment, event: MouseEvent) => void;
  mouseLeave: (region: Segment, event: MouseEvent) => void;
  mouseDown: (region: Segment, event: MouseEvent) => void;
  mouseUp: (region: Segment, event: MouseEvent) => void;
  click: (region: Segment, event: MouseEvent) => void;
}

export class Segment extends Events<SegmentEvents> implements Renderer {
  id: string;
  start = 0;
  end = 0;
  color: RgbaColor = { r: 175, g: 175, b: 175, a: 1 };
  selected = false;
  highlighted = false;
  active = false;
  updateable = true;
  locked = false;
  deleteable = true;
  visible = true;
  external = false;
  showInTimeline = true;
  config: SegmentOptions;

  protected waveform: GPSMetricsWaveform;
  protected controller: Regions;
  protected handleWidth: number;
  public draggingHandle: "start" | "end" | null = null;

  // Properties for mouse interaction state, similar to AudioUltra
  protected isDragging: boolean;
  protected draggingStartPosition: null | { grabPosition: number; start: number; end: number };
  protected isGrabbingEdge: { isRightEdge: boolean; isLeftEdge: boolean };
  protected layer: Layer | undefined; // Added for structural parity with AudioUltra Segment layer property

  constructor(options: SegmentOptions, waveform: GPSMetricsWaveform, controller: Regions) {
    super();

    if (options.start < 0) throw new Error("Segment start must be greater than 0");
    if (options.end < options.start) options.end = options.start;

    this.id = options.id ?? nanoid(5);
    this.start = options.start;
    this.end = options.end;
    this.selected = !!options.selected;
    this.updateable = options.updateable ?? this.updateable;
    this.locked = options.locked ?? this.locked;
    this.visible = options.visible ?? this.visible;
    this.waveform = waveform;
    this.controller = controller;
    this.handleWidth = 4;
    this.external = options.external ?? this.external;
    this.showInTimeline = options.showInTimeline ?? this.showInTimeline;
    if (options.color) {
      this.color = stringToRgba(options.color);
    }
    this.config = options;

    // Initialize interaction state properties
    this.isDragging = false;
    this.draggingStartPosition = null;
    this.isGrabbingEdge = { isRightEdge: false, isLeftEdge: false };

    this.initialize();
  }

  get isRegion() {
    return false;
  }

  updateConfig(options: Partial<SegmentOptions>) {
    this.config = { ...this.config, ...options };
    this.update(options);
  }

  update(options: Partial<SegmentOptions>) {
    if (!this.updateable && options.updateable !== undefined && !options.updateable) return;

    if (options.updateable !== undefined) this.updateable = options.updateable;
    if (options.deleteable !== undefined) this.deleteable = options.deleteable;
    if (options.locked !== undefined) this.locked = options.locked;
    if (options.start !== undefined) this.start = Math.max(0, options.start);
    if (options.end !== undefined) this.end = Math.max(this.start, options.end);
    if (options.selected !== undefined) this.selected = options.selected;
    if (options.visible !== undefined) this.visible = options.visible;
    if (options.color !== undefined) this.color = stringToRgba(options.color);
    if (options.external !== undefined) this.external = options.external;
    if (options.showInTimeline !== undefined) this.showInTimeline = options.showInTimeline;

    this.invoke("update", [this]);
  }

  setVisibility(visible: boolean) {
    if (visible === this.visible) return;
    this.visible = visible;
    this.invoke("update", [this]);
    this.waveform.invoke("regionUpdated", [this]);
  }

  bringToFront() {
    this.controller.bringRegionToFront(this.id);
  }

  protected get layerName() {
    return `segment-${this.id}`;
  }

  get xStart(): number {
    if (this.waveform.zoom === 0) return 0;
    return (this.start - this.waveform.visibleTimeStart) * this.waveform.zoom;
  }

  get xEnd(): number {
    return this.xStart + this.width;
  }

  get yStart(): number {
    return 0;
  }

  get yEnd(): number {
    if (!this.controller.regionsLayer) return 0;
    return this.controller.regionsLayer.height;
  }

  get width(): number {
    if (this.waveform.zoom === 0) return 0;
    return (this.end - this.start) * this.waveform.zoom;
  }

  get hovered() {
    return this.controller.isHovered(this);
  }

  // Added for structural equivalence with AudioUltra - not used in GPS rendering logic
  get timelineHeight(): number {
    return 0; // No dedicated timeline area affecting region Y in GPS like in AudioUltra
  }

  // Added for structural equivalence with AudioUltra - not used in GPS rendering logic
  get timelinePlacement(): string {
    // Assuming 'bottom' or 'top' as in AudioUltra defaults
    return "bottom"; // Or undefined, as it has no effect here
  }

  get options(): SegmentOptions {
    return {
      start: this.start,
      end: this.end,
      id: this.id,
      color: this.color ? rgbaToString(this.color) : undefined,
      selected: this.selected,
      updateable: this.updateable,
      locked: this.locked,
      deleteable: this.deleteable,
      visible: this.visible,
    };
  }

  private get inViewport(): boolean {
    const startX = this.xStart;
    const endX = this.xEnd;
    const viewportWidth = this.waveform.width;
    return endX > 0 && startX < viewportWidth;
  }

  private get duration(): number {
    if (!this.waveform.data || this.waveform.data.length < 2) return 0;
    return this.waveform.data[this.waveform.data.length - 1].timestamp - this.waveform.data[0].timestamp;
  }

  private get zoom(): number {
    return this.waveform.zoom;
  }

  isMouseOver(e: MouseEvent, container: HTMLElement, zoom: number, visibleTimeStart: number): boolean {
    if (!this.visible) return false;
    const mouseX = getCursorPositionX(e, container);
    return mouseX >= this.xStart && mouseX <= this.xEnd;
  }

  isMouseOverHandle(e: MouseEvent, container: HTMLElement): boolean {
    return this.isMouseOverStartHandle(e, container) || this.isMouseOverEndHandle(e, container);
  }

  isMouseOverStartHandle(e: MouseEvent, container: HTMLElement): boolean {
    if (!this.visible || !this.updateable || this.locked) return false;
    const mouseX = getCursorPositionX(e, container);
    // Use a larger hit area (12px) than the visual handle for easier interaction
    return Math.abs(mouseX - this.xStart) < 12;
  }

  isMouseOverEndHandle(e: MouseEvent, container: HTMLElement): boolean {
    if (!this.visible || !this.updateable || this.locked) return false;
    const mouseX = getCursorPositionX(e, container);
    // Use a larger hit area (12px) than the visual handle for easier interaction
    return Math.abs(mouseX - this.xEnd) < 12;
  }

  setDragHandle(handle: "start" | "end" | null) {
    this.draggingHandle = handle;
  }

  private initialize() {
    // AudioUltra: this.layer = this.visualizer.createLayer({ groupName: "regions", name: this.layerName });
    // GPS Segments render on a shared Regions layer (this.controller.regionsLayer),
    // no individual layer is created per segment here. this.layer is for structural parity.
    this.layer = undefined;

    this.on("mouseOver", this.mouseOver);
    this.on("mouseDown", this.mouseDown);
  }

  private mouseDown = (_segment: Segment, event: MouseEvent) => {
    // from isOverrideKeyPressed in Regions.ts
    const isOverrideKeyPressed = event.shiftKey;
    // from isLocked in Regions.ts
    const isControllerLocked = this.controller.isLocked;

    if (isControllerLocked || isOverrideKeyPressed) return;

    const initialCursorPixelX = getCursorPositionX(event, this.waveform.container);
    const initialCursorTime = this.waveform.visibleTimeStart + initialCursorPixelX / this.zoom;

    this.bringToFront();

    this.draggingStartPosition = {
      grabPosition: initialCursorTime,
      start: this.start,
      end: this.end,
    };

    document.addEventListener("mouseup", this.handleMouseUp);

    if (!this.updateable) return;

    this.isGrabbingEdge = this.edgeGrabCheck(event);
    document.addEventListener("mousemove", this.handleDrag);
  };

  private handleDrag = (event: MouseEvent): void => {
    if (!this.updateable || this.locked) return; // Segment lock check

    if (this.draggingStartPosition) {
      event.preventDefault();
      event.stopPropagation();
      this.isDragging = true; // Set dragging flag

      const { grabPosition: initialTime, start: initialStart, end: initialEnd } = this.draggingStartPosition;
      const { isRightEdge: freezeStart, isLeftEdge: freezeEnd } = this.isGrabbingEdge;

      const currentCursorPixelX = getCursorPositionX(event, this.waveform.container);
      const currentTime = this.waveform.visibleTimeStart + currentCursorPixelX / this.zoom;
      const deltaTime = currentTime - initialTime;
      const segmentDuration = initialEnd - initialStart;

      let newStart: number;
      let newEnd: number;

      if (freezeStart) {
        // Resizing right edge (start is frozen)
        newStart = initialStart;
        newEnd = initialEnd + deltaTime;
      } else if (freezeEnd) {
        // Resizing left edge (end is frozen)
        newStart = initialStart + deltaTime;
        newEnd = initialEnd;
      } else {
        // Dragging the whole segment
        newStart = initialStart + deltaTime;
        newEnd = newStart + segmentDuration; // Maintain duration
      }

      // Clamp to waveform duration and ensure min segment duration (e.g. 0)
      const totalDuration = this.duration;
      newStart = clamp(newStart, 0, totalDuration - (freezeStart ? segmentDuration : 0));
      newEnd = clamp(newEnd, freezeEnd ? 0 : newStart, totalDuration);
      if (newEnd < newStart) {
        // Ensure end is not before start during resize
        if (freezeStart)
          newEnd = newStart; // If dragging right edge past start, snap to start
        else if (freezeEnd) newStart = newEnd; // If dragging left edge past end, snap to end
      }

      // Update cursor style
      if (freezeStart || freezeEnd) {
        this.switchCursor("ew-resize");
      } else {
        this.switchCursor("grabbing");
      }

      this.updatePosition(newStart, newEnd);
      // No explicit redraw here, updatePosition calls invoke("update") which Regions might listen to for redraw.
      // AudioUltra does not explicitly redraw here either in its segment drag.
    }
  };

  private handleMouseUp = (event: MouseEvent): void => {
    const wasDragging = this.isDragging;

    if (this.isDragging) {
      this.switchCursor(this.updateable ? "grab" : "default");
      this.handleUpdateEnd();
    }

    // Only change selection state if this was a click, not a drag/resize
    if (!wasDragging) {
      this.handleSelected(true);
      this.waveform.invoke("regionSelected", [this, event]);
    }

    this.isDragging = false;
    this.draggingStartPosition = null;
    this.isGrabbingEdge = { isRightEdge: false, isLeftEdge: false };

    document.removeEventListener("mousemove", this.handleDrag);
    document.removeEventListener("mouseup", this.handleMouseUp);
  };

  draw(context: RenderContext, data: GPSData) {
    if (!this.visible || !this.inViewport || !this.controller.regionsLayer) return;

    const layer = this.controller.regionsLayer.context;
    const x = this.xStart;
    const y = 0;
    const w = this.width;
    const h = this.controller.regionsLayer.height;

    if (w <= 0) return;

    layer.save();

    const c = this.color;
    const baseAlpha = this.external ? 0.3 : 0.2;
    layer.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${this.selected || this.highlighted ? baseAlpha + 0.1 : baseAlpha})`;
    layer.fillRect(x, y, w, h);

    if (this.selected || this.highlighted) {
      layer.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
      layer.lineWidth = 1;
      layer.strokeRect(x, y, w, h);
    }

    if (this.selected && this.updateable && !this.locked) {
      layer.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
      layer.fillRect(x, y, this.handleWidth, h);
      layer.fillRect(this.xEnd - this.handleWidth, y, this.handleWidth, h);
    }

    layer.restore();
  }

  handleUpdateEnd() {
    this.invoke("updateEnd", [this]);
    this.controller.waveform.invoke("regionUpdatedEnd" as any, [this.toJSON()]);
  }

  handleSelected = (selected?: boolean) => {
    const newSelectedState = selected === undefined ? !this.selected : selected;
    if (this.selected === newSelectedState) return;

    this.selected = newSelectedState;
    this.highlighted = newSelectedState;
    this.invoke("update", [this]);
    this.controller.redraw();
  };

  handleHighlighted = (highlighted?: boolean) => {
    const newHighlightedState = highlighted === undefined ? !this.highlighted : highlighted;
    if (this.highlighted === newHighlightedState) return;

    this.highlighted = newHighlightedState;
    this.invoke("update", [this]);
    this.controller.redraw();
  };

  setColor(color: string) {
    this.update({ color });
  }

  setLocked(locked: boolean) {
    this.update({ locked });
  }

  updateColor(color: string) {
    this.update({ color });
  }

  updatePosition(start?: number, end?: number) {
    const newPos: Partial<SegmentOptions> = {};
    if (start !== undefined) newPos.start = start;
    if (end !== undefined) newPos.end = end;
    if (Object.keys(newPos).length > 0) {
      this.update(newPos);
    }
  }

  remove() {
    if (!this.deleteable || this.locked) return; // Check deleteable and locked status
    // This segment is requesting removal, so invoke the event.
    // The Regions class will listen for this and then call its own removeRegion, which will call destroy(false).
    this.waveform.invoke("regionRemoved", [this]);
  }

  destroy(notify = true) {
    // `notify` is effectively unused now in typical flow, but kept for signature consistency
    // Remove all event listeners specific to this segment instance
    this.off("mouseOver", this.mouseOver);
    this.off("mouseDown", this.mouseDown);
    // Add any other specific event listeners to .off() here if they were added in initialize or elsewhere

    // Call parent destroy (which handles its own .offAll() for generic event system)
    super.destroy();

    // DO NOT invoke "regionRemoved" here.
    // The event is now triggered by Segment.remove() or by Regions.clearSegments() directly.
    // Regions.removeRegion() will call destroy(false).
  }

  toJSON() {
    return {
      start: this.start,
      end: this.end,
    };
  }

  private edgeGrabCheck = (e: MouseEvent): { isRightEdge: boolean; isLeftEdge: boolean } => {
    const { handleWidth, end, start } = this;
    const duration = this.duration;
    const waveformZoom = this.zoom;

    if (duration === 0 || waveformZoom === 0) return { isRightEdge: false, isLeftEdge: false };

    const cursorPixelX = getCursorPositionX(e, this.waveform.container);
    const cursorTime = this.waveform.visibleTimeStart + cursorPixelX / waveformZoom;

    const handleTimeEquivalent = this.handleWidth / waveformZoom;

    const isRightEdge = cursorTime > end - handleTimeEquivalent;
    const isLeftEdge = cursorTime < start + handleTimeEquivalent;

    return { isRightEdge, isLeftEdge };
  };

  // Added for structural equivalence - not actively used by GPS switchCursor
  private requiresCursorFocus(_cursorStyle: string): boolean {
    // GPS cursor setting is simpler and doesn't involve layer focus like AudioUltra's CursorSymbols
    return false;
  }

  private switchCursor = (cursorStyle: string) => {
    this.waveform.container.style.cursor = cursorStyle;
  };

  private mouseOver = (_segment: Segment, event: MouseEvent) => {
    const isEdgeGrab = this.edgeGrabCheck(event);

    if (this.isDragging) return;

    if (this.updateable && (isEdgeGrab.isRightEdge || isEdgeGrab.isLeftEdge)) {
      this.switchCursor("ew-resize");
    } else {
      this.switchCursor(this.updateable ? "grab" : "default");
    }
  };

  // Added for structural equivalence with AudioUltra
  scrollToRegion() {
    this.waveform.setTime(this.start); // GPS equivalent to scroll into view
  }

  // Added for structural equivalence with AudioUltra
  convertToRegion(labels: string[], render = false) {
    if (!this.updateable) return; // Match AudioUltra's guard
    return this.controller.convertToRegion(this.id, labels, render);
  }

  // Added for structural equivalence with AudioUltra
  convertToSegment(render = false) {
    if (!this.updateable) return; // Match AudioUltra's guard
    return this.controller.convertToSegment(this.id, render);
  }

  toggleSelected(selectedState?: boolean) {
    if (this.locked) return;
    if (selectedState === undefined) {
      this.selected = !this.selected;
    } else {
      this.selected = selectedState;
    }
    this.invoke("update", [this]); // Notify that the segment has been updated
    // The Regions controller (or handleClick) is typically responsible for invoking global "regionSelected" and redrawing.
  }
}
