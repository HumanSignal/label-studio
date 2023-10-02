import { Visualizer } from '../Visual/Visualizer';

export const __DEBUG__ = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
export const OFFSCREEN_CANVAS_SUPPORTED = 'OffscreenCanvas' in globalThis;

const TIME_TOLERANCE = 0.000001;

export enum defaults {
  timelineHeight = 32,
  timelinePlacement = 'top'
}

type LogLevel = 'log' | 'warn' | 'error' | 'info';

export const logger = (level: LogLevel = 'log') => (...args: any[]) => {
  if (__DEBUG__) {
    // eslint-disable-next-line no-console
    console[level](...args);
  }
};

export const log = logger('log');
export const warn = logger('warn');
export const error = logger('error');
export const info = logger('info');

export const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

export const toPrecision = (value: number, precision = 2) => {
  const multiplier = Math.pow(10, precision);

  return Math.round(value * multiplier) / multiplier;
};

export const filterData = (audioBuffer: AudioBuffer | null, channel?: number) => {
  if (!audioBuffer) return new Float32Array(0);

  return audioBuffer.getChannelData(channel ?? 0);
};

export const isInRange = (value: number, min: number , max: number) => {
  return value >= min && value <= max;
};

export const findLast = <T = any>(array: T[], predicate: (item: T) => boolean): T | undefined => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return array[i];
    }
  }
};

export const debounce = (fn: (...args: any[]) => any, timeout: number, { leading = false }: { leading?: boolean } = {}) => {
  let timer: number | undefined;

  return ((...args: any[]) => {
    if (timer) {
      clearTimeout(timer);
    }

    if (leading) {
      fn(...args);
    }

    timer = setTimeout(() => fn(...args), timeout) as any;
  }) as typeof fn;
};

export const repeat = (str: string, times: number) =>
  Array.from({ length: times })
    .map(() => str)
    .join('');


export const roundToStep = (
  value: number,
  step: number,
  roundFunction: 'floor' | 'ceil' | 'round' = 'round',
) => {
  switch(roundFunction) {
    case 'floor': return Math.floor(value / step) * step;
    case 'ceil': return Math.ceil(value / step) * step;
    case 'round': return Math.round(value / step) * step;
  }
};

export const minmax = (array: ArrayLike<number>) => {
  const arraySize = array.length;

  if (arraySize > 0) {
    let max, min;
    let i = 0;

    max = min = array[0];

    while (i < arraySize) {
      const value = array[i];

      if (value > max) max = value;
      else if(value < min) min = value;

      i++;
    }

    return [min,max];
  } else {
    return [Infinity, Infinity];
  }
};

export const averageMinMax = (data: Float32Array) => {
  const [min, max] = minmax(data);

  return [
    clamp(min, -1, 1),
    clamp(max, -1, 1),
  ];
};

export const average = (array: ArrayLike<number>) => {
  const arraySize = array.length;

  if (arraySize > 0) {
    let sum = 0;

    for (let i = 0; i < arraySize; i++) {
      sum += array[i];
    }

    return sum / arraySize;
  } else {
    return 0;
  }
};

export const measure = (message: string, callback: () => void) => {
  let start = 0;

  if (__DEBUG__) {
    start = performance.now();
  }

  callback();

  if (__DEBUG__) {
    info(`[MEASURE]: ${message} took ${performance.now() - start}ms`);
  }
};

export const chunk6 = <T>(array: ArrayLike<T>, size: number) => {
  const chunked_arr = [];

  for (let i = 0; i < array.length; i++) {
    const last = chunked_arr[chunked_arr.length - 1];

    if (!last || last.length === size) {
      chunked_arr.push([array[i]]);
    } else {
      last.push(array[i]);
    }
  }

  return chunked_arr;
};

export const bufferAllocator = () => {
  const buffers = new Map<number, Float32Array>();

  const allocate = (size: number) => {
    if (buffers.has(size)) return buffers.get(size)!;

    const buffer = new Float32Array(size);

    buffers.set(size, buffer);

    return buffer;
  };

  return { allocate };
};

export const getOffsetLeft = (element: HTMLElement) => {
  return element.getBoundingClientRect().left;
};

export const getOffsetTop = (element: HTMLElement) => {
  return element.getBoundingClientRect().top;
};

export const getCursorPositionX = (e: MouseEvent, offsetElement: HTMLElement) => {
  return (e.clientX - getOffsetLeft(offsetElement));
};

export const getCursorPositionY = (e: MouseEvent, offsetElement: HTMLElement) => {
  return (e.clientY - getOffsetTop(offsetElement));
};

export const pixelsToTime = (pixels: number, zoomedWidth: number, duration: number) => {
  return pixels / zoomedWidth * duration;
};

export const getCursorTime = (e: MouseEvent, visualizer: Visualizer, duration: number) => {
  const { zoomedWidth, container } = visualizer;
  const cursorPosition = getCursorPositionX(e, container) + visualizer.getScrollLeftPx();
  const time = pixelsToTime(cursorPosition, zoomedWidth, duration);

  return time;
};

export const isTimeSimilar = (a: number, b: number) => Math.abs(a - b) < TIME_TOLERANCE;
export const isTimeRelativelySimilar = (a: number, b: number, observedDuration: number) =>
  isTimeSimilar(a/observedDuration, b/observedDuration);

