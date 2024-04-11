import './core/feature-flags';
import './assets/styles/global.scss';
import { LabelStudio } from './LabelStudio';

window.LabelStudio = LabelStudio;

export default LabelStudio;

console.log('just to create the PR');

export { LabelStudio };
