import './core/feature-flags';
import './assets/styles/global.scss';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LabelStudio } from './LabelStudio';

(window as any).LabelStudio = LabelStudio;

export default LabelStudio;

export { LabelStudio };
