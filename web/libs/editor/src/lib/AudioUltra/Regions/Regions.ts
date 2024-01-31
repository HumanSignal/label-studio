import { rgba, RgbaColorArray } from '../Common/Color';
import {
  clamp,
  defaults,
  findLast,
  getCursorPositionX,
  getCursorPositionY,
  isInRange,
  pixelsToTime
} from '../Common/Utils';
import { CursorSymbol } from '../Cursor/Cursor';
import { LayerGroup } from '../Visual/LayerGroup';
import { Visualizer } from '../Visual/Visualizer';
import { Waveform } from '../Waveform';
import { Region, RegionOptions } from './Region';
import { Segment } from './Segment';

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
}

export class Regions {
  private regions: (Region | Segment)[] = [];
  private waveform: Waveform;
  private visualizer: Visualizer;
  private initialRegions: RegionOptions[];
  private locked = false;
  private hoveredRegions = new Set<Region | Segment>();
  private defaultColor = rgba('#787878');
  private drawingColor = rgba('#787878');
  private labels: string[] | undefined;
  private createable = true;
  private updateable = true;
  private deleteable = true;
  private drawableTarget = Segment;
  showLabels = false;
  layerGroup: LayerGroup;

  constructor(options: RegionsOptions, waveform: Waveform, visualizer: Visualizer) {
    this.waveform = waveform;
    this.visualizer = visualizer;
    this.initialRegions = options?.regions ?? [];
    this.defaultColor = options?.defaultColor ? rgba(options.defaultColor) : this.defaultColor;
    this.labels = undefined;
    this.createable = options?.createable ?? this.createable;
    this.updateable = options?.updateable ?? this.updateable;
    this.deleteable = options?.deleteable ?? this.deleteable;
    this.layerGroup = this.visualizer.getLayer('regions') as LayerGroup;
    this.showLabels = this.waveform.params.showLabels ?? false;
    this.init();
  }

  init() {
    // Regions general events
    this.visualizer.on('initialized', this.handleInit);
    this.waveform.on('regionRemoved', this.handleRegionRemoved);
    this.waveform.on('regionUpdated', this.handleRegionUpdated);

    this.visualizer.container.addEventListener('mousedown', this.handleDrawRegion);

    // Regions specific events
    const { container } = this.visualizer;

    container.addEventListener('mousemove', this.handleMouseMove);
    container.addEventListener('mousedown', this.handleMouseDown);
    container.addEventListener('mouseup', this.handleMouseUp);
    container.addEventListener('click', this.handleClick);
  }

  handleDraw = () => {
    if (!this.waveform.loaded) return;
    this.renderAll();
  };

  renderAll() {
    this.layerGroup.clear();
    const currentTime = this.waveform.currentTime;

    this.regions.forEach(region => {
      region.highlighted = (region.start <= currentTime && region.end >= currentTime);
      region.render();
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
    this.regions = this.regions.filter(region => {
      if (!region.isRegion && (!selectedOnly || region.selected) && !region.external) {
        region.destroy();
        return false;
      }
      return true;
    });
  }

  addRegions(regions: RegionOptions[], render = true) {
    regions.forEach(region => this.addRegion(region, false));

    if (render) {
      this.redraw();
    }
  }

  addRegion(options: RegionOptions, render = true) {
    let region: Region | Segment;

    if (options.labels?.length || this.drawableTarget === Region) {
      region = new Region(options, this.waveform, this.visualizer, this);
    } else {
      region = new Segment(options, this.waveform, this.visualizer, this);
    }

    this.regions.push(region);

    if (render) {
      this.redraw();
    }

    return region;
  }

  findRegion(id: string) {
    return this.regions.find(region => region.id === id);
  }

  convertToRegion(id: string, labels: string[], render = true): Region {
    let region = this.findRegion(id) as Region;

    const regionIndex = this.regions.findIndex(region => region.id === id);

    region = new Region({ ...region.options, labels }, this.waveform, this.visualizer, this);

    this.regions[regionIndex] = region;

    if (render) {
      this.redraw();
    }

    return region;
  }

  convertToSegment(id: string, render = true): Segment {
    let segment = this.findRegion(id) as Segment;

    const regionIndex = this.regions.findIndex(region => region.id === id);

    segment = new Segment(segment.options, this.waveform, this.visualizer, this);

    this.regions[regionIndex] = segment;

    if (render) {
      this.redraw();
    }

    return segment;
  }

  updateRegion(options: RegionOptions, render = true) {
    if (!this.updateable || !options.id) return;

    const region = this.findRegion(options.id);

    if (!region) return;

    region.update(options);

    if (render) {
      this.redraw();
    }

    return region;
  }

  redraw() {
    this.visualizer.draw(true);
  }

  removeRegion(regionId: string, render = true) {
    const region = this.findRegion(regionId);

    if (this.deleteable && region?.deleteable) {
      region.destroy(false);
      this.regions = this.regions.filter(r => r !== region);
    }

    if (render) {
      this.redraw();
    }
  }

  bringRegionToFront(regionId: string) {
    const originalIndex = this.regions.findIndex(reg => reg.id === regionId);

    this.regions.push(...this.regions.splice(originalIndex, 1));
  }

  destroy() {
    const { container } = this.visualizer;

    this.visualizer.off('initialized', this.handleInit);
    this.visualizer.off('draw', this.handleDraw);
    this.waveform.off('regionRemoved', this.handleRegionRemoved);
    this.waveform.off('regionUpdated', this.handleRegionUpdated);

    container.removeEventListener('mousemove', this.handleMouseMove);
    container.removeEventListener('mousedown', this.handleMouseDown);
    container.removeEventListener('mouseup', this.handleMouseUp);
    container.removeEventListener('click', this.handleClick);

    this.regions.forEach(region => region.destroy());
    this.regions = [];
  }

  setDrawingColor(color: string | RgbaColorArray) {
    this.drawingColor = rgba(color);
  }

  updateLabelVisibility(visible: boolean) {
    this.showLabels = visible;
    this.redraw();
  }

  setLabels(labels?: string[]) {
    if (labels) this.labels = labels;
  }

  resetDrawingColor() {
    this.drawingColor = this.defaultColor.clone();
  }

  resetLabels() {
    this.labels = undefined;
  }

  get list() {
    return Array.from(this.regions);
  }

  get selected() {
    return this.regions.filter(region => region.selected);
  }

  get timelineRegions() {
    return this.regions.filter(region => region.showInTimeline);
  }

  get visible() {
    return this.regions.filter(region => region.visible);
  }

  isOverrideKeyPressed(e: MouseEvent) {
    return e.shiftKey;
  }

  private handleInit = () => {
    if (this.initialRegions.length) {
      this.regions = this.initialRegions.map(region => {
        return new Region(region, this.waveform, this.visualizer, this);
      });

      this.initialRegions = [];
    }

    // Handle rendering when the visualizer is being drawn
    this.visualizer.on('draw', this.handleDraw);
  };

  private handleRegionUpdated = () => {
    this.visualizer.draw(true);
  };

  private handleRegionRemoved = (reg: Segment) => {
    this.removeRegion(reg.id);
  };

  private handleDrawRegion = (e: MouseEvent) => {
    if (this.locked || !this.createable) return;
    if (this.hoveredRegions.size > 0 && !this.isOverrideKeyPressed(e)) return;
    if (!this.layerGroup.isVisible) return;

    this.lock();

    let region: Region | Segment;
    let startX: number;

    this.waveform.invoke('beforeRegionsDraw', [this]);

    const addRegion = () => {
      const { container, zoomedWidth, fullWidth } = this.visualizer;
      const { autoPlayNewSegments, duration } = this.waveform;
      const scrollLeft = this.visualizer.getScrollLeftPx();

      startX = clamp(getCursorPositionX(e, container) + scrollLeft, 0, fullWidth);
      const start = pixelsToTime(startX, zoomedWidth, duration);
      const end = pixelsToTime(startX, zoomedWidth, duration);

      region = this.addRegion({
        start,
        end,
        color: this.drawingColor.toString(),
        selected: false,
        labels: this.labels,
      });

      if (autoPlayNewSegments && !region.isRegion) {
        this.regions.forEach(r => r.handleSelected(r.id === region.id));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { container, fullWidth } = this.visualizer;
      const scrollLeft = this.visualizer.getScrollLeftPx();
      const currentX = clamp(getCursorPositionX(e, container) + scrollLeft, 0, fullWidth);

      if (!region) {
        addRegion();
      }

      if (Math.abs(currentX - startX) > 5) {
        let currentStart = this.pixelsToTime(startX);
        let currentEnd = this.pixelsToTime(currentX);

        if (currentEnd < currentStart) {
          [currentStart, currentEnd] = [currentEnd, currentStart];
        }

        region.updatePosition(currentStart, currentEnd);
        region.render();
      }
    };

    const handleMouseUp = () => {
      const { player, autoPlayNewSegments } = this.waveform;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (region && region.start === region.end) {
        region.remove();
        this.unlock();
      } else if (region) {
        this.waveform.invoke('regionCreated', [region]);
        if (autoPlayNewSegments && !region.isRegion) {
          if (player.playing) {
            player.pause();
          }
          player.play();
        }
        setTimeout(() => this.unlock(), 0);
      } else {
        this.unlock();
      }

      this.waveform.invoke('afterRegionsDraw', [this]);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  private handleMouseMove = (e: MouseEvent) => {
    const region = this.findRegionUnderCursor(e);

    if (region) {
      region.invoke('mouseOver', [region, e]);

      if (!region.hovered) {
        this.hoveredRegions.clear();
        this.hover(region, e);
      }
    } else if (this.hoveredRegions.size) {
      this.hoveredRegions.forEach(region => {
        region.invoke('mouseLeave', [region, e]);
      });
      this.hoveredRegions.clear();
      if (!this.cursorLockedByPlayhead) {
        this.waveform.cursor.set(CursorSymbol.crosshair);
      }
    }
  };

  private get cursorLockedByPlayhead() {
    return this.waveform.cursor.hasFocus() && this.waveform.cursor.isFocused('playhead');
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.updateable) return;
    const region = this.findRegionUnderCursor(e);

    if (this.layerGroup.isVisible && region?.updateable) {
      e.preventDefault();
      e.stopPropagation();
      region.invoke('mouseDown', [region, e]);
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (!this.updateable) return;
    const region = this.findRegionUnderCursor(e);

    if (this.layerGroup.isVisible && region?.updateable) {
      region.invoke('mouseUp', [region, e]);
    }
  };

  private handleClick = (e: MouseEvent) => {
    const mainLayer = this.visualizer.getLayer('main');

    if (e.target && mainLayer?.canvas?.contains(e.target)) {
      const region = this.findRegionUnderCursor(e);

      if (this.layerGroup.isVisible && region) {
        region.invoke('click', [region, e]);
      }
    }
  };

  private findRegionUnderCursor(e: MouseEvent) {
    const region = findLast(this.visible, region => {
      return this.cursorInRegion(e, region);
    });

    return region;
  }

  /**
   * General check to identify if mouse cursor is within the region bounds
   * @param e Mouse event
   * @param region Regions to compare against
   * @returns True if cursor is within the region bounds
   */
  private cursorInRegion(e: MouseEvent, region: Segment) {
    const { xStart, width } = region;
    const { container, timelinePlacement, timelineHeight = 0, height } = this.visualizer;
    const timelineLayer = this.visualizer.getLayer('timeline');
    const timelineTop = timelinePlacement === defaults.timelinePlacement;
    const yStart = timelineTop && timelineLayer?.isVisible ? timelineHeight : 0;
    const x = getCursorPositionX(e, container);
    const y = getCursorPositionY(e, container);

    const xIsInRange = isInRange(x, xStart, xStart + width);

    if (!xIsInRange) return false;

    const yIsInRange = isInRange(y, yStart, yStart + height - timelineHeight);

    return yIsInRange;
  }

  lock() {
    this.locked = true;
    this.visualizer.lockSeek();
  }

  unlock() {
    this.locked = false;
    this.visualizer.unlockSeek();
  }

  get isLocked() {
    return this.locked;
  }

  hover(region: Region | Segment, e?: MouseEvent) {
    if (e) {
      this.visualizer.lockSeek();
      region.invoke('mouseEnter', [region, e]);
    }

    this.hoveredRegions.add(region);
  }

  unhover(region: Region | Segment, e?: MouseEvent) {
    if (e) {
      this.visualizer.unlockSeek();
      region.invoke('mouseLeave', [region, e]);
    }

    this.hoveredRegions.delete(region);
  }

  pixelsToTime(pixels: number) {
    const { zoomedWidth } = this.visualizer;
    const { duration } = this.waveform;

    return (pixels / zoomedWidth) * duration;
  }

  toJSON() {
    return this.regions.map(region => region.toJSON());
  }

  isHovered(region: Segment) {
    return this.hoveredRegions.has(region);
  }
}
