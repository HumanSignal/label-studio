import { Waveform } from '..';
import { rgba } from '../Common/Color';
import { Visualizer } from '../Visual/Visualizer';
import { Regions } from './Regions';
import { Segment, SegmentGlobalEvents, SegmentOptions } from './Segment';

export interface RegionGlobalEvents extends SegmentGlobalEvents {
  regionCreated: (region: Region|Segment) => void;
  regionUpdated: (region: Region|Segment) => void;
  regionSelected: (region: Region|Segment, event: MouseEvent) => void;
  regionUpdatedEnd: (region: Region|Segment) => void;
  regionRemoved: (region: Region|Segment) => void;
}

export interface RegionOptions extends SegmentOptions {
  labels?: string[]; 
  color?: string;
}

export class Region extends Segment {

  labels: string[] | undefined = undefined;

  constructor(options: RegionOptions, waveform: Waveform, visualizer: Visualizer, controller: Regions) {
    super(options, waveform, visualizer, controller);
    this.labels = options.labels ?? this.labels;
    this.color = options.color ? rgba(options.color) : this.color;
  }

  get isRegion() {
    return true;
  }

  get options() {
    return {
      ...super.options,
      labels: this.labels,
      color: this.color.toString(),
    };
  }

  renderLabels(): void {
    if (this.labels?.length && this.controller.showLabels && this.visible) {
      const layer = this.controller.layerGroup;
      const color = this.color;
      const timelineTop = this.timelinePlacement;
      const timelineLayer = this.visualizer.getLayer('timeline');
      const timelineHeight = this.timelineHeight;
      const top = (timelineLayer?.isVisible && timelineTop ? timelineHeight : 0) + 4;
      const labelMeasures = this.labels.map((label) => layer.context.measureText(label));

      const allVerticalStackedLabelsHeight = labelMeasures.reduce((accumulator, currentValue) => {
        return accumulator + currentValue.fontBoundingBoxAscent + currentValue.fontBoundingBoxDescent + 2;
      }, 0);
      const start = this.xStart + this.handleWidth + 2;
      const width = labelMeasures[0].width + 10;
      const rangeWidth = this.xEnd - this.xStart - (this.handleWidth * 2);
      const adjustedWidth = rangeWidth < width ? rangeWidth : width;
      const selectedAdjustmentWidth = this.selected ? width : adjustedWidth;

      layer.fillStyle = `rgba(${color.r + color.r}, ${color.g + color.g}, ${color.b + color.b})`;
      this.selected && layer.roundRect(start, top, selectedAdjustmentWidth, allVerticalStackedLabelsHeight + 5, 4);
      layer.fillStyle = this.selected ? 'white' : 'black';
      layer.font = '12px Arial';
      this.labels.forEach((label, iterator) => {
        const stackedLabelHeight = (allVerticalStackedLabelsHeight / labelMeasures.length) * (iterator + 1) - 1;

        layer.fitText(label, start + 6, top + stackedLabelHeight, selectedAdjustmentWidth - this.handleWidth - 6);
      });
    }
  }

  render(): void {
    super.render();
    this.renderLabels();
  }

  update(options: Partial<RegionOptions>): void {
    super.update(options);
    this.labels = options.labels ?? this.labels;
    this.color = options.color ? rgba(options.color) : this.color;
  }
  
  toJSON() {
    return {
      start: this.start,
      end: this.end,
      color: this.color.toString(),
      labels: this.labels,
      layerName: this.layerName,
      id: this.id,
    };
  }
}
