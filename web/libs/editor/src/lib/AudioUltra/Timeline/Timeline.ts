import { rgba, RgbaColorArray } from '../Common/Color';
import { Padding } from '../Common/Style';
import { defaults, toPrecision } from '../Common/Utils';
import { Layer } from '../Visual/Layer';
import { Visualizer } from '../Visual/Visualizer';
import { Waveform } from '../Waveform';

type TimelinePlacement = 'top' | 'bottom';
export interface TimelineOptions {
  selectedColor?: RgbaColorArray;
  placement?: TimelinePlacement;
  padding?: Padding;
  height?: number;
  gridWidth?: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  gridColor?: string|RgbaColorArray;
  backgroundColor?: string|RgbaColorArray;
}

type LabelMaxWidth = {
  [includeMs: string]: number, // true | false
}

export type TimelineMark = { x: number, time: number, type: 'mark' | 'label', includeMs: boolean };

export class Timeline {
  private waveform: Waveform;
  private visualizer: Visualizer;
  private layer: Layer;
  private placement: TimelinePlacement;
  private padding: Padding = { left: 0, right: 0, top: 0, bottom: 0 };
  private height = defaults.timelineHeight as number;
  private initHeight = defaults.timelineHeight as number;
  private fontSize = 12;
  private gridWidth = 1;
  private fontFamily = 'Arial';
  private fontColor = rgba('#413C4A');
  private selectionColor = rgba('rgba(65, 60, 74, 0.08)');
  private gridColor = rgba('rgba(137,128,152,0.16)');
  private backgroundColor = rgba('#fff');
  private _labeMaxWidth: LabelMaxWidth = {
    true: 0, // includeMs
    false: 0,
  };

  constructor(options: TimelineOptions, waveform: Waveform, visualizer: Visualizer) {
    this.waveform = waveform;
    this.visualizer = visualizer;
    this.placement = options?.placement || defaults.timelinePlacement;
    this.padding = {  ...this.padding, ...options?.padding };
    this.fontSize = options?.fontSize ?? this.fontSize;
    this.fontFamily = options?.fontFamily ?? this.fontFamily;
    this.height = options?.height ?? defaults.timelinePlacement ? options?.height ?? defaults.timelineHeight : this.height;
    this.initHeight = this.height;
    this.gridWidth = options?.gridWidth ?? this.gridWidth;
    this.fontColor = options?.fontColor ? rgba(options?.fontColor) : this.fontColor;
    this.selectionColor = options?.selectedColor ?? this.selectionColor;
    this.gridColor = options?.gridColor ? rgba(options?.gridColor) : this.gridColor;
    this.backgroundColor = options?.backgroundColor ? rgba(options?.backgroundColor) : this.backgroundColor;

    this.visualizer.reserveSpace({ height: this.height });

    this.layer = this.visualizer.createLayer({ name: 'timeline', offscreen: true, zIndex: 103 });
    this.visualizer.on('initialized', () => {
      this.visualizer.on('draw', () => this.render());
    });
    this.layer.on('layerUpdated', () => {
      this.height = this.layer.isVisible ? this.initHeight : 0;
      this.visualizer.reserveSpace({ height: this.height });
      this.render();
    });
  }

  render() {
    const { width } = this.visualizer;
    const height = this.height;
    const layer = this.layer;
    const offset = this.visualizer.height - height;
    const lineWidth = this.gridWidth;
    const strokeStyle = this.gridColor.toString();
    const fillStyle = this.backgroundColor.toString();
    const placement = this.placement;
    const yOffset = placement === 'top' ? 0 : offset;
    const xOffset = placement === 'top' ? (this.padding?.left || 0) : 0;

    layer.clear();
    if (this.layer.isVisible) {
      layer.lineWidth = lineWidth;
      layer.strokeStyle = strokeStyle;
      layer.fillStyle = fillStyle;
      layer.beginPath();
      layer.fillRect(0, yOffset, width + xOffset, height);
      this.renderTimelineRegions();
      this.renderSelected();
      this.renderIntervals();
      layer.fillStyle = strokeStyle;
      layer.fillRect(0, yOffset + height, width + xOffset, lineWidth);
      layer.stroke();
    }
  }
  
  private renderTimelineRegions() {

    const timelineRegions = this.waveform?.regions.timelineRegions;

    if (timelineRegions.length) {
      const { height } = this;
      const { duration } = this.waveform;
      const { zoomedWidth } = this.visualizer;
      const scrollOffset = this.visualizer.getScrollLeftPx();

      const currentTime = this.waveform.currentTime;

      timelineRegions.sort((a, b) => a.start - b.start).forEach((region) => {
        const { end, start, selected, color } = region;

        const playing = (start <= currentTime && end >= currentTime);
        const xStart = (start * zoomedWidth / duration) - scrollOffset;
        const xEnd = (end - start)  * zoomedWidth / duration;

        const top = 0;
        const layer = this.layer;
        const regionColor = color.clone();

        if (playing) {
          regionColor.darken(selected ? 0.3 : 0.4);
        }

        layer.fillStyle = regionColor.translucent(0.8).toString();
        layer.fillRect(xStart, top, xEnd, height);
      });
    }
  }

  private renderSelected() {

    const selectedRegions = this.waveform?.regions.selected;

    if (selectedRegions.length) {
      const { selectionColor, height } = this;
      const { duration } = this.waveform;
      const { zoomedWidth } = this.visualizer;
      const scrollOffset = this.visualizer.getScrollLeftPx();
      const start = selectedRegions.sort((a, b) => a.start - b.start )[0].start ;
      const end = selectedRegions.sort((a, b) => b.end - a.end )[0].end;
      const xStart = (start * zoomedWidth / duration) - scrollOffset;
      const xEnd = (end - start)  * zoomedWidth / duration;
      const top = 0;
      const layer = this.layer;

      layer.fillStyle = selectionColor.toString();
      layer.fillRect(xStart, top, xEnd, height);
    }
  }

  private renderInterval(mark: TimelineMark) {
    const { pixelRatio, height: containerHeight } = this.visualizer;
    const fontSize = this.fontSize;
    const height = this.height;
    const offset = containerHeight - height;
    const placement = this.placement;
    const layer = this.layer;
    const yOffset = placement === 'top' ? 0 : offset;
    const xOffset = placement === 'top' ? (this.padding?.left || 0) : 0;
    const markYOffset = placement === 'top' ? (mark.type === 'label' ? height * 0.75 : height * 0.875 ) : yOffset;
    const markHeight = placement === 'top' ? 
      (mark.type === 'label'
        ? height * 0.25 : height * 0.125)
      : mark.type === 'label' ? height / 2 : height / 3;

    layer.moveTo(mark.x + xOffset, markYOffset);
    layer.lineTo(mark.x + xOffset, markYOffset + markHeight);

    if (mark.type === 'label') {
      const ts = this.formatTime(mark.time * 1000, mark.includeMs);
      const markXOffset = placement === 'top' ?
        (mark.x - (this.getDownscaledTextWidth(layer, ts) / 2)) :
        (mark.x + (this.padding?.left || 6));

      layer.fillStyle = this.fontColor.toString();
      layer.font = `${fontSize * pixelRatio}px ${this.fontFamily}`;
      layer.fillText(
        ts,
        markXOffset,
        placement === 'top' ? yOffset + ((height * 0.75) / 2) + (fontSize / 2) - this.gridWidth: yOffset + height - 8,
      );
    }
  }

  private getDownscaledTextWidth(layer: Layer, text: string) {
    const { pixelRatio } = this.visualizer;

    return layer.measureText(text).width / pixelRatio;
  }

  private renderIntervals() {
    const { width } = this.visualizer;
    const scrollLeft = this.visualizer.getScrollLeftPx();

    const viewableDuration = this.mapToTime(width);
    const [interval, labelInterval]  = this.getIntervals(viewableDuration);

    const exactStart = this.mapToTime(Math.abs(scrollLeft));
    const segmentStart = Math.floor(exactStart / interval) * interval;
    const segmentEnd = segmentStart + viewableDuration;
    const includeMs = viewableDuration < 60;
    const precision = 10;

    const factor = Math.pow(10, 10);

    for (let i = segmentStart; i < segmentEnd; i += interval) {
      const time = toPrecision(i, precision);

      const isLabelInterval = Math.round(time * factor) % Math.round(labelInterval * factor);

      const intervalType: TimelineMark['type'] = isLabelInterval === 0  ? 'label' : 'mark';

      this.renderInterval({ x: this.mapToPx(i - exactStart), time, type: intervalType, includeMs });
    }
  }

  private getLabelPadding() {
    return this.fontSize;
  }

  private mapToTime(x: number) {
    const { duration } = this.waveform;
    const { fullWidth } = this.visualizer;

    return (x / fullWidth) * duration;
  }

  private mapToPx(time: number) {
    const { duration } = this.waveform;
    const { fullWidth } = this.visualizer;

    return (time / duration) * fullWidth;
  }

  private getLabelMaxWidth(includeMs = false) {
    const key = includeMs.toString() as keyof LabelMaxWidth;

    if (this._labeMaxWidth[key]) {
      return this._labeMaxWidth[key];
    }

    const formatTemplate = `MM:MM:MM:MM${includeMs ? 'M' :''}`;

    const maxWidth = this.layer.measureText(formatTemplate).width;

    (this._labeMaxWidth[key] as any) = maxWidth;

    return maxWidth;
  }

  private getIntervals(viewableDuration: number): [number, number] {
    const lineWidth = this.gridWidth;
    const lineSpace = this.mapToTime(10 + lineWidth); // 1 line + 2 spaces

    const significantDigits = Math.floor(Math.log10(lineSpace));

    const exactInterval = toPrecision(lineSpace, Math.abs(significantDigits));

    const significantDigitValue = Math.ceil(exactInterval/ Math.pow(10, significantDigits));

    let interval = Math.pow(10, significantDigits);

    if (significantDigitValue > 6) {
      interval = Math.pow(10, significantDigits) * 7.5;
    } 
    else if (significantDigitValue > 4) {
      interval = Math.pow(10, significantDigits) * 5;
    }
    else if (significantDigitValue > 2) {
      interval = Math.pow(10, significantDigits) * 2.5;
    }
    else if (significantDigitValue > 1) {
      interval = Math.pow(10, significantDigits) * 1.25;
    }

    const includeMs = viewableDuration < 60;

    const exactLabelInterval = Math.ceil((this.getLabelMaxWidth(includeMs) + this.getLabelPadding() * 2) / this.mapToPx(interval)) * interval;

    const significantLabelDigits = Math.floor(Math.log10(exactLabelInterval));

    const significantLabelDigitValue = Math.ceil(exactLabelInterval/ Math.pow(10, significantLabelDigits));

    let labelInterval = toPrecision(10, significantLabelDigits);

    if (significantLabelDigitValue > 5) {
      labelInterval = Math.pow(10, significantLabelDigits) * 7.5;
    } 
    else if (significantLabelDigitValue > 3) {
      labelInterval = Math.pow(10, significantLabelDigits) * 5;
    }
    else if (significantLabelDigitValue > 2) {
      labelInterval = Math.pow(10, significantLabelDigits) * 2.5;
    }
    else if (significantLabelDigitValue > 1) {
      labelInterval = Math.pow(10, significantLabelDigits) * 1.25;
    }

    return [interval, labelInterval];
  }

  private formatTime(time: number, includeMs = false) {
    const timeDate = new Date(time).toISOString();
    const start = time > 3600 ? 11 : 14;
    const end = includeMs ? 23 : 19;

    return timeDate.substring(start, end);
  }
}
