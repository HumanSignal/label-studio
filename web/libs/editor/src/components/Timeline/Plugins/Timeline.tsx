import BaseTimelinePlugin, { TimelinePluginParams as BaseTimelinePluginParams } from 'wavesurfer.js/src/plugin/timeline';

export interface TimelinePluginParams extends BaseTimelinePluginParams {
  labelPlacement?: 'top' | 'right';
  notchHeight?: number;
}

export class TimelinePlugin extends BaseTimelinePlugin {
  positioning: any[] = [];

  static create(params: TimelinePluginParams) {
    return {
      name: 'timeline',
      deferInit: params && params.deferInit ? params.deferInit : false,
      params,
      instance: TimelinePlugin,
    } as any;
  }

  constructor(params: TimelinePluginParams, ws: WaveSurfer) {
    super(params, ws);
    this.initParams(params);
  }

  get wrapperHeight() {
    const { fontSize, height, labelPadding, labelPlacement } = this.params as any;

    if (labelPlacement === 'top') {
      return height;
    }

    return fontSize + height + labelPadding * 2;
  }

  initParams(params: TimelinePluginParams) {
    (this.params as any) = Object.assign(
      this.params,
      {
        height: 8,
        notchHeight: 8,
        fontSize: 12,
        labelPadding: 6,
        labelPlacement: 'top',
      },
      params,
    );
    if (this.params.labelPlacement === 'top') {
      this.params.height = this.params.fontSize! + (this.params.height as number) + this.params.labelPadding! * 2;
    }
  }

  createWrapper() {
    const wsParams = this.wavesurfer.params;

    if (this.container instanceof HTMLElement) {
      this.container.innerHTML = '';

      (this.wrapper as any) = this.container.appendChild(
        document.createElement('timeline'),
      );
    }
    if (this.wrapper) {
      this.util.style(this.wrapper, {
        display: 'block',
        position: 'relative',
        userSelect: 'none',
        webkitUserSelect: 'none',
        height: `${this.wrapperHeight}px`,
      });

      if (wsParams.fillParent || wsParams.scrollParent) {
        this.util.style(this.wrapper, {
          width: '100%',
          overflowX: 'hidden',
          overflowY: 'hidden',
        });
      }

      this.wrapper.addEventListener('click', (this as any)._onWrapperClick);
    }
  }

  get duration() {
    return this.params.duration ||
            this.wavesurfer.backend.getDuration();
  }

  get width() {
    const wsParams = this.wavesurfer.params;

    return wsParams.fillParent && !wsParams.scrollParent
      ? (this as any).drawer.getWidth()
      : (this as any).drawer.wrapper.scrollWidth * wsParams.pixelRatio;
  }

  get fontSize() {
    const wsParams = this.wavesurfer.params;
    const baseFontSize = this.params.fontSize || 12;

    return baseFontSize * wsParams.pixelRatio;
  }


  intervalFnOrVal = (option: any, pixelsPerSecond: number) =>
    typeof option === 'function' ? option(pixelsPerSecond) : option;

  updatePositioning(width: number, duration: number) {
    const baseOffset = (this.params as any).offset;
    const pixelsPerSecond = width / duration;
    const totalSeconds = parseInt(duration as any, 10) + 1;
    const timeInterval = this.intervalFnOrVal(this.params.timeInterval, pixelsPerSecond);

    let curPixel = pixelsPerSecond * (this.params as any).offset;
    let curSeconds = 0;
    let i;

    // build an array of position data with index, second and pixel data,
    // this is then used multiple times below
    this.positioning = [];

    // render until end in case we have a negative offset
    const renderSeconds = (baseOffset < 0)
      ? totalSeconds - baseOffset 
      : totalSeconds;

    for (i = 0; i < renderSeconds / timeInterval; i++) {
      this.positioning.push([i, curSeconds, curPixel]);
      curSeconds += timeInterval;
      curPixel += pixelsPerSecond * timeInterval;
    }

    return pixelsPerSecond;
  }

  renderPositions(cb: (i: number, sec: number, px: number) => void) {
    this.positioning.forEach(pos => {
      cb(pos[0], pos[1], pos[2]);
    });
  }

  /**
     * Fill a given text on the canvases
     *
     * @param {string} text Text to render
     * @param {number} x X-position
     * @param {number} y Y-position
     */
  fillText(text: string, x: number, y: number, align = '') {
    let textWidth: number;
    let xOffset = 0;

    this.canvases.forEach(canvas => {
      const context = canvas.getContext('2d');

      if (context) {
        const canvasWidth = context.canvas.width;

        if (xOffset > x + textWidth) {
          return;
        }

        if (xOffset + canvasWidth > x && context) {
          textWidth = context.measureText(text).width;

          if (align === 'center') {
            x = x - textWidth / 2;
          }
          context.fillText(text, x - xOffset, y);
        }

        xOffset += canvasWidth;
      }
    });
  }

  renderPrimaryLabels(pixelsPerSecond: number) {

    const { height: baseHeight, notchHeight, formatTimeCallback: formatTime, primaryColor, primaryFontColor, labelPadding, labelPlacement }  = this.params;

    const primaryLabelInterval = this.intervalFnOrVal(
      this.params.primaryLabelInterval,
      pixelsPerSecond,
    );
    const pxRatio = (this as any).pixelRatio;
    const height = (labelPlacement === 'top' ? (notchHeight as number) : (baseHeight as number)) * pxRatio;

    this.setFonts(`${this.fontSize}px ${this.params.fontFamily}`);

    this.renderPositions((i, curSeconds, curPixel) => {
      if (i % primaryLabelInterval === 0) {

        switch (labelPlacement) {
          case 'top':
            this.setFillStyles(primaryColor!);
            this.fillRect(curPixel, this.wrapperHeight - height + 1, 1, height);

            this.setFillStyles(primaryFontColor!);
            this.fillText(
              (formatTime as any)(curSeconds, pixelsPerSecond),
              curPixel * pxRatio,
              height + Math.ceil(labelPadding! * 1.5),
              'center',
            );
            break;
          case 'right':
          default:
            this.setFillStyles(primaryColor!);
            this.fillRect(curPixel, 0, 1, height);
            this.setFillStyles(primaryFontColor!);
            this.fillText(
              (formatTime as any)(curSeconds, pixelsPerSecond),
              curPixel + labelPadding! * pxRatio,
              height,
            );
            break;
        }
      }
    });

    return primaryLabelInterval;
  }

  renderSecondaryLabels(pixelsPerSecond: number, primaryLabelInterval: number) {

    const { height: baseHeight, notchHeight, formatTimeCallback: formatTime, secondaryColor, secondaryFontColor, labelPadding, labelPlacement }  = this.params;

    const secondaryLabelInterval = this.intervalFnOrVal(
      this.params.secondaryLabelInterval,
      pixelsPerSecond,
    );
    const pxRatio = (this as any).pixelRatio;
    const height = (labelPlacement === 'top' ? (notchHeight as number) : (baseHeight as number)) * pxRatio;

    this.setFonts(`${this.fontSize}px ${this.params.fontFamily}`);

    this.renderPositions((i, curSeconds, curPixel) => {
      if (i % secondaryLabelInterval === 0 && i % primaryLabelInterval !== 0) {
        switch (labelPlacement) {
          case 'top':
            this.setFillStyles(secondaryColor!);
            this.fillRect(curPixel, this.wrapperHeight - height + 1, 1, height);

            this.setFillStyles(secondaryFontColor!);
            this.fillText(
              (formatTime as any)(curSeconds, pixelsPerSecond),
              curPixel  * pxRatio,
              height + Math.ceil(labelPadding! * 1.5),
              'center',
            );
            break;
          case 'right':
          default:
            this.setFillStyles(secondaryColor!);
            this.fillRect(curPixel, 0, 1, height);
            this.setFillStyles(secondaryFontColor!);
            this.fillText(
              (formatTime as any)(curSeconds, pixelsPerSecond),
              curPixel + labelPadding! * pxRatio,
              height,
            );
            break;
        }
      }
    });

    return secondaryLabelInterval;
  }

  renderTertiaryNotches(primaryLabelInterval: number, secondaryLabelInterval: number) {
    const { height: _baseHeight, notchHeight, unlabeledNotchColor, notchPercentHeight, labelPlacement }  = this.params;

    const pxRatio = (this as any).pixelRatio;

    const baseHeight = (labelPlacement === 'top' ? (notchHeight as number) : (_baseHeight as number));
    const height =
            (baseHeight as number) *
            (notchPercentHeight! / 100) *
            pxRatio;

    this.setFillStyles(unlabeledNotchColor!);

    this.renderPositions((i, _, curPixel) => {
      if (
        i % secondaryLabelInterval !== 0 &&
                i % primaryLabelInterval !== 0
      ) {
        switch (labelPlacement) {
          case 'top':
            this.fillRect(curPixel, this.wrapperHeight - height + 1, 1, height);
            break;
          case 'right':
          default:
            this.fillRect(curPixel, 0, 1, height);
            break;
        }
      }
    });
  }

  /**
   * Render the timeline labels and notches
   */
  renderCanvases() {

    const duration = this.duration;

    if (duration <= 0) {
      return;
    }

    const width = this.width;
    const pixelsPerSecond = this.updatePositioning(width, duration);

    const primaryLabelInterval = this.renderPrimaryLabels(pixelsPerSecond);
    const secondaryLabelInterval = this.renderSecondaryLabels(pixelsPerSecond, primaryLabelInterval);

    this.renderTertiaryNotches(primaryLabelInterval, secondaryLabelInterval);
  }
}

