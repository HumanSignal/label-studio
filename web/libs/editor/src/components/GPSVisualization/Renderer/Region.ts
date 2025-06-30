import type { GPSData } from "../types";
import type { GPSMetricsWaveform } from "../GPSMetricsWaveform";
import { rgbaToString, stringToRgba } from "../Common/Color";
import type { Regions } from "./Regions";
import { Segment, type SegmentGlobalEvents, type SegmentOptions } from "./Segment";
import type { RenderContext } from "./Renderer";

export interface RegionGlobalEvents extends SegmentGlobalEvents {
  regionCreated: (region: Region | Segment) => void;
  regionUpdated: (region: Region | Segment) => void;
  regionSelected: (region: Region | Segment, event: MouseEvent) => void;
  regionUpdatedEnd: (region: Region | Segment) => void;
  regionRemoved: (region: Region | Segment) => void;
}

export interface RegionOptions extends SegmentOptions {
  labels?: string[];
  color?: string;
}

export class Region extends Segment {
  labels: string[] | undefined = undefined;

  constructor(options: RegionOptions, waveform: GPSMetricsWaveform, controller: Regions) {
    super(options, waveform, controller);
    this.labels = options.labels ?? this.labels;
    this.color = options.color ? stringToRgba(options.color) : this.color;
  }

  get isRegion() {
    return true;
  }

  get options() {
    return {
      ...super.options,
      labels: this.labels,
      color: this.color ? rgbaToString(this.color) : undefined,
    };
  }

  renderLabels(): void {
    if (this.labels?.length && this.controller.showLabels && this.visible) {
      const mainLayer = this.controller.waveform.layers.regions;
      if (!mainLayer) return;

      const layer = mainLayer.context;
      const color = this.color;

      const topOffset = 4;

      const labelMeasures = this.labels.map((label) => layer.measureText(label));
      const allVerticalStackedLabelsHeight = labelMeasures.reduce((acc, curr) => {
        return acc + (curr.fontBoundingBoxAscent ?? 10) + (curr.fontBoundingBoxDescent ?? 2) + 2;
      }, 0);

      const start = this.xStart + this.handleWidth + 2;
      const regionCanvasWidth = this.xEnd - this.xStart - this.handleWidth * 2;

      const firstLabelHeight =
        (labelMeasures[0]?.fontBoundingBoxAscent ?? 10) + (labelMeasures[0]?.fontBoundingBoxDescent ?? 2);

      layer.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
      if (this.selected) {
        layer.fillStyle = `rgba(${Math.min(255, color.r + 50)}, ${Math.min(255, color.g + 50)}, ${Math.min(255, color.b + 50)}, 0.9)`;
        layer.fillRect(
          start,
          topOffset,
          regionCanvasWidth > 0 ? regionCanvasWidth : 50,
          allVerticalStackedLabelsHeight + 5,
        );
      }

      layer.fillStyle = this.selected ? "white" : "black";
      layer.font = "12px Arial";

      let currentY = topOffset + firstLabelHeight;

      this.labels.forEach((label, iterator) => {
        if (iterator > 0) {
          currentY +=
            (labelMeasures[iterator - 1]?.fontBoundingBoxAscent ?? 10) +
            (labelMeasures[iterator - 1]?.fontBoundingBoxDescent ?? 2) +
            2;
        }
        layer.fillText(label, start + 6, currentY, regionCanvasWidth - 12 > 0 ? regionCanvasWidth - 12 : 0);
      });
    }
  }

  draw(context: RenderContext, data: GPSData): void {
    super.draw(context, data);
    this.renderLabels();
  }

  update(options: Partial<RegionOptions>): void {
    super.update(options);
    this.labels = options.labels ?? this.labels;
    this.color = options.color ? stringToRgba(options.color) : this.color;
  }

  toJSON() {
    return {
      start: this.start,
      end: this.end,
      color: this.color ? rgbaToString(this.color) : undefined,
      labels: this.labels,
      id: this.id,
      selected: this.selected,
      locked: this.locked,
      updateable: this.updateable,
      deleteable: this.deleteable,
      visible: this.visible,
      external: this.external,
      showInTimeline: this.showInTimeline,
    };
  }
}
