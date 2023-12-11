import { default as frames } from './Frames';
import { default as wave } from './Wave';

const Views = {
  frames,
  wave,
};

export type ViewTypes = keyof typeof Views;
export type ViewType<T extends ViewTypes> = (typeof Views)[T];

export default Views;
