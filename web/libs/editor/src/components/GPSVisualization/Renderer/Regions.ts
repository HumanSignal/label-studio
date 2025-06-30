import { stringToRgba, rgbaToString, type RgbaColorArray } from "../Common/Color";
import type { Layer } from "../Composition/Layer";
import type { GPSData } from "../types";
import type { GPSMetricsWaveform } from "../GPSMetricsWaveform";
import { Region, type RegionOptions } from "./Region";
import { Segment } from "./Segment";
import type { Renderer, RenderContext } from "./Renderer";
import type { Interactive } from "../Interaction/Interactive";
import type { InteractionManager } from "../Interaction/InteractionManager";

export interface RegionsGlobalEvents {
  beforeRegionsDraw: (regions: Regions) => void;
  afterRegionsDraw: (regions: Regions) => void;
}

export interface RegionsOptions {
  regions?: RegionOptions[];
  updateable?: boolean;
  createable?: boolean;
  deleteable?: boolean;
  defaultColor?: string | RgbaColorArray;
  showLabels?: boolean;
}

export class Regions implements Renderer, Interactive {
  config: RegionsOptions;
  private regions: (Region | Segment)[] = [];
  public waveform: GPSMetricsWaveform;
  private interactionManager: InteractionManager;
  private locked = false;
  private hoveredRegions = new Set<Region | Segment>();
  private defaultColor = stringToRgba("#787878");
  private drawingColor = stringToRgba("#787878");
  private labels: string[] | undefined;
  private createable = true;
  private updateable = true;
  private deleteable = true;
  private drawableTarget: typeof Region | typeof Segment = Segment;
  showLabels = false;
  regionsLayer: Layer | undefined;
  private drawingManuallyDisabled = false;

  private isDrawing = false;
  private newRegion: Region | Segment | null = null;
  private activeRegion: Region | Segment | null = null;
  private pointerDownX: number | null = null; // Track pointer down position for click vs drag detection

  zIndex = 5;

  constructor(options: RegionsOptions, waveform: GPSMetricsWaveform, interactionManager: InteractionManager) {
    this.config = options;
    this.waveform = waveform;
    this.interactionManager = interactionManager;
    this.defaultColor = options?.defaultColor ? stringToRgba(options.defaultColor) : this.defaultColor;
    this.drawingColor = { ...this.defaultColor };
    this.labels = undefined;
    this.createable = options?.createable ?? this.createable;
    this.updateable = options?.updateable ?? this.updateable;
    this.deleteable = options?.deleteable ?? this.deleteable;
    this.regionsLayer = this.waveform.layers.regions;
    this.showLabels = options?.showLabels ?? false;
    this.init();
  }

  init() {
    this.waveform.on("regionRemoved", this.handleRegionRemoved);
    this.waveform.on("regionUpdated", this.handleRegionUpdated);
  }

  // --- Interactive interface methods ---
  hitTest(canvasX: number, canvasY: number): boolean {
    return true; // Always ready to interact
  }

  onPointerDown(e: PointerEvent): boolean {
    if (this.interactionManager.hasActive() || this.locked || e.shiftKey || e.button !== 0) return false;

    const region = this.findRegionUnderCursor(e);
    if (region) {
      this.activeRegion = region;
      this.activeRegion.invoke("mouseDown", [this.activeRegion, e]);
      // Capture the pointer to ensure we get all subsequent events
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
      return true; // Captured interaction for dragging/resizing existing region
    }

    if (this.drawingManuallyDisabled || !this.createable) return false;

    // Store pointer position to detect click vs drag later
    this.pointerDownX = this.waveform.getCanvasRelativeCoords(e).x;

    // Capture the pointer to ensure we get all subsequent events
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    return true; // Capture interaction to detect drag vs click
  }

  onPointerMove(e: PointerEvent): boolean {
    console.log("GPS Regions onPointerMove", {
      pointerId: e.pointerId,
      activeRegion: !!this.activeRegion,
      isDrawing: this.isDrawing,
      pointerDownX: this.pointerDownX,
    });

    // If dragging an existing region, delegate
    if (this.activeRegion) {
      this.activeRegion.invoke("mouseOver", [this.activeRegion, e]);
      return true;
    }

    // If we have a pointer down position but haven't started drawing yet, check if this is a drag
    if (this.pointerDownX !== null && !this.isDrawing) {
      console.log("Current X", this.waveform.getCanvasRelativeCoords(e).x);
      const currentX = this.waveform.getCanvasRelativeCoords(e).x;
      const distance = Math.abs(currentX - this.pointerDownX);

      console.log("GPS Regions: Drag distance", distance, "threshold: 5px");

      // Start drawing only if user drags beyond threshold (5 pixels)
      if (distance > 5) {
        console.log("GPS Regions: Starting to draw new region");
        this.isDrawing = true;
        const startTime = this.pixelsToTime(this.pointerDownX);
        this.newRegion = this.addRegion(
          {
            start: startTime,
            end: startTime,
            color: rgbaToString(this.drawingColor),
          },
          false,
        );
        console.log("GPS Regions: Created new region", this.newRegion);
      }

      // CRITICAL: Return true to continue receiving move events
      return true;
    }

    // If drawing a new region, update its end point
    if (this.isDrawing && this.newRegion) {
      const currentX = this.waveform.getCanvasRelativeCoords(e).x;
      const currentTime = this.pixelsToTime(currentX);
      this.newRegion.update({ end: currentTime });
      this.redraw();
      return true; // Continue the drawing drag
    }

    // Otherwise, just handle hover effects
    this.handleHover(e);
    return false; // Did not consume the move event
  }

  onPointerUp(e: PointerEvent): boolean {
    let consumed = false;
    const hadActiveRegion = this.activeRegion !== null;

    if (this.activeRegion) {
      this.activeRegion.invoke("mouseUp", [this.activeRegion, e]);
      this.activeRegion = null;
      consumed = true;
    }

    if (this.isDrawing && this.newRegion) {
      if (this.newRegion.start === this.newRegion.end) {
        this.newRegion.remove();
      } else {
        this.waveform.invoke("regionCreated", [this.newRegion]);
        this.newRegion.invoke("updateEnd", [this.newRegion]);
      }
      this.isDrawing = false;
      this.newRegion = null;
      consumed = true;
    }

    // Check if this was a click without drag (for empty space)
    if (this.pointerDownX !== null && !this.isDrawing && !hadActiveRegion) {
      const currentX = this.waveform.getCanvasRelativeCoords(e).x;
      const distance = Math.abs(currentX - this.pointerDownX);

      if (distance <= 0.5) {
        // This was a click, not a drag - check if it's on a region
        const region = this.findRegionUnderCursor(e);
        if (region) {
          region.invoke("click", [region, e]);
          consumed = true;
          this.redraw();
        } else {
          // Click on empty space - deselect regions and seek to clicked time
          const hadSelectedRegions = this.regions.some((r) => r.selected);
          if (hadSelectedRegions) {
            this.regions.forEach((r) => r.toggleSelected(false));
            this.waveform.invoke("regionSelected", [null, e]);
            this.redraw();
          }

          // Seek to the clicked time position
          const clickTime = this.pixelsToTime(this.pointerDownX);
          this.waveform.seek(clickTime);
          consumed = true; // We handled the seek
        }
      }
    }

    // Reset pointer tracking
    this.pointerDownX = null;

    // Only consume the event if we actually handled something
    // This allows clicks on empty space to fall through to lower layers (e.g., Grid for seeking)
    return consumed;
  }

  getHoverCursor(e: PointerEvent, pressedKeys: Set<string>): string | null {
    // Give priority to PanAndZoom when Shift is pressed
    if (pressedKeys.has("Shift")) {
      return null;
    }

    if (this.isDrawing) return "crosshair";

    const region = this.findRegionUnderCursor(e);
    if (region) {
      if (region.isMouseOverStartHandle(e, this.waveform.container)) return "ew-resize";
      if (region.isMouseOverEndHandle(e, this.waveform.container)) return "ew-resize";
      return "move";
    }

    return this.createable ? "crosshair" : "auto";
  }

  renderInteractionOverlay(context: RenderContext, data: GPSData): void {}

  onKeyDown(e: KeyboardEvent): boolean {
    if (e.key === "Delete" || e.key === "Backspace") {
      const selected = this.selected;
      if (selected.length > 0) {
        selected.forEach((region) => {
          if (region.deleteable && !region.locked) {
            this.removeRegion(region.id);
          }
        });
        return true; // Consumed
      }
    }
    return false;
  }

  // --- End Interactive Methods ---

  draw(context: RenderContext, data: GPSData) {
    if (!this.regionsLayer) return;
    this.regionsLayer.clear();
    const currentTime = data.currentTime;

    this.regions.forEach((region) => {
      region.active = region.start <= currentTime && region.end >= currentTime;
      region.draw(context, data);
    });
  }

  regionDrawableTarget() {
    this.drawableTarget = Region;
  }

  segmentDrawableTarget() {
    this.drawableTarget = Segment;
  }

  resetDrawableTarget() {
    this.segmentDrawableTarget();
  }

  clearSegments(selectedOnly = false) {
    this.regions = this.regions.filter((region) => {
      if (
        !region.isRegion &&
        (!selectedOnly || region.selected) &&
        !region.external &&
        region.deleteable &&
        !region.locked
      ) {
        this.waveform.invoke("regionRemoved", [region]);
        region.destroy(false);
        this.hoveredRegions.delete(region);
        return false;
      }
      return true;
    });
    this.redraw();
  }

  addRegions(regionsData: RegionOptions[], render = true) {
    regionsData.forEach((regionOpt) => this.addRegion(regionOpt, false));
    if (render) {
      this.redraw();
    }
  }

  addRegion(options: RegionOptions, render = true): Region | Segment {
    let region: Region | Segment;

    if (options.labels?.length || this.drawableTarget === Region) {
      region = new Region(options, this.waveform, this);
    } else {
      region = new Segment(options, this.waveform, this);
    }

    region.on("update", this.handleRegionUpdated);

    this.regions.push(region);

    if (render) {
      this.redraw();
    }
    return region;
  }

  findRegion(id: string): Region | Segment | undefined {
    return this.regions.find((region) => region.id === id);
  }

  convertToRegion(id: string, labels: string[], render = true): Region | undefined {
    const existingSegment = this.findRegion(id);
    if (!existingSegment) return undefined;

    const regionIndex = this.regions.findIndex((r) => r.id === id);

    if (regionIndex === -1) {
      console.warn(`[Regions.convertToRegion] Mismatch: Segment with id ${id} found, but index not found.`);
      return undefined;
    }

    const newRegion = new Region({ ...existingSegment.options, labels }, this.waveform, this);
    newRegion.on("update", this.handleRegionUpdated);

    this.regions[regionIndex] = newRegion;

    if (render) this.redraw();
    return newRegion;
  }

  convertToSegment(id: string, render = true): Segment | undefined {
    const existingItem = this.findRegion(id);
    if (!existingItem) return undefined;

    const regionIndex = this.regions.findIndex((r) => r.id === id);

    if (regionIndex === -1) {
      console.warn(`[Regions.convertToSegment] Mismatch: Item with id ${id} found, but index not found.`);
      return undefined;
    }

    const newSegment = new Segment(existingItem.options, this.waveform, this);
    newSegment.on("update", this.handleRegionUpdated);

    this.regions[regionIndex] = newSegment;

    if (render) this.redraw();
    return newSegment;
  }

  updateRegion(options: RegionOptions, render = true): Region | Segment | undefined {
    if (!this.updateable || !options.id) return undefined;
    const region = this.findRegion(options.id);
    if (!region) return undefined;

    region.update(options);

    if (render) this.redraw();
    return region;
  }

  redraw() {
    this.waveform.draw();
  }

  removeRegion(regionId: string, render = true) {
    const region = this.findRegion(regionId);
    if (!region) return;

    if (this.deleteable && region.deleteable && !region.locked) {
      region.destroy(false);

      this.regions = this.regions.filter((r) => r.id !== regionId);
      this.hoveredRegions.delete(region);
    }

    if (render) {
      this.redraw();
    }
  }

  bringRegionToFront(regionId: string) {
    const originalIndex = this.regions.findIndex((r) => r.id === regionId);
    if (originalIndex === -1) return;

    this.regions.push(...this.regions.splice(originalIndex, 1));
  }

  destroy() {
    this.waveform.off("regionRemoved", this.handleRegionRemoved);
    this.waveform.off("regionUpdated", this.handleRegionUpdated);

    this.regions.forEach((region) => region.destroy());
    this.regions = [];
  }

  setDrawingColor(color: string | RgbaColorArray) {
    this.drawingColor = stringToRgba(color);
  }

  updateLabelVisibility(visible: boolean) {
    this.showLabels = visible;
    this.redraw();
  }

  setLabels(labels?: string[]) {
    if (labels) {
      this.labels = labels;
    }
  }

  resetDrawingColor() {
    this.drawingColor = { ...this.defaultColor };
  }

  resetLabels() {
    this.labels = undefined;
  }

  get list() {
    return Array.from(this.regions);
  }

  get selected() {
    return this.regions.filter((region) => region.selected);
  }

  get timelineRegions() {
    return this.regions.filter((region) => region.showInTimeline);
  }

  get visible() {
    return this.regions.filter((region) => region.visible);
  }

  isOverrideKeyPressed(e: MouseEvent) {
    return e.shiftKey;
  }

  private handleRegionUpdated = (region: Region | Segment) => {
    this.redraw();
  };

  private handleRegionRemoved = (reg: Region | Segment) => {
    this.removeRegion(reg.id);
  };

  private handleHover(e: MouseEvent) {
    const region = this.findRegionUnderCursor(e);
    const hoveredChanged = new Set<Region | Segment>();

    // Find newly hovered regions
    if (region && !this.hoveredRegions.has(region)) {
      this.hoveredRegions.add(region);
      hoveredChanged.add(region);
      region.invoke("mouseEnter", [region, e]);
    }

    // Find regions that are no longer hovered
    this.hoveredRegions.forEach((r) => {
      if (r !== region) {
        hoveredChanged.add(r);
        r.invoke("mouseLeave", [r, e]);
        this.hoveredRegions.delete(r);
      }
    });

    if (hoveredChanged.size > 0) this.redraw();
  }

  private findRegionUnderCursor(e: MouseEvent): Region | Segment | undefined {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const region = this.regions[i];
      if (
        !region.locked &&
        region.isMouseOver(e, this.waveform.container, this.waveform.zoom, this.waveform.getVisibleTimeRange().start)
      ) {
        return region;
      }
    }
    return undefined;
  }

  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }

  get isLocked() {
    return this.locked;
  }

  isHovered(region: Region | Segment): boolean {
    return this.hoveredRegions.has(region);
  }

  updateConfig(options: RegionsOptions) {
    this.config = options;
    this.createable = options.createable ?? this.createable;
    this.updateable = options.updateable ?? this.updateable;
    this.deleteable = options.deleteable ?? this.deleteable;
    this.showLabels = options.showLabels ?? this.showLabels;
    this.regions.forEach((region) => {
      region.updateConfig(this.config);
    });
    this.redraw();
  }

  private pixelsToTime(pixels: number): number {
    return this.waveform.pxToTime(pixels);
  }

  private timeToPixels(time: number): number {
    return this.waveform.timeToPx(time);
  }
}
